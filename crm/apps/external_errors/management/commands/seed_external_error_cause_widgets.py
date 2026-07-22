
from django.core.management.base import BaseCommand

from apps.external_errors.models import ExternalErrorDashboardWidget


WIDGETS = [
    {
        "title": "Phân bổ nguyên nhân chính gây lỗi",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_DONUT,
        "group_by": "cause_group",
        "breakdown_by": None,
        "limit": 20,
    },
    {
        "title": "Nguyên nhân lỗi theo từng thiết bị",
        "widget_type": (
            ExternalErrorDashboardWidget.WIDGET_STACKED_HORIZONTAL_BAR
        ),
        "group_by": "device",
        "breakdown_by": "cause_group",
        "limit": 20,
    },
]


class Command(BaseCommand):
    help = "Seed hai widget thống kê nguyên nhân."

    def handle(self, *args, **options):
        for item in WIDGETS:
            ExternalErrorDashboardWidget.objects.update_or_create(
                title=item["title"],
                defaults={
                    **item,
                    "metric": "count",
                    "sort_by": "count",
                    "sort_direction": "desc",
                    "is_default": True,
                    "is_active": True,
                },
            )

        self.stdout.write(
            self.style.SUCCESS("Đã seed widget nguyên nhân.")
        )
