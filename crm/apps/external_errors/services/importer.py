import re
import unicodedata
import uuid
from datetime import date, datetime, time
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.external_errors.models import (
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.services.cleaning import (
    build_rule_based_clean_fields,
    clean_text,
)


EXCEL_COLUMNS = {
    "received_date": "Ngày nhận",
    "completed_date": "Ngày hoàn thành",
    "source": "Nguồn",
    "device": "Thiết bị",
    "result": "Kết quả xử lý",
    "content": "Nội dung",
}


def normalize_header(value: Any) -> str:
    text = clean_text(value).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )
    return re.sub(r"\s+", " ", text).strip()


def ensure_aware(value: datetime) -> datetime:
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value, timezone.get_current_timezone())


def parse_received_datetime(value: Any) -> datetime | None:
    """
    Ngày nhận ưu tiên định dạng ngày/tháng/năm và giữ nguyên giờ.

    Ví dụ: 05/01/2026 09:47.
    """
    if value is None:
        return None

    if isinstance(value, datetime):
        return ensure_aware(value)

    if isinstance(value, date):
        return ensure_aware(datetime.combine(value, time.min))

    text = clean_text(value)
    if not text:
        return None

    formats = (
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    )

    for date_format in formats:
        try:
            parsed = datetime.strptime(text, date_format)
            return ensure_aware(parsed)
        except ValueError:
            continue

    return None


def parse_completed_datetime(value: Any) -> datetime | None:
    """
    Ngày hoàn thành trong Excel ưu tiên tháng/ngày/năm.

    Nếu chỉ có ngày, thời gian được đặt thành 23:59:00 để có thể thống kê.
    Nếu có giờ, giữ nguyên giờ được cung cấp.
    """
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.time() == time.min:
            value = datetime.combine(value.date(), time(23, 59))
        return ensure_aware(value)

    if isinstance(value, date):
        return ensure_aware(datetime.combine(value, time(23, 59)))

    text_value = clean_text(value)
    if not text_value:
        return None

    has_time = bool(re.search(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", text_value))

    formats = (
        # Dữ liệu thực tế của cột Ngày hoàn thành: month/day/year.
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%m-%d-%Y %H:%M:%S",
        "%m-%d-%Y %H:%M",
        "%m-%d-%Y",
        # ISO.
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        # Fallback day/month/year.
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y",
    )

    for date_format in formats:
        try:
            parsed = datetime.strptime(text_value, date_format)
            if not has_time:
                parsed = datetime.combine(parsed.date(), time(23, 59))
            return ensure_aware(parsed)
        except ValueError:
            continue

    return None


def is_resolved_result(value: Any) -> bool:
    text = clean_text(value)
    if not text:
        return False

    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return bool(re.search(r"\bda(?: duoc)? khac phuc\b", text))


def build_batch_code(prefix: str = "EXTERR") -> str:
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{timestamp}-{uuid.uuid4().hex[:6].upper()}"


def build_record(
    *,
    received_date: datetime,
    completed_date: datetime,
    source: Any,
    device: Any,
    result: Any,
    content: Any,
    batch=None,
    created_by=None,
) -> ExternalErrorRecord:
    raw_data = {
        "raw_source": clean_text(source) or None,
        "raw_device": clean_text(device) or None,
        "raw_result": clean_text(result) or None,
        "raw_content": clean_text(content) or None,
        "raw_cause": None,
        "raw_solution": None,
    }
    clean_fields = build_rule_based_clean_fields(raw_data)

    return ExternalErrorRecord(
        batch=batch,
        received_date=received_date,
        completed_date=completed_date,
        **raw_data,
        **clean_fields,
        error_code=None,
        normalized_issue=None,
        classification_confidence=None,
        need_review=False,
        classification_status=ExternalErrorRecord.STATUS_UNCLASSIFIED,
        classification_error=None,
        llm_model_id=None,
        classified_at=None,
        created_by=created_by,
        updated_by=created_by,
    )


def validate_record_values(
    *,
    received_date: Any,
    completed_date: Any,
    result: Any,
    content: Any,
    import_time: datetime | None = None,
) -> tuple[datetime, datetime]:
    received_at = parse_received_datetime(received_date)
    if received_at is None:
        raise ValueError("Ngày nhận bị thiếu hoặc không đúng định dạng.")

    if not clean_text(content):
        raise ValueError("Nội dung không được để trống.")

    completed_at = parse_completed_datetime(completed_date)
    if completed_at is None:
        if is_resolved_result(result):
            completed_at = import_time or timezone.now()
        else:
            raise ValueError(
                "Thiếu Ngày hoàn thành và Kết quả xử lý không có 'Đã khắc phục'."
            )

    if completed_at < received_at:
        raise ValueError("Ngày hoàn thành không được trước Ngày nhận.")

    return received_at, completed_at


def create_manual_record(
    *,
    data: dict,
    created_by,
) -> ExternalErrorRecord:
    now = timezone.now()
    received_at, completed_at = validate_record_values(
        received_date=data.get("received_date"),
        completed_date=data.get("completed_date"),
        result=data.get("result"),
        content=data.get("content"),
        import_time=now,
    )

    record = build_record(
        received_date=received_at,
        completed_date=completed_at,
        source=data.get("source"),
        device=data.get("device"),
        result=data.get("result"),
        content=data.get("content"),
        created_by=created_by,
    )
    record.save()
    return record


def find_excel_columns(headers: tuple[Any, ...]) -> dict[str, int]:
    normalized_headers = {
        normalize_header(header): index
        for index, header in enumerate(headers)
        if clean_text(header)
    }

    result = {}
    missing = []

    for field_name, column_name in EXCEL_COLUMNS.items():
        column_index = normalized_headers.get(normalize_header(column_name))
        if column_index is None:
            missing.append(column_name)
        else:
            result[field_name] = column_index

    if missing:
        raise ValueError(
            "File Excel thiếu các cột bắt buộc: " + ", ".join(missing)
        )

    return result


def read_excel_rows(uploaded_file, sheet_name: str | None = None):
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError(
            "Thiếu openpyxl. Chạy: pip install openpyxl"
        ) from exc

    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    workbook = load_workbook(
        filename=uploaded_file,
        read_only=True,
        data_only=True,
    )

    if sheet_name:
        if sheet_name not in workbook.sheetnames:
            raise ValueError(
                f"Không tìm thấy sheet '{sheet_name}'. "
                f"Các sheet hiện có: {', '.join(workbook.sheetnames)}"
            )
        worksheet = workbook[sheet_name]
    else:
        worksheet = workbook[workbook.sheetnames[0]]

    row_iterator = worksheet.iter_rows(values_only=True)

    try:
        headers = next(row_iterator)
    except StopIteration as exc:
        raise ValueError("Sheet Excel không có dữ liệu.") from exc

    column_map = find_excel_columns(headers)
    return worksheet.title, column_map, row_iterator


def classify_batch_records(batch, records):
    from apps.external_errors.services.bedrock_classifier import classify_queryset

    batch.status = ExternalErrorImportBatch.STATUS_CLASSIFYING
    batch.save(update_fields=["status", "updated_at"])

    stats = classify_queryset(
        batch.records.all().order_by("id"),
        force=False,
    )

    batch.classified_rows = stats["classified"]
    batch.failed_rows += stats["failed"]
    batch.status = (
        ExternalErrorImportBatch.STATUS_FAILED
        if stats["classified"] == 0 and stats["failed"] > 0
        else ExternalErrorImportBatch.STATUS_CLASSIFIED
    )
    batch.save(
        update_fields=[
            "classified_rows",
            "failed_rows",
            "status",
            "updated_at",
        ]
    )
    return stats


def import_excel_file(
    *,
    uploaded_file,
    sheet_name: str | None,
    auto_classify: bool,
    created_by,
):
    import_time = timezone.now()
    file_name = getattr(uploaded_file, "name", "") or "external-errors.xlsx"
    sheet, column_map, rows = read_excel_rows(uploaded_file, sheet_name)

    batch = ExternalErrorImportBatch.objects.create(
        batch_code=build_batch_code(),
        file_name=file_name,
        source_type=ExternalErrorImportBatch.SOURCE_EXCEL,
        status=ExternalErrorImportBatch.STATUS_IMPORTED,
        created_by=created_by,
    )

    records = []
    skipped = []
    source_rows = 0

    for row_number, row in enumerate(rows, start=2):
        values = {
            field_name: (
                row[column_index]
                if column_index < len(row)
                else None
            )
            for field_name, column_index in column_map.items()
        }

        if not any(clean_text(value) for value in values.values()):
            continue

        source_rows += 1

        try:
            received_at, completed_at = validate_record_values(
                received_date=values["received_date"],
                completed_date=values["completed_date"],
                result=values["result"],
                content=values["content"],
                import_time=import_time,
            )
        except ValueError as exc:
            skipped.append(
                {
                    "row": row_number,
                    "reason": str(exc),
                }
            )
            continue

        records.append(
            build_record(
                batch=batch,
                received_date=received_at,
                completed_date=completed_at,
                source=values["source"],
                device=values["device"],
                result=values["result"],
                content=values["content"],
                created_by=created_by,
            )
        )

    with transaction.atomic():
        ExternalErrorRecord.objects.bulk_create(records, batch_size=500)
        batch.total_rows = len(records)
        batch.failed_rows = len(skipped)
        batch.save(
            update_fields=[
                "total_rows",
                "failed_rows",
                "updated_at",
            ]
        )

    classification_stats = {
        "total": 0,
        "classified": 0,
        "failed": 0,
        "errors": [],
    }

    if auto_classify and records:
        classification_stats = classify_batch_records(batch, records)

    return batch, {
        "sheet_name": sheet,
        "source_rows": source_rows,
        "imported_rows": len(records),
        "skipped_rows": len(skipped),
        "skipped_details": skipped,
        "auto_classify": auto_classify,
        "classification": classification_stats,
    }


def import_and_optionally_classify(
    *,
    rows,
    file_name="",
    source_type=ExternalErrorImportBatch.SOURCE_API,
    classify_now=True,
    created_by=None,
):
    """
    Giữ endpoint JSON cũ để tương thích, nhưng mặc định tự phân loại.
    """
    import_time = timezone.now()
    batch = ExternalErrorImportBatch.objects.create(
        batch_code=build_batch_code("EXTERR-API"),
        file_name=file_name,
        source_type=source_type,
        status=ExternalErrorImportBatch.STATUS_IMPORTED,
        created_by=created_by,
    )

    records = []
    skipped = []

    for index, row in enumerate(rows, start=1):
        try:
            received_at, completed_at = validate_record_values(
                received_date=row.get("received_date"),
                completed_date=row.get("completed_date"),
                result=row.get("result"),
                content=row.get("content"),
                import_time=import_time,
            )
        except ValueError as exc:
            skipped.append({"row": index, "reason": str(exc)})
            continue

        records.append(
            build_record(
                batch=batch,
                received_date=received_at,
                completed_date=completed_at,
                source=row.get("source"),
                device=row.get("device"),
                result=row.get("result"),
                content=row.get("content"),
                created_by=created_by,
            )
        )

    ExternalErrorRecord.objects.bulk_create(records, batch_size=500)
    batch.total_rows = len(records)
    batch.failed_rows = len(skipped)
    batch.save(
        update_fields=["total_rows", "failed_rows", "updated_at"]
    )

    if classify_now and records:
        classify_batch_records(batch, records)

    return batch
