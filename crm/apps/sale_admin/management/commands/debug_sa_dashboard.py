"""
Lệnh chẩn đoán tại sao Dashboard Sale Admin hiện 0.
Chạy: python manage.py debug_sa_dashboard
Hoặc: python manage.py debug_sa_dashboard --year=2026 --month=7
"""

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

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
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  Chẩn đoán Dashboard SA — T{month}/{year}")
        self.stdout.write(f"  Kỳ: {start} -> {end} (exclusive)")
        self.stdout.write(f"{'='*60}\n")

        # 1. Kiểm tra TransactionLog import
        self.stdout.write(self.style.HTTP_INFO("[1] Kiểm tra import TransactionLog..."))
        try:
            from apps.kpis.models import TransactionLog
            self.stdout.write(self.style.SUCCESS(f"    ✅ Import OK: {TransactionLog}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"    ❌ Import THẤT BẠI: {e}"))
            self.stdout.write(self.style.ERROR("    -> Đây là nguyên nhân tất cả GD/TK kích hoạt = 0!"))
            TransactionLog = None

        # 2. Đếm SA Records trong kỳ
        self.stdout.write(self.style.HTTP_INFO(f"\n[2] SA Records trong kỳ T{month}/{year}..."))
        records = SaRecord.objects.filter(
            call_date__gte=start,
            call_date__lt=end,
        )
        total_records = records.count()
        self.stdout.write(f"    Tổng SA Records: {total_records}")

        reactivation_records = records.filter(reactivation=True)
        reactivation_count = reactivation_records.count()
        self.stdout.write(f"    Records có reactivation=True: {reactivation_count}")

        # 3. Lấy account_nos từ SA Records
        account_nos = set(
            str(r).strip()
            for r in records.exclude(account_no__isnull=True)
            .exclude(account_no="")
            .values_list("account_no", flat=True)
        )
        self.stdout.write(f"    Số account_no duy nhất: {len(account_nos)}")

        reactivated_nos = set(
            str(r).strip()
            for r in reactivation_records.exclude(account_no__isnull=True)
            .exclude(account_no="")
            .values_list("account_no", flat=True)
        )
        self.stdout.write(f"    Account_no có reactivation=True: {len(reactivated_nos)}")

        if account_nos:
            samples = list(account_nos)[:5]
            self.stdout.write(f"    Mẫu account_no (SA Record): {samples}")

        # 4. Kiểm tra TransactionLog
        if TransactionLog is None:
            self.stdout.write(self.style.ERROR("\n[3] SKIP kiểm tra transaction_logs — TransactionLog = None"))
            return

        self.stdout.write(self.style.HTTP_INFO(f"\n[3] TransactionLog trong kỳ T{month}/{year}..."))

        total_txn_all = TransactionLog.objects.count()
        self.stdout.write(f"    Tổng records trong bảng transaction_logs (toàn bộ): {total_txn_all}")

        if total_txn_all == 0:
            self.stdout.write(self.style.ERROR("    ❌ Bảng transaction_logs TRỐNG — đây là nguyên nhân!"))
            self.stdout.write(self.style.WARNING("    -> Cần import dữ liệu giao dịch vào bảng transaction_logs."))
            return

        txn_in_period = TransactionLog.objects.filter(
            transaction_date__gte=start,
            transaction_date__lt=end,
        )
        txn_in_period_count = txn_in_period.count()
        self.stdout.write(f"    TransactionLog trong kỳ: {txn_in_period_count}")

        if txn_in_period_count == 0:
            self.stdout.write(self.style.ERROR(f"    ❌ Không có giao dịch nào trong kỳ T{month}/{year}!"))

            # Tìm khoảng ngày có dữ liệu
            from django.db.models import Max, Min
            date_range = TransactionLog.objects.aggregate(
                min_date=Min("transaction_date"),
                max_date=Max("transaction_date"),
            )
            self.stdout.write(f"    Khoảng ngày có dữ liệu: {date_range['min_date']} -> {date_range['max_date']}")
            return

        # Mẫu account_no trong transaction_logs
        txn_account_nos = set(
            str(r).strip()
            for r in txn_in_period.values_list("account_no", flat=True).distinct()[:100]
        )
        txn_samples = list(txn_account_nos)[:5]
        self.stdout.write(f"    Số account_no duy nhất (transaction_logs): {len(txn_account_nos)}")
        self.stdout.write(f"    Mẫu account_no (TransactionLog): {txn_samples}")

        # 5. Kiểm tra giao nhau
        self.stdout.write(self.style.HTTP_INFO("\n[4] Kiểm tra giao nhau (intersection)..."))

        if not account_nos:
            self.stdout.write(self.style.ERROR("    ❌ Không có account_no nào từ SA Records!"))
            return

        matched_txn = TransactionLog.objects.filter(
            account_no__in=account_nos,
            transaction_date__gte=start,
            transaction_date__lt=end,
        )
        matched_count = matched_txn.count()
        self.stdout.write(f"    Giao dịch khớp account_no với SA Records: {matched_count}")

        matched_account_nos = set(
            str(r).strip()
            for r in matched_txn.values_list("account_no", flat=True).distinct()
        )
        self.stdout.write(f"    Số account_no khớp: {len(matched_account_nos)}")

        if matched_count == 0:
            self.stdout.write(self.style.ERROR("    ❌ KHÔNG CÓ account_no nào khớp giữa SA Records và TransactionLog!"))
            self.stdout.write(self.style.WARNING("    -> Có thể account_no format khác nhau (viết hoa/thường, khoảng trắng, prefix...)"))
            self.stdout.write(f"    So sánh mẫu:")
            self.stdout.write(f"      SA Record:       {list(account_nos)[:3]}")
            self.stdout.write(f"      TransactionLog:  {txn_samples[:3]}")
            return

        # 6. TK kích hoạt cuối cùng
        self.stdout.write(self.style.HTTP_INFO("\n[5] Tính TK kích hoạt..."))
        active_accounts = reactivated_nos.intersection(matched_account_nos)
        self.stdout.write(f"    TK kích hoạt = reactivated ∩ có giao dịch = {len(active_accounts)}")

        if len(active_accounts) == 0 and len(reactivated_nos) > 0 and len(matched_account_nos) > 0:
            self.stdout.write(self.style.WARNING("    ⚠️  Có reactivated accounts VÀ có giao dịch khớp, nhưng KHÔNG CÓ giao nhau!"))
            self.stdout.write(f"    Reactivated: {list(reactivated_nos)[:5]}")
            self.stdout.write(f"    Có giao dịch: {list(matched_account_nos)[:5]}")

        # 7. Kiểm tra exclude trạng thái huỷ
        from django.db.models import Q
        excluded = matched_txn.filter(
            Q(order_status__iexact="CANCELLED")
            | Q(order_status__iexact="CANCELED")
            | Q(order_status__iexact="REJECTED")
            | Q(order_status__icontains="HUY")
            | Q(order_status__icontains="HỦY")
        ).count()
        self.stdout.write(f"\n    Giao dịch bị exclude (huỷ/reject): {excluded}/{matched_count}")

        valid_after_exclude = matched_count - excluded
        self.stdout.write(f"    Giao dịch hợp lệ sau exclude: {valid_after_exclude}")

        if valid_after_exclude == 0 and matched_count > 0:
            self.stdout.write(self.style.ERROR("    ❌ TẤT CẢ giao dịch đều bị exclude bởi bộ lọc trạng thái!"))
            statuses = list(
                matched_txn.values_list("order_status", flat=True).distinct()
            )
            self.stdout.write(f"    Các order_status có: {statuses}")

        # 8. Tóm tắt
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(self.style.HTTP_INFO("  TÓM TẮT"))
        self.stdout.write(f"{'='*60}")
        self.stdout.write(f"  Tổng cuộc gọi:                  {total_records}")
        self.stdout.write(f"  Records reactivation=True:      {reactivation_count}")
        self.stdout.write(f"  Account_no duy nhất (SA):       {len(account_nos)}")
        self.stdout.write(f"  TransactionLog trong kỳ:        {txn_in_period_count}")
        self.stdout.write(f"  Giao dịch khớp account_no:      {matched_count}")
        self.stdout.write(f"  Sau exclude trạng thái:         {valid_after_exclude}")
        self.stdout.write(f"  TK kích hoạt (reactivated ∩ GD): {len(active_accounts)}")
        self.stdout.write(f"{'='*60}\n")
