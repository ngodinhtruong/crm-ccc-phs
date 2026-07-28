"""Chẩn đoán dữ liệu Dashboard Sale Admin.

Chạy:
    python manage.py debug_sa_dashboard
    python manage.py debug_sa_dashboard --year=2026 --month=7
"""

from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Exists, Max, Min, OuterRef
from django.utils import timezone

from apps.kpis.models import TransactionLog
from apps.sale_admin.admin_dashboard import MATCHED_ORDER_STATUSES
from apps.sale_admin.models import SaRecord


class Command(BaseCommand):
    help = "Chẩn đoán dữ liệu Dashboard Sale Admin"

    def add_arguments(self, parser):
        parser.add_argument("--year", type=int, default=None)
        parser.add_argument("--month", type=int, default=None)

    def handle(self, *args, **options):
        today = timezone.localdate()
        year = options["year"] or today.year
        month = options["month"] or today.month

        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        self.stdout.write(f"\n{'=' * 64}")
        self.stdout.write(f"Dashboard SA — T{month}/{year}: {start} -> {end} (exclusive)")
        self.stdout.write(f"{'=' * 64}")

        records = SaRecord.objects.filter(call_date__gte=start, call_date__lt=end)
        linked_records = records.filter(customer_account__isnull=False)
        reactivation_records = linked_records.filter(reactivation=True)

        account_ids = set(
            linked_records.values_list("customer_account_id", flat=True).distinct()
        )
        account_nos = set(
            linked_records.values_list(
                "customer_account__account_number", flat=True
            ).distinct()
        )

        self.stdout.write(f"SA Records trong kỳ:                 {records.count()}")
        self.stdout.write(f"Records đã liên kết CustomerAccount: {linked_records.count()}")
        self.stdout.write(f"Tài khoản duy nhất:                  {len(account_ids)}")
        self.stdout.write(f"Records reactivation=True:           {reactivation_records.count()}")

        if account_nos:
            self.stdout.write(f"Mẫu số tài khoản: {sorted(account_nos)[:5]}")

        total_transactions = TransactionLog.objects.count()
        period_transactions = TransactionLog.objects.filter(
            transaction_date__gte=start,
            transaction_date__lt=end,
        )
        matched_transactions = period_transactions.filter(
            customer_account_id__in=account_ids,
            order_status__in=MATCHED_ORDER_STATUSES,
        )

        self.stdout.write(f"\nTransactionLog toàn hệ thống:        {total_transactions}")
        self.stdout.write(f"TransactionLog trong kỳ:             {period_transactions.count()}")
        self.stdout.write(f"Lệnh khớp thuộc tài khoản SA:         {matched_transactions.count()}")
        self.stdout.write(
            f"Tài khoản có lệnh khớp:              "
            f"{matched_transactions.values('customer_account_id').distinct().count()}"
        )

        if total_transactions:
            date_range = TransactionLog.objects.aggregate(
                min_date=Min("transaction_date"),
                max_date=Max("transaction_date"),
            )
            self.stdout.write(
                f"Khoảng ngày transaction_logs:         "
                f"{date_range['min_date']} -> {date_range['max_date']}"
            )

        matched_after_call = TransactionLog.objects.filter(
            customer_account_id=OuterRef("customer_account_id"),
            transaction_date__gte=OuterRef("call_date"),
            transaction_date__lt=end,
            order_status__in=MATCHED_ORDER_STATUSES,
        )

        valid_reactivated = (
            reactivation_records.annotate(
                has_matched_after_call=Exists(matched_after_call)
            )
            .filter(has_matched_after_call=True)
            .values("customer_account_id")
            .distinct()
        )

        invalid_reactivated = (
            reactivation_records.annotate(
                has_matched_after_call=Exists(matched_after_call)
            )
            .filter(has_matched_after_call=False)
            .count()
        )

        self.stdout.write("\nKết quả KPI tái kích hoạt:")
        self.stdout.write(
            self.style.SUCCESS(
                f"- TK hợp lệ (reactivation + lệnh khớp sau ngày gọi): "
                f"{valid_reactivated.count()}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                f"- Record reactivation=True nhưng không có lệnh khớp sau gọi: "
                f"{invalid_reactivated}"
            )
        )

        unlinked = records.filter(customer_account__isnull=True).count()
        if unlinked:
            self.stdout.write(
                self.style.WARNING(
                    f"- Có {unlinked} SaRecord chưa liên kết CustomerAccount; "
                    "các record này không thể nối transaction_logs."
                )
            )
