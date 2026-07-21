from celery import shared_task
from django.db import close_old_connections

from apps.external_errors.models import (
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.services.bedrock_classifier import (
    classify_queryset,
)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def classify_external_error_batch(self, batch_id: int):
    close_old_connections()

    try:
        batch = ExternalErrorImportBatch.objects.get(pk=batch_id)

        # Tách số dòng lỗi khi import Excel khỏi số record LLM thất bại.
        previous_failed_records = batch.records.filter(
            classification_status=ExternalErrorRecord.STATUS_FAILED
        ).count()

        import_skipped_rows = max(
            batch.failed_rows - previous_failed_records,
            0,
        )

        batch.status = ExternalErrorImportBatch.STATUS_CLASSIFYING
        batch.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        queryset = (
            batch.records
            .exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )
            .order_by("id")
        )

        stats = classify_queryset(
            queryset,
            force=False,
        )

        classified_rows = batch.records.filter(
            classification_status__in=[
                ExternalErrorRecord.STATUS_CLASSIFIED,
                ExternalErrorRecord.STATUS_NEED_REVIEW,
                ExternalErrorRecord.STATUS_CONFIRMED,
            ]
        ).count()

        failed_records = batch.records.filter(
            classification_status=ExternalErrorRecord.STATUS_FAILED
        ).count()

        batch.classified_rows = classified_rows
        batch.failed_rows = import_skipped_rows + failed_records

        if classified_rows == 0 and failed_records > 0:
            batch.status = ExternalErrorImportBatch.STATUS_FAILED
        else:
            batch.status = ExternalErrorImportBatch.STATUS_CLASSIFIED

        batch.save(
            update_fields=[
                "classified_rows",
                "failed_rows",
                "status",
                "updated_at",
            ]
        )

        return {
            "batch_id": batch.id,
            **stats,
        }

    except ExternalErrorImportBatch.DoesNotExist:
        return {
            "batch_id": batch_id,
            "error": "Batch không tồn tại.",
        }

    finally:
        close_old_connections()