from celery import shared_task
from django.db import close_old_connections
from django.db.models import Count, Q

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
from apps.external_errors.services.dashboard_cache import (
    invalidate_external_error_dashboard_cache,
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

        previous_failed_records = batch.records.filter(
            Q(
                classification_status=(
                    ExternalErrorRecord.STATUS_FAILED
                )
            )
            | Q(
                cause_classification_status=(
                    ExternalErrorRecord.STATUS_FAILED
                )
            )
        ).count()
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

        # Một aggregate thay cho hai COUNT riêng sau khi phân loại.
        processing_counts = batch.records.aggregate(
            fully_processed=Count(
                "id",
                filter=Q(
                    classification_status__in=SUCCESS_STATUSES,
                    cause_classification_status__in=SUCCESS_STATUSES,
                ),
            ),
            failed_records=Count(
                "id",
                filter=(
                    Q(
                        classification_status=(
                            ExternalErrorRecord.STATUS_FAILED
                        )
                    )
                    | Q(
                        cause_classification_status=(
                            ExternalErrorRecord.STATUS_FAILED
                        )
                    )
                ),
            ),
        )

        fully_processed = processing_counts["fully_processed"] or 0
        failed_records = processing_counts["failed_records"] or 0

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

        invalidate_external_error_dashboard_cache()

        return {
            "batch_id": batch.id,
            "error_classification": error_stats,
            "cause_classification": cause_stats,
        }

    except ExternalErrorImportBatch.DoesNotExist:
        return {
            "batch_id": batch_id,
            "error": "Batch không tồn tại.",
        }
    finally:
        close_old_connections()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def classify_external_error_records_task(
    self,
    record_ids: list[int] = None,
    all_matching: bool = False,
    force: bool = False,
):
    close_old_connections()
    try:
        if all_matching or not record_ids:
            queryset = ExternalErrorRecord.objects.all()
        else:
            queryset = ExternalErrorRecord.objects.filter(id__in=record_ids)

        if not force:
            error_qs = queryset.exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            ).order_by("id")
            cause_qs = queryset.exclude(
                cause_classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            ).order_by("id")
        else:
            error_qs = queryset.order_by("id")
            cause_qs = queryset.order_by("id")

        error_stats = classify_queryset(error_qs, force=force)
        cause_stats = classify_queryset_causes(cause_qs, force=force)
        invalidate_external_error_dashboard_cache()

        return {
            "error_classification": error_stats,
            "cause_classification": cause_stats,
        }
    finally:
        close_old_connections()
