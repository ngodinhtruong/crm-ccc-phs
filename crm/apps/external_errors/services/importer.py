from django.db import transaction
from django.utils import timezone

from apps.external_errors.models import ExternalErrorImportBatch, ExternalErrorRecord
from apps.external_errors.services.bedrock_classifier import classify_queryset
from apps.external_errors.services.cleaning import build_rule_based_clean_fields, clean_error_payload


def build_batch_code():
    timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"EXTERR-{timestamp}"


@transaction.atomic
def import_raw_rows(*, rows, file_name="", source_type=ExternalErrorImportBatch.SOURCE_API, created_by=None):
    batch = ExternalErrorImportBatch.objects.create(
        batch_code=build_batch_code(),
        file_name=file_name or "",
        source_type=source_type,
        total_rows=len(rows),
        created_by=created_by,
    )

    records = []
    for row in rows:
        raw_payload = clean_error_payload(row)
        clean_fields = build_rule_based_clean_fields(raw_payload)
        records.append(
            ExternalErrorRecord(
                batch=batch,
                created_by=created_by,
                **raw_payload,
                **clean_fields,
            )
        )

    ExternalErrorRecord.objects.bulk_create(records, batch_size=500)
    return batch


def import_and_optionally_classify(*, rows, file_name="", source_type=ExternalErrorImportBatch.SOURCE_API, created_by=None, classify_now=False):
    batch = import_raw_rows(rows=rows, file_name=file_name, source_type=source_type, created_by=created_by)

    if classify_now:
        batch.status = ExternalErrorImportBatch.STATUS_CLASSIFYING
        batch.save(update_fields=["status", "updated_at"])

        stats = classify_queryset(batch.records.all().order_by("id"), force=True)
        batch.classified_rows = stats["classified"]
        batch.failed_rows = stats["failed"]
        batch.status = (
            ExternalErrorImportBatch.STATUS_FAILED
            if stats["failed"] and not stats["classified"]
            else ExternalErrorImportBatch.STATUS_CLASSIFIED
        )
        batch.save(update_fields=["classified_rows", "failed_rows", "status", "updated_at"])

    return batch
