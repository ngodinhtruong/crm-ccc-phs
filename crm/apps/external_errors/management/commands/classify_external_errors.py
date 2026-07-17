from django.core.management.base import BaseCommand

from apps.external_errors.models import ExternalErrorRecord
from apps.external_errors.services.bedrock_classifier import classify_queryset


class Command(BaseCommand):
    help = "Phân loại dữ liệu lỗi bên ngoài bằng AWS Bedrock LLM."

    def add_arguments(self, parser):
        parser.add_argument("--batch-id", type=int, default=None)
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        queryset = ExternalErrorRecord.objects.all().order_by("id")

        if options["batch_id"]:
            queryset = queryset.filter(batch_id=options["batch_id"])

        if not options["force"]:
            queryset = queryset.exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )

        stats = classify_queryset(
            queryset,
            force=options["force"],
            limit=options["limit"],
        )

        self.stdout.write(self.style.SUCCESS(f"Done: {stats}"))
