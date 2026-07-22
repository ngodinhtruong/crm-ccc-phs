from django.core.management.base import BaseCommand
from django.db import transaction

from apps.external_errors.models import ExternalErrorRecord
from apps.external_errors.services.cleaning import (
    build_rule_based_clean_fields,
)


CLEAN_FIELDS = [
    "clean_source",
    "clean_device",
    "clean_result",
    "clean_content",
    "clean_cause",
    "clean_solution",
]


class Command(BaseCommand):
    help = (
        "Chuẩn hóa lại toàn bộ clean_* từ raw_* "
        "cho dữ liệu lỗi bên ngoài hiện có."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Số record cập nhật mỗi lần. Mặc định: 500.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ tính thử, không ghi dữ liệu.",
        )

    def handle(self, *args, **options):
        batch_size = max(options["batch_size"], 1)
        dry_run = options["dry_run"]

        queryset = ExternalErrorRecord.objects.order_by("id")
        total = queryset.count()

        if total == 0:
            self.stdout.write(
                self.style.WARNING(
                    "Không có ExternalErrorRecord để chuẩn hóa."
                )
            )
            return

        processed = 0
        changed = 0
        pending = []

        for record in queryset.iterator(chunk_size=batch_size):
            raw_data = {
                "raw_source": record.raw_source,
                "raw_device": record.raw_device,
                "raw_result": record.raw_result,
                "raw_content": record.raw_content,
                "raw_cause": record.raw_cause,
                "raw_solution": record.raw_solution,
            }

            clean_fields = build_rule_based_clean_fields(raw_data)

            record_changed = False
            for field_name, new_value in clean_fields.items():
                if getattr(record, field_name) != new_value:
                    setattr(record, field_name, new_value)
                    record_changed = True

            processed += 1

            if record_changed:
                changed += 1
                pending.append(record)

            if len(pending) >= batch_size:
                if not dry_run:
                    with transaction.atomic():
                        ExternalErrorRecord.objects.bulk_update(
                            pending,
                            CLEAN_FIELDS,
                            batch_size=batch_size,
                        )
                pending.clear()

            if processed % batch_size == 0:
                self.stdout.write(
                    f"Đã xử lý {processed}/{total}, "
                    f"có thay đổi {changed} record."
                )

        if pending and not dry_run:
            with transaction.atomic():
                ExternalErrorRecord.objects.bulk_update(
                    pending,
                    CLEAN_FIELDS,
                    batch_size=batch_size,
                )

        mode = "DRY RUN" if dry_run else "ĐÃ CẬP NHẬT"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: xử lý {processed} record, "
                f"thay đổi {changed} record."
            )
        )
