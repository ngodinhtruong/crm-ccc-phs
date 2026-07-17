from django.core.management.base import BaseCommand

from apps.external_errors.models import ExternalErrorDashboardWidget


DEFAULT_WIDGETS = [
    {
        "title": "Số lượng lỗi theo thiết bị",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_BAR,
        "group_by": "device",
        "limit": 10,
    },
    {
        "title": "Nguồn phát hiện lỗi",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_DONUT,
        "group_by": "source",
        "limit": 10,
    },
    {
        "title": "Xu hướng lỗi theo tháng",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_LINE,
        "group_by": "month",
        "limit": 12,
    },
    {
        "title": "Cơ cấu lỗi theo thiết bị qua từng tháng",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_STACKED_BAR,
        "group_by": "month",
        "breakdown_by": "device",
        "limit": 12,
    },
    {
        "title": "Phân bổ loại lỗi",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_DONUT,
        "group_by": "error_type",
        "limit": 10,
    },
    {
        "title": "Loại lỗi theo từng thiết bị",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_STACKED_HORIZONTAL_BAR,
        "group_by": "device",
        "breakdown_by": "error_type",
        "limit": 10,
    },
    {
        "title": "Vấn đề lặp lại",
        "widget_type": ExternalErrorDashboardWidget.WIDGET_TABLE,
        "group_by": "issue",
        "limit": 20,
    },
]


class Command(BaseCommand):
    help = "Tạo các widget dashboard lỗi mặc định."

    def handle(self, *args, **options):
        created = 0
        for index, item in enumerate(DEFAULT_WIDGETS, start=1):
            _, was_created = ExternalErrorDashboardWidget.objects.update_or_create(
                title=item["title"],
                defaults={
                    **item,
                    "sort_by": "count",
                    "sort_direction": "desc",
                    "is_default": True,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded default external error widgets. Created: {created}"))
