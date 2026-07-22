import json
import os
import re
import time
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.db.models import Prefetch
from django.utils import timezone

from apps.external_errors.models import (
    ExternalErrorClassificationLog,
    ExternalErrorCode,
    ExternalErrorGroup,
    ExternalErrorRecord,
)
from apps.external_errors.services.cleaning import build_rule_based_clean_fields
from apps.external_errors.services.dashboard_cache import (
    invalidate_external_error_dashboard_cache,
)


PROMPT_VERSION = "v3-dynamic-catalog"
CONFIDENCE_REVIEW_THRESHOLD = Decimal("80.00")


def get_bedrock_settings():
    region = (
        getattr(settings, "AWS_DEFAULT_REGION", None)
        or os.getenv("AWS_DEFAULT_REGION")
        or "ap-northeast-1"
    )
    model_id = (
        getattr(settings, "BEDROCK_MODEL_ID", None)
        or os.getenv("BEDROCK_MODEL_ID")
    )
    return region, model_id


def load_active_error_catalog():
    """
    Đọc danh mục nhóm lỗi và mã lỗi hiện tại từ DB.

    Không có nhóm hoặc mã lỗi nào bị fix cứng trong source code.
    Mọi thay đổi Active/Inactive, thêm mới hoặc chỉnh sửa danh mục sẽ được
    áp dụng ở lần phân loại tiếp theo.
    """
    groups = list(
        ExternalErrorGroup.objects
        .filter(is_active=True)
        .prefetch_related(
            Prefetch(
                "error_codes",
                queryset=(
                    ExternalErrorCode.objects
                    .filter(is_active=True)
                    .select_related("group")
                    .order_by("sort_order", "id")
                ),
            )
        )
        .order_by("sort_order", "id")
    )

    prompt_catalog = []
    code_lookup = {}

    for group in groups:
        active_codes = list(group.error_codes.all())
        if not active_codes:
            continue

        prompt_codes = []

        for error_code in active_codes:
            normalized_code = str(error_code.error_code).strip().upper()

            if normalized_code in code_lookup:
                raise RuntimeError(
                    "Danh mục mã lỗi bị trùng mã đang Active: "
                    f"{error_code.error_code}"
                )

            code_lookup[normalized_code] = error_code

            prompt_codes.append(
                {
                    "error_code": error_code.error_code,
                    "error_name": error_code.error_name,
                    "description": error_code.description or "",
                    "keywords": error_code.keywords or [],
                    "examples": error_code.examples or [],
                }
            )

        prompt_catalog.append(
            {
                "group_code": group.group_code,
                "group_name": group.group_name,
                "description": group.description or "",
                "error_codes": prompt_codes,
            }
        )

    if not prompt_catalog:
        raise RuntimeError(
            "Chưa có nhóm lỗi và mã lỗi Active để phân loại. "
            "Hãy thêm hoặc kích hoạt danh mục trước khi chạy LLM."
        )

    return {
        "prompt_catalog": prompt_catalog,
        "code_lookup": code_lookup,
    }


def build_system_prompt(catalog_context):
    catalog_json = json.dumps(
        catalog_context["prompt_catalog"],
        ensure_ascii=False,
        indent=2,
    )

    return f"""
Bạn là bộ phân loại lỗi cho hệ thống CRM chứng khoán.

Nhiệm vụ:
1. Chuẩn hóa dữ liệu lỗi tiếng Việt.
2. Chọn đúng một nhóm lỗi đang có trong danh mục.
3. Chọn đúng một mã lỗi Active thuộc nhóm lỗi đó.
4. Tạo normalized_issue ngắn gọn để gom các lỗi tương tự.

DANH MỤC NHÓM LỖI VÀ MÃ LỖI ACTIVE HIỆN TẠI:
{catalog_json}

QUY TẮC BẮT BUỘC:
- Chỉ được chọn group_code và error_code xuất hiện trong danh mục trên.
- error_code bắt buộc phải thuộc group_code đã chọn.
- Không tự tạo nhóm lỗi hoặc mã lỗi mới.
- Không dùng mã lỗi đã Inactive.
- confidence dùng thang điểm từ 0 đến 100.
- need_review=true nếu dữ liệu thiếu, mơ hồ, có nhiều mã phù hợp,
  hoặc confidence nhỏ hơn 80.
- Chỉ trả về JSON thuần, không markdown và không giải thích bên ngoài JSON.

SCHEMA:
{{
  "clean_source": "string",
  "clean_device": "string",
  "clean_result": "string",
  "clean_content": "string",
  "group_code": "string",
  "error_code": "string",
  "normalized_issue": "string",
  "confidence": 0,
  "need_review": false,
  "reason": "string"
}}
""".strip()


def build_user_prompt(record):
    payload = {
        "source": record.clean_source or record.raw_source or "",
        "device": record.clean_device or record.raw_device or "",
        "result": record.clean_result or record.raw_result or "",
        "content": record.clean_content or record.raw_content or "",
        "cause": record.clean_cause or record.raw_cause or "",
        "solution": record.clean_solution or record.raw_solution or "",
    }

    return (
        "Dữ liệu lỗi cần chuẩn hóa và phân loại:\n"
        + json.dumps(payload, ensure_ascii=False)
    )


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


def parse_boolean(value):
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {
            "true",
            "1",
            "yes",
            "y",
            "có",
            "co",
        }

    return bool(value)


def normalize_confidence(value):
    """
    Hỗ trợ cả:
    - 0.95  -> 95.00
    - 95    -> 95.00
    """
    try:
        confidence = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0.00")

    if Decimal("0") <= confidence <= Decimal("1"):
        confidence *= Decimal("100")

    confidence = max(
        Decimal("0"),
        min(confidence, Decimal("100")),
    )

    return confidence.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def resolve_catalog_error_code(data, catalog_context):
    """
    Kiểm tra output LLM bằng danh mục vừa đọc từ DB.

    DB chỉ lưu FK error_code. Nhóm lỗi được suy ra bằng error_code.group,
    nên không thể xảy ra trường hợp record lưu mã lỗi thuộc sai nhóm.
    """
    llm_group_code = str(
        data.get("group_code") or ""
    ).strip().upper()

    llm_error_code = str(
        data.get("error_code") or ""
    ).strip().upper()

    if not llm_group_code:
        raise ValueError("LLM không trả về group_code.")

    if not llm_error_code:
        raise ValueError("LLM không trả về error_code.")

    error_code = catalog_context["code_lookup"].get(llm_error_code)

    if error_code is None:
        raise ValueError(
            "LLM trả về mã lỗi không tồn tại hoặc không Active: "
            f"{llm_error_code}"
        )

    actual_group_code = str(
        error_code.group.group_code
    ).strip().upper()

    if actual_group_code != llm_group_code:
        raise ValueError(
            "Nhóm lỗi và mã lỗi LLM trả về không khớp: "
            f"group_code={llm_group_code}, "
            f"error_code={llm_error_code}, "
            f"nhóm đúng={error_code.group.group_code}"
        )

    return error_code


def normalize_llm_output(data, rule_clean_fields, catalog_context):
    error_code = resolve_catalog_error_code(
        data,
        catalog_context,
    )

    confidence = normalize_confidence(
        data.get("confidence", 0)
    )

    need_review = parse_boolean(
        data.get("need_review", False)
    )

    if confidence < CONFIDENCE_REVIEW_THRESHOLD:
        need_review = True

    clean_content = str(
        data.get("clean_content")
        or rule_clean_fields.get("clean_content")
        or ""
    ).strip()

    normalized_issue = str(
        data.get("normalized_issue")
        or clean_content
        or "Không xác định"
    ).strip()[:255]

    return {
        "clean_source": str(
            data.get("clean_source")
            or rule_clean_fields.get("clean_source")
            or "Không xác định"
        ).strip(),
        "clean_device": str(
            data.get("clean_device")
            or rule_clean_fields.get("clean_device")
            or "Không xác định"
        ).strip(),
        "clean_result": str(
            data.get("clean_result")
            or rule_clean_fields.get("clean_result")
            or "Không xác định"
        ).strip(),
        "clean_content": clean_content,
        "clean_cause": str(
            rule_clean_fields.get("clean_cause")
            or ""
        ).strip(),
        "clean_solution": str(
            rule_clean_fields.get("clean_solution")
            or ""
        ).strip(),

        # Chỉ lưu mã lỗi FK. Nhóm lỗi lấy qua record.error_code.group.
        "error_code": error_code,

        "normalized_issue": normalized_issue,
        "classification_confidence": confidence,
        "need_review": need_review,
        "classification_status": (
            ExternalErrorRecord.STATUS_NEED_REVIEW
            if need_review
            else ExternalErrorRecord.STATUS_CLASSIFIED
        ),
        "classification_error": "",
    }


def call_bedrock_classifier(record, catalog_context):
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError(
            "Chưa cài boto3. Chạy: pip install boto3"
        ) from exc

    region, model_id = get_bedrock_settings()

    if not model_id:
        raise RuntimeError(
            "Thiếu BEDROCK_MODEL_ID trong .env/settings."
        )

    client = boto3.client(
        "bedrock-runtime",
        region_name=region,
    )

    response = client.converse(
        modelId=model_id,
        system=[
            {
                "text": build_system_prompt(
                    catalog_context
                )
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "text": build_user_prompt(record)
                    }
                ],
            }
        ],
        inferenceConfig={
            "temperature": 0.0,
            "maxTokens": 1200,
        },
    )

    blocks = (
        response
        .get("output", {})
        .get("message", {})
        .get("content", [])
    )

    text = "".join(
        block.get("text", "")
        for block in blocks
    )

    return extract_json_object(text), model_id


def classify_record(
    record,
    *,
    save=True,
    force=False,
    catalog_context=None,
):
    if (
        record.classification_status
        in {
            ExternalErrorRecord.STATUS_CLASSIFIED,
            ExternalErrorRecord.STATUS_CONFIRMED,
        }
        and not force
    ):
        return record

    # Khi gọi classify_record riêng lẻ qua API, luôn lấy danh mục mới nhất.
    if catalog_context is None:
        catalog_context = load_active_error_catalog()

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

    # clean_* do rule-based cleaning quyết định.
    # LLM phân loại lỗi không được ghi đè clean_cause.
    for field, value in rule_clean_fields.items():
        setattr(record, field, value)

    input_payload = {
        "record_id": record.id,
        "catalog": catalog_context["prompt_catalog"],
        "rule_clean_fields": rule_clean_fields,
        "prompt": build_user_prompt(record),
    }

    try:
        llm_output, model_id = call_bedrock_classifier(
            record,
            catalog_context,
        )

        normalized = normalize_llm_output(
            llm_output,
            rule_clean_fields,
            catalog_context,
        )

        for field, value in normalized.items():
            setattr(record, field, value)

        record.llm_model_id = model_id
        record.classified_at = timezone.now()

        if save:
            record.save(
                update_fields=[
                    "clean_source",
                    "clean_device",
                    "clean_result",
                    "clean_content",
                    "clean_cause",
                    "clean_solution",
                    "error_code",
                    "normalized_issue",
                    "classification_confidence",
                    "need_review",
                    "classification_status",
                    "classification_error",
                    "llm_model_id",
                    "classified_at",
                    "updated_at",
                ]
            )

        latency_ms = int(
            (time.perf_counter() - started) * 1000
        )

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
        record.classification_status = (
            ExternalErrorRecord.STATUS_FAILED
        )
        record.classification_error = str(exc)
        record.need_review = True
        record.classified_at = timezone.now()

        if save:
            record.save(
                update_fields=[
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
                ]
            )

        latency_ms = int(
            (time.perf_counter() - started) * 1000
        )

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
    stats = {
        "total": 0,
        "classified": 0,
        "failed": 0,
        "errors": [],
    }

    if limit:
        queryset = queryset[: int(limit)]

    # Một lần chạy batch dùng snapshot danh mục Active tại thời điểm bắt đầu.
    # Lần chạy/import tiếp theo sẽ lấy lại danh mục mới nhất từ DB.
    catalog_context = load_active_error_catalog()

    for record in queryset:
        stats["total"] += 1

        try:
            classify_record(
                record,
                force=force,
                catalog_context=catalog_context,
            )
            stats["classified"] += 1
        except Exception as exc:
            stats["failed"] += 1
            stats["errors"].append(
                {
                    "id": record.id,
                    "error": str(exc),
                }
            )

    if stats["total"] > 0:
        invalidate_external_error_dashboard_cache()

    return stats
