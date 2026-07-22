import json
import os
import re
import time
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.db.models import QuerySet
from django.utils import timezone

from apps.external_errors.models import (
    ExternalErrorCauseGroup,
    ExternalErrorClassificationLog,
    ExternalErrorRecord,
)
from apps.external_errors.services.cleaning import (
    build_rule_based_clean_fields,
)
from apps.external_errors.services.dashboard_cache import (
    invalidate_external_error_dashboard_cache,
)


PROMPT_VERSION = "cause-v1-dynamic-catalog"
CONFIDENCE_REVIEW_THRESHOLD = Decimal("80.00")

CAUSE_STATUS_UNCLASSIFIED = "UNCLASSIFIED"
CAUSE_STATUS_CLASSIFIED = "CLASSIFIED"
CAUSE_STATUS_NEED_REVIEW = "NEED_REVIEW"
CAUSE_STATUS_CONFIRMED = "CONFIRMED"
CAUSE_STATUS_FAILED = "FAILED"

REQUIRED_RECORD_FIELDS = {
    "cause_group",
    "normalized_cause",
    "cause_classification_confidence",
    "cause_need_review",
    "cause_classification_status",
    "cause_classification_error",
    "cause_llm_model_id",
    "cause_classified_at",
}


def get_cause_group_model():
    return ExternalErrorCauseGroup


def validate_record_model_contract():
    existing_fields = {
        field.name
        for field in ExternalErrorRecord._meta.get_fields()
    }
    missing_fields = sorted(
        REQUIRED_RECORD_FIELDS - existing_fields
    )

    if missing_fields:
        raise RuntimeError(
            "ExternalErrorRecord thiếu các field phục vụ "
            "phân loại nguyên nhân: "
            + ", ".join(missing_fields)
        )


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


def load_active_cause_catalog():
    """
    Đọc toàn bộ nhóm nguyên nhân Active hiện tại từ DB.

    Không có nhóm nguyên nhân nào bị fix trong source code.
    Khi thêm, sửa, bật hoặc tắt nhóm nguyên nhân trong DB,
    lần phân loại tiếp theo sẽ tự động dùng danh mục mới.
    """
    CauseGroup = get_cause_group_model()

    cause_groups = list(
        CauseGroup.objects
        .filter(is_active=True)
        .order_by("sort_order", "id")
    )

    prompt_catalog = []
    cause_lookup = {}

    for cause_group in cause_groups:
        normalized_code = str(
            cause_group.cause_code
        ).strip().upper()

        if not normalized_code:
            continue

        if normalized_code in cause_lookup:
            raise RuntimeError(
                "Danh mục nguyên nhân bị trùng mã Active: "
                f"{cause_group.cause_code}"
            )

        cause_lookup[normalized_code] = cause_group

        prompt_catalog.append(
            {
                "cause_code": cause_group.cause_code,
                "cause_name": cause_group.cause_name,
                "description": (
                    cause_group.description or ""
                ),
                "keywords": (
                    cause_group.keywords or []
                ),
                "examples": (
                    cause_group.examples or []
                ),
            }
        )

    if not prompt_catalog:
        raise RuntimeError(
            "Chưa có nhóm nguyên nhân Active để phân loại. "
            "Hãy thêm hoặc kích hoạt danh mục nguyên nhân trước."
        )

    return {
        "prompt_catalog": prompt_catalog,
        "cause_lookup": cause_lookup,
    }


def build_system_prompt(catalog_context):
    catalog_json = json.dumps(
        catalog_context["prompt_catalog"],
        ensure_ascii=False,
        indent=2,
    )

    return f"""
Bạn là bộ phân loại NGUYÊN NHÂN của sự cố cho hệ thống CRM chứng khoán.

Nhiệm vụ:
1. Đọc nội dung lỗi, thiết bị, nguồn, kết quả xử lý và phân loại lỗi hiện có.
2. Xác định nguyên nhân có bằng chứng phù hợp nhất.
3. Chọn đúng một cause_code Active trong danh mục.
4. Tạo normalized_cause ngắn gọn để gom các case cùng nguyên nhân.
5. Không được tự tạo nhóm nguyên nhân mới.

DANH MỤC NGUYÊN NHÂN ACTIVE HIỆN TẠI:
{catalog_json}

QUY TẮC BẮT BUỘC:
- Chỉ được chọn cause_code xuất hiện trong danh mục trên.
- Không dùng cause_code đã Inactive.
- Không suy diễn nguyên nhân chỉ dựa vào tên loại lỗi.
- Phải ưu tiên bằng chứng trong nội dung, nguyên nhân gốc,
  giải pháp, thiết bị và kết quả xử lý.
- Nếu chỉ thấy triệu chứng mà chưa đủ bằng chứng nguyên nhân,
  vẫn chọn nhóm phù hợp nhất nhưng need_review=true.
- Nếu nhiều nhóm nguyên nhân đều có khả năng tương đương,
  need_review=true.
- confidence dùng thang điểm từ 0 đến 100.
- need_review=true khi confidence nhỏ hơn 80.
- normalized_cause phải mô tả nguyên nhân, không chỉ lặp lại triệu chứng.
- Chỉ trả JSON thuần, không markdown và không giải thích ngoài JSON.

SCHEMA:
{{
  "cause_code": "string",
  "normalized_cause": "string",
  "confidence": 0,
  "need_review": false,
  "reason": "string"
}}
""".strip()


def build_user_prompt(record):
    payload = {
        "source": (
            record.clean_source
            or record.raw_source
            or ""
        ),
        "device": (
            record.clean_device
            or record.raw_device
            or ""
        ),
        "result": (
            record.clean_result
            or record.raw_result
            or ""
        ),
        "content": (
            record.clean_content
            or record.raw_content
            or ""
        ),
        "existing_cause": (
            record.clean_cause
            or record.raw_cause
            or ""
        ),
        "solution": (
            record.clean_solution
            or record.raw_solution
            or ""
        ),
        "error_group_code": getattr(
            record,
            "error_group_code",
            None,
        ),
        "error_group_name": getattr(
            record,
            "error_group_name",
            None,
        ),
        "error_code": getattr(
            record,
            "error_code_value",
            None,
        ),
        "error_name": getattr(
            record,
            "error_code_name",
            None,
        ),
        "normalized_issue": (
            record.normalized_issue or ""
        ),
    }

    return (
        "Dữ liệu cần phân loại nguyên nhân:\n"
        + json.dumps(
            payload,
            ensure_ascii=False,
        )
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
        raise ValueError(
            "Không tìm thấy JSON trong phản hồi LLM."
        )

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
    - 0.95 -> 95.00
    - 95   -> 95.00
    """
    try:
        confidence = Decimal(str(value))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        return Decimal("0.00")

    if (
        Decimal("0")
        <= confidence
        <= Decimal("1")
    ):
        confidence *= Decimal("100")

    confidence = max(
        Decimal("0"),
        min(confidence, Decimal("100")),
    )

    return confidence.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def resolve_catalog_cause_group(
    data,
    catalog_context,
):
    llm_cause_code = str(
        data.get("cause_code") or ""
    ).strip().upper()

    if not llm_cause_code:
        raise ValueError(
            "LLM không trả về cause_code."
        )

    cause_group = catalog_context[
        "cause_lookup"
    ].get(llm_cause_code)

    if cause_group is None:
        raise ValueError(
            "LLM trả về cause_code không tồn tại "
            "hoặc không Active: "
            f"{llm_cause_code}"
        )

    return cause_group


def normalize_llm_output(
    data,
    rule_clean_fields,
    catalog_context,
):
    cause_group = resolve_catalog_cause_group(
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

    clean_cause = str(
        rule_clean_fields.get("clean_cause")
        or ""
    ).strip()

    normalized_cause = str(
        data.get("normalized_cause")
        or clean_cause
        or cause_group.cause_name
        or "Không xác định"
    ).strip()[:255]

    return {
        "cause_group": cause_group,
        "clean_cause": clean_cause,
        "normalized_cause": normalized_cause,
        "cause_classification_confidence": (
            confidence
        ),
        "cause_need_review": need_review,
        "cause_classification_status": (
            CAUSE_STATUS_NEED_REVIEW
            if need_review
            else CAUSE_STATUS_CLASSIFIED
        ),
        "cause_classification_error": "",
    }


def call_bedrock_cause_classifier(
    record,
    catalog_context,
):
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError(
            "Chưa cài boto3/botocore. "
            "Chạy: pip install boto3"
        ) from exc

    region, model_id = get_bedrock_settings()

    if not model_id:
        raise RuntimeError(
            "Thiếu BEDROCK_MODEL_ID trong .env/settings."
        )

    client = boto3.client(
        "bedrock-runtime",
        region_name=region,
        config=Config(
            connect_timeout=10,
            read_timeout=120,
            retries={
                "max_attempts": 2,
                "mode": "standard",
            },
        ),
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
                        "text": build_user_prompt(
                            record
                        )
                    }
                ],
            }
        ],
        inferenceConfig={
            "temperature": 0.0,
            "maxTokens": 800,
        },
    )

    blocks = (
        response
        .get("output", {})
        .get("message", {})
        .get("content", [])
    )

    response_text = "".join(
        block.get("text", "")
        for block in blocks
    )

    return (
        extract_json_object(response_text),
        model_id,
    )


def classify_record_cause(
    record,
    *,
    save=True,
    force=False,
    catalog_context=None,
):
    """
    Phân loại nguyên nhân cho một ExternalErrorRecord.

    Khi gọi riêng lẻ, danh mục nguyên nhân được đọc mới từ DB.
    """
    validate_record_model_contract()

    current_status = getattr(
        record,
        "cause_classification_status",
        CAUSE_STATUS_UNCLASSIFIED,
    )

    if (
        current_status
        in {
            CAUSE_STATUS_CLASSIFIED,
            CAUSE_STATUS_CONFIRMED,
        }
        and not force
    ):
        return record

    if catalog_context is None:
        catalog_context = (
            load_active_cause_catalog()
        )

    started = time.perf_counter()

    rule_clean_fields = (
        build_rule_based_clean_fields(
            {
                "raw_source": record.raw_source,
                "raw_device": record.raw_device,
                "raw_result": record.raw_result,
                "raw_content": record.raw_content,
                "raw_cause": record.raw_cause,
                "raw_solution": record.raw_solution,
            }
        )
    )

    # Nguyên nhân sạch do rule-based cleaning quyết định.
    record.clean_cause = (
        rule_clean_fields.get("clean_cause")
        or ""
    )

    input_payload = {
        "record_id": record.id,
        "cause_catalog": (
            catalog_context["prompt_catalog"]
        ),
        "rule_clean_fields": (
            rule_clean_fields
        ),
        "prompt": build_user_prompt(record),
    }

    try:
        llm_output, model_id = (
            call_bedrock_cause_classifier(
                record,
                catalog_context,
            )
        )

        normalized = normalize_llm_output(
            llm_output,
            rule_clean_fields,
            catalog_context,
        )

        for field, value in normalized.items():
            setattr(record, field, value)

        record.cause_llm_model_id = model_id
        record.cause_classified_at = (
            timezone.now()
        )

        if save:
            record.save(
                update_fields=[
                    "clean_cause",
                    "cause_group",
                    "normalized_cause",
                    "cause_classification_confidence",
                    "cause_need_review",
                    "cause_classification_status",
                    "cause_classification_error",
                    "cause_llm_model_id",
                    "cause_classified_at",
                    "updated_at",
                ]
            )

        latency_ms = int(
            (
                time.perf_counter()
                - started
            )
            * 1000
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
        record.cause_classification_status = (
            CAUSE_STATUS_FAILED
        )
        record.cause_classification_error = str(exc)
        record.cause_need_review = True
        record.cause_classified_at = (
            timezone.now()
        )

        if save:
            record.save(
                update_fields=[
                    "clean_cause",
                    "cause_classification_status",
                    "cause_classification_error",
                    "cause_need_review",
                    "cause_classified_at",
                    "updated_at",
                ]
            )

        latency_ms = int(
            (
                time.perf_counter()
                - started
            )
            * 1000
        )

        ExternalErrorClassificationLog.objects.create(
            record=record,
            model_id=(
                get_bedrock_settings()[1]
                or ""
            ),
            prompt_version=PROMPT_VERSION,
            input_payload=input_payload,
            output_payload={},
            error_message=str(exc),
            latency_ms=latency_ms,
        )

        raise


def classify_queryset_causes(
    queryset: QuerySet,
    *,
    force=False,
    limit=None,
):
    """
    Phân loại nguyên nhân theo batch.

    Snapshot danh mục nguyên nhân chỉ được tải một lần ở đầu batch.
    Lần chạy tiếp theo sẽ đọc lại danh mục Active mới nhất từ DB.
    """
    stats = {
        "total": 0,
        "classified": 0,
        "need_review": 0,
        "failed": 0,
        "errors": [],
    }

    if limit:
        queryset = queryset[: int(limit)]

    catalog_context = load_active_cause_catalog()

    for record in queryset.iterator(
        chunk_size=100
    ):
        stats["total"] += 1

        try:
            classify_record_cause(
                record,
                force=force,
                catalog_context=catalog_context,
            )

            if record.cause_need_review:
                stats["need_review"] += 1
            else:
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
