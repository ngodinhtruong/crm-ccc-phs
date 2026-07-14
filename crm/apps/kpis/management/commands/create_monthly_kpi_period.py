from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.kpis.services import create_monthly_kpi_period


class Command(BaseCommand):
    help = "Create monthly KPI period with default groups, metrics, gates, and reward tiers."

    def add_arguments(self, parser):
        parser.add_argument("--year", type=int, required=True)
        parser.add_argument("--month", type=int, required=True)
        parser.add_argument("--activate", action="store_true")
        parser.add_argument("--created-by", type=str, default=None)

    def handle(self, *args, **options):
        year = options["year"]
        month = options["month"]
        activate = options["activate"]
        created_by_value = options["created_by"]

        created_by_user = None

        if created_by_value:
            User = get_user_model()

            created_by_user = (
                User.objects.filter(username=created_by_value).first()
                or User.objects.filter(email=created_by_value).first()
            )

            if not created_by_user:
                raise CommandError(f"Không tìm thấy user: {created_by_value}")

        period, created = create_monthly_kpi_period(
            year=year,
            month=month,
            created_by_user=created_by_user,
            activate=activate,
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created KPI period {period.period_code} - status {period.status}"
                )
            )
            return

        self.stdout.write(
            self.style.WARNING(
                f"KPI period {period.period_code} đã tồn tại - status {period.status}"
            )
        )