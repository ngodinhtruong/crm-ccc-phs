from django.conf import settings
from django.core.management.base import BaseCommand
from django_celery_beat.models import IntervalSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Đăng ký lịch quét SLA quá hạn định kỳ"

    def handle(self, *args, **options):
        minutes = int(getattr(settings, "SLA_SCAN_INTERVAL_MINUTES", 5))

        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=minutes,
            period=IntervalSchedule.MINUTES,
        )

        task, created = PeriodicTask.objects.update_or_create(
            name="Scan SLA overdue tickets",
            defaults={
                "interval": schedule,
                "task": "apps.sla.tasks.scan_sla_overdue_task",
                "enabled": True,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Lịch quét SLA {'đã tạo' if created else 'đã cập nhật'}: "
                f"mỗi {minutes} phút"
            )
        )
