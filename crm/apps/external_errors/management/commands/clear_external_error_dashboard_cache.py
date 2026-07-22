from django.core.management.base import BaseCommand

from apps.external_errors.services.dashboard_cache import (
    invalidate_external_error_dashboard_cache,
)


class Command(BaseCommand):
    help = "Làm mới cache dashboard lỗi bằng cách tăng cache version."

    def handle(self, *args, **options):
        version = invalidate_external_error_dashboard_cache()
        self.stdout.write(
            self.style.SUCCESS(
                "Đã làm mới cache dashboard External Errors. "
                f"Version mới: {version}."
            )
        )
