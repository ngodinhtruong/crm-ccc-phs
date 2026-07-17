import json
import os
import re
import time
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.external_errors.models import ExternalErrorClassificationLog, ExternalErrorRecord
from apps.external_errors.services.cleaning import build_rule_based_clean_fields

PROMPT_VERSION = "v1"

ERROR_TYPE_LABELS = {
    ExternalErrorRecord.ERROR_ORDER: "Lệnh Đặt",
    ExternalErrorRecord.ERROR_LOGIN: "Đăng Nhập",
    ExternalErrorRecord.ERROR_DISPLAY: "Hiển Thị",
    ExternalErrorRecord.ERROR_EKYC_ACCOUNT: "eKYC / Tài Khoản",
    ExternalErrorRecord.ERROR_PORTAL_SYSTEM: "Portal / Hệ Thống",
    ExternalErrorRecord.ERROR_TRANSFER_PAYMENT: "Chuyển Khoản / Thanh Toán",
    ExternalErrorRecord.ERROR_COMPLAINT: "Khiếu Nại",
    ExternalErrorRecord.ERROR_SPECIAL: "Đặc Biệt",
}

ALLOWED_ERROR_TYPE_CODES = set(ERROR_TYPE_LABELS.keys())

SYSTEM_PROMPT = """
Bạn là bộ phân loại lỗi cho hệ thống CRM chứng khoán.
Nhiệm vụ:
1. Clean dữ liệu lỗi tiếng Việt.
2. Phân loại lỗi vào đúng 1 trong 8 mã cho phép.
3. Tạo normalized_issue ngắn gọn để gom lỗi lặp lại.

Chỉ được chọn một trong các error_type_code sau:
- ORDER: Lệnh Đặt, đặt/sửa/hủy lệnh, trạng thái lệnh, khớp lệnh.
- LOGIN: Đăng Nhập, mật khẩu, timeout phiên, xác thực đăng nhập.
- DISPLAY: Hiển Thị, sai/thiếu dữ liệu trên giao diện, cache hiển thị, layout.
- EKYC_ACCOUNT: eKYC / Tài Khoản, mở tài khoản, OTP, xác thực CCCD, định danh.
- PORTAL_SYSTEM: Portal / Hệ Thống, hệ thống, server, portal, broker portal, core, hạ tầng, đồng bộ dữ liệu.
- TRANSFER_PAYMENT: Chuyển Khoản / Thanh Toán, nộp/rút/chuyển tiền, thanh toán, ngân hàng.
- COMPLAINT: Khiếu Nại, phản ánh, phàn nàn, yêu cầu giải thích/chất lượng dịch vụ.
- SPECIAL: Đặc Biệt, không thuộc nhóm trên hoặc không đủ thông tin.

Bắt buộc trả JSON thuần, không markdown, không giải thích ngoài JSON.
Schema:
{
  "clean_source": string,
  "clean_device": string,
  "clean_result": string,
  "clean_content": string,
  "clean_cause": string,
  "clean_solution": string,
  "error_type_code": string,
  "error_type_name": string,
  "normalized_issue": string,
  "confidence": number,
  "need_review": boolean,
  "reason": string
}
""".strip()


def get_bedrock_settings():
    region = getattr(settings, "AWS_DEFAULT_REGION", None) or os.getenv("AWS_DEFAULT_REGION") or "ap-northeast-1"
    model_id = getattr(settings, "BEDROCK_MODEL_ID", None) or os.getenv("BEDROCK_MODEL_ID")
    return region, model_id


def build_user_prompt(record):
    payload = {
        "source": record.clean_source or record.raw_source or "",
        "device": record.clean_device or record.raw_device or "",
        "result": record.clean_result or record.raw_result or "",
        "content": record.clean_content or record.raw_content or "",
        "cause": record.clean_cause or record.raw_cause or "",
        "solution": record.clean_solution or record.raw_solution or "",
    }
    return "Dữ liệu lỗi cần clean và phân loại:\n" + json.dumps(payload, ensure_ascii=False)


def extract_json_object(text):
    if isinstance(text, dict):
        return text

    text = str(text or "").strip()
    if not text:
        raise ValueError("LLM không trả nội dung.")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("Không tìm thấy JSON trong phản hồi LLM.")

    return json.loads(match.group(0))


def normalize_llm_output(data, rule_clean_fields):
    error_type_code = str(data.get("error_type_code") or "").strip().upper()

    if error_type_code not in ALLOWED_ERROR_TYPE_CODES:
        error_type_code = ExternalErrorRecord.ERROR_SPECIAL
        need_review = True
    else:
        need_review = bool(data.get("need_review", False))

    confidence_raw = data.get("confidence", 0)
    try:
        confidence = Decimal(str(confidence_raw)).quantize(Decimal("0.01"))
    except Exception:
        confidence = Decimal("0.00")
        need_review = True

    if confidence < Decimal("0.70"):
        need_review = True

    error_type_name = ERROR_TYPE_LABELS[error_type_code]

    return {
        "clean_source": str(data.get("clean_source") or rule_clean_fields.get("clean_source") or "Không xác định").strip(),
        "clean_device": str(data.get("clean_device") or rule_clean_fields.get("clean_device") or "Không xác định").strip(),
        "clean_result": str(data.get("clean_result") or rule_clean_fields.get("clean_result") or "Đã xử lý").strip(),
        "clean_content": str(data.get("clean_content") or rule_clean_fields.get("clean_content") or "").strip(),
        "clean_cause": str(data.get("clean_cause") or rule_clean_fields.get("clean_cause") or "").strip(),
        "clean_solution": str(data.get("clean_solution") or rule_clean_fields.get("clean_solution") or "").strip(),
        "error_type_code": error_type_code,
        "error_type_name": error_type_name,
        "normalized_issue": str(data.get("normalized_issue") or data.get("clean_content") or rule_clean_fields.get("clean_content") or "Không xác định").strip()[:255],
        "classification_confidence": confidence,
        "need_review": need_review,
        "classification_status": ExternalErrorRecord.STATUS_NEED_REVIEW if need_review else ExternalErrorRecord.STATUS_CLASSIFIED,
        "classification_error": "",
    }


def call_bedrock_classifier(record):
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError("Chưa cài boto3. Chạy: pip install boto3") from exc

    region, model_id = get_bedrock_settings()
    if not model_id:
        raise RuntimeError("Thiếu BEDROCK_MODEL_ID trong .env/settings.")

    client = boto3.client("bedrock-runtime", region_name=region)
    prompt = build_user_prompt(record)

    response = client.converse(
        modelId=model_id,
        system=[{"text": SYSTEM_PROMPT}],
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ],
        inferenceConfig={"temperature": 0.0, "maxTokens": 1200},
    )

    blocks = response.get("output", {}).get("message", {}).get("content", [])
    text = "".join(block.get("text", "") for block in blocks)
    return extract_json_object(text), model_id


def classify_record(record, *, save=True, force=False):
    if record.classification_status in [ExternalErrorRecord.STATUS_CLASSIFIED, ExternalErrorRecord.STATUS_CONFIRMED] and not force:
        return record

    started = time.perf_counter()
    rule_clean_fields = build_rule_based_clean_fields(
        {
            "raw_source": record.raw_source,
            "raw_device": record.raw_device,
            "raw_result": record.raw_result,
            "raw_content": record.raw_content,
            "raw_cause": record.raw_cause,
            "raw_solution": record.raw_solution,
        }
    )

    for field, value in rule_clean_fields.items():
        if not getattr(record, field):
            setattr(record, field, value)

    input_payload = {
        "record_id": record.id,
        "rule_clean_fields": rule_clean_fields,
        "prompt": build_user_prompt(record),
    }

    try:
        llm_output, model_id = call_bedrock_classifier(record)
        normalized = normalize_llm_output(llm_output, rule_clean_fields)
        for field, value in normalized.items():
            setattr(record, field, value)
        record.llm_model_id = model_id
        record.classified_at = timezone.now()

        if save:
            record.save(update_fields=[
                "clean_source",
                "clean_device",
                "clean_result",
                "clean_content",
                "clean_cause",
                "clean_solution",
                "error_type_code",
                "error_type_name",
                "normalized_issue",
                "classification_confidence",
                "need_review",
                "classification_status",
                "classification_error",
                "llm_model_id",
                "classified_at",
                "updated_at",
            ])

        latency_ms = int((time.perf_counter() - started) * 1000)
        ExternalErrorClassificationLog.objects.create(
            record=record,
            model_id=model_id,
            prompt_version=PROMPT_VERSION,
            input_payload=input_payload,
            output_payload=llm_output,
            latency_ms=latency_ms,
        )
        return record

    except Exception as exc:
        record.classification_status = ExternalErrorRecord.STATUS_FAILED
        record.classification_error = str(exc)
        record.need_review = True
        record.classified_at = timezone.now()
        if save:
            record.save(update_fields=[
                "clean_source",
                "clean_device",
                "clean_result",
                "clean_content",
                "clean_cause",
                "clean_solution",
                "classification_status",
                "classification_error",
                "need_review",
                "classified_at",
                "updated_at",
            ])

        latency_ms = int((time.perf_counter() - started) * 1000)
        ExternalErrorClassificationLog.objects.create(
            record=record,
            model_id=get_bedrock_settings()[1] or "",
            prompt_version=PROMPT_VERSION,
            input_payload=input_payload,
            output_payload={},
            error_message=str(exc),
            latency_ms=latency_ms,
        )
        raise


def classify_queryset(queryset, *, force=False, limit=None):
    stats = {"total": 0, "classified": 0, "failed": 0, "errors": []}

    if limit:
        queryset = queryset[: int(limit)]

    for record in queryset:
        stats["total"] += 1
        try:
            classify_record(record, force=force)
            stats["classified"] += 1
        except Exception as exc:
            stats["failed"] += 1
            stats["errors"].append({"id": record.id, "error": str(exc)})

    return stats
