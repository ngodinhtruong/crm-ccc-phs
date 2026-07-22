
from celery import shared_task
from django.db import close_old_connections
from django.db.models import Q

from apps.external_errors.models import (
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.services.bedrock_cause_classifier import (
    classify_queryset_causes,
)
from apps.external_errors.services.bedrock_classifier import (
    classify_queryset,
)


SUCCESS_STATUSES = [
    ExternalErrorRecord.STATUS_CLASSIFIED,
    ExternalErrorRecord.STATUS_NEED_REVIEW,
    ExternalErrorRecord.STATUS_CONFIRMED,
]


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

        previous_failed_records = (
            batch.records.filter(
                Q(
                    classification_status=ExternalErrorRecord.STATUS_FAILED
                )
                | Q(
                    cause_classification_status=(
                        ExternalErrorRecord.STATUS_FAILED
                    )
                )
            )
            .distinct()
            .count()
        )
        import_skipped_rows = max(
            batch.failed_rows - previous_failed_records,
            0,
        )

        batch.status = ExternalErrorImportBatch.STATUS_CLASSIFYING
        batch.save(update_fields=["status", "updated_at"])

        error_stats = classify_queryset(
            batch.records.exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            ).order_by("id"),
            force=False,
        )

        cause_stats = classify_queryset_causes(
            batch.records.exclude(
                cause_classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            ).order_by("id"),
            force=False,
        )

        fully_processed = batch.records.filter(
            classification_status__in=SUCCESS_STATUSES,
            cause_classification_status__in=SUCCESS_STATUSES,
        ).count()

        failed_records = (
            batch.records.filter(
                Q(
                    classification_status=ExternalErrorRecord.STATUS_FAILED
                )
                | Q(
                    cause_classification_status=(
                        ExternalErrorRecord.STATUS_FAILED
                    )
                )
            )
            .distinct()
            .count()
        )

        batch.classified_rows = fully_processed
        batch.failed_rows = import_skipped_rows + failed_records
        batch.status = (
            ExternalErrorImportBatch.STATUS_FAILED
            if fully_processed == 0 and failed_records > 0
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

        return {
            "batch_id": batch.id,
            "error_classification": error_stats,
            "cause_classification": cause_stats,
        }

    except ExternalErrorImportBatch.DoesNotExist:
        return {"batch_id": batch_id, "error": "Batch không tồn tại."}
    finally:
        close_old_connections()
