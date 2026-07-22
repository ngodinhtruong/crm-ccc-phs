
from django.core.management.base import BaseCommand

from apps.external_errors.models import ExternalErrorRecord
from apps.external_errors.services.bedrock_cause_classifier import (
    classify_queryset_causes,
)


class Command(BaseCommand):
    help = "Phân loại nguyên nhân cho dữ liệu lỗi hiện có."

    def add_arguments(self, parser):
        parser.add_argument("--batch-id", type=int, default=None)
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        queryset = (
            ExternalErrorRecord.objects
            .select_related(
                "error_code",
                "error_code__group",
                "cause_group",
            )
            .order_by("id")
        )

        if options["batch_id"]:
            queryset = queryset.filter(batch_id=options["batch_id"])

        if not options["force"]:
            queryset = queryset.exclude(
                cause_classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )

        stats = classify_queryset_causes(
            queryset,
            force=options["force"],
            limit=options["limit"],
        )
        self.stdout.write(self.style.SUCCESS(str(stats)))
