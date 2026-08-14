"""
Gán hạng thành viên cho khách theo giá trị giao dịch thực tế.

Hạng VIP trong ``membership_tiers`` là master data có sẵn nhưng chưa khách nào
được gán, nên bộ lọc "Phân loại VIP" trên màn khách hàng luôn ra rỗng. Lệnh này
xếp hạng theo tổng giá trị lệnh khớp 12 tháng gần nhất — có căn cứ, chạy lại
sau khi dữ liệu giao dịch đổi thì hạng cũng đổi theo.

Khách chưa từng giao dịch KHÔNG bị gán hạng: để trống nghĩa là "chưa đủ dữ
liệu xếp hạng", khác hẳn với "đã xét và thấy chỉ đạt hạng cơ bản".
"""

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.common.constants import MATCHED_ORDER_STATUSES
from apps.customers.models import Customer, MembershipTier
from apps.kpis.models import TransactionLog

MONTHS_BACK_DAYS = 365

# Phân vị trên tổng GTGD, xếp từ cao xuống. Dùng phân vị chứ không dùng mốc
# tiền cố định: mốc cứng sẽ lệch ngay khi quy mô giao dịch của cả hệ thống
# thay đổi, còn phân vị thì luôn cho ra tỷ lệ hạng ổn định.
TIER_BANDS = [
    ("VIP Gold", 0.25),
    ("VIP Silver", 0.60),
    ("Cơ bản", 1.00),
]


class Command(BaseCommand):
    help = "Gán hạng thành viên theo tổng giá trị giao dịch 12 tháng gần nhất."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ thống kê, không ghi vào database.",
        )
        parser.add_argument(
            "--clear-untraded",
            action="store_true",
            help="Xóa hạng của khách chưa từng giao dịch (mặc định giữ nguyên).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        tiers = {tier.tier_name: tier for tier in MembershipTier.objects.all()}
        missing = [name for name, _ in TIER_BANDS if name not in tiers]

        if missing:
            raise CommandError(
                f"Chưa có hạng thành viên: {', '.join(missing)}. "
                "Hãy seed master data khách hàng trước."
            )

        since = timezone.localdate() - timedelta(days=MONTHS_BACK_DAYS)

        totals = (
            TransactionLog.objects.filter(
                order_status__in=MATCHED_ORDER_STATUSES,
                transaction_date__gte=since,
                customer_account__customer__isnull=False,
            )
            .values("customer_account__customer_id")
            .annotate(total=Sum("transaction_value"))
            .order_by("-total")
        )

        ranked = [
            (row["customer_account__customer_id"], row["total"] or 0)
            for row in totals
        ]

        if not ranked:
            raise CommandError(
                "Không có giao dịch khớp nào trong 12 tháng để xếp hạng."
            )

        assignments = {}
        counts = {name: 0 for name, _ in TIER_BANDS}
        total_count = len(ranked)
        start = 0

        for tier_name, cutoff in TIER_BANDS:
            end = round(total_count * cutoff)

            for customer_id, _ in ranked[start:end]:
                assignments[customer_id] = tiers[tier_name]
                counts[tier_name] += 1

            start = end

        cleared = 0

        if not dry_run:
            for customer_id, tier in assignments.items():
                Customer.objects.filter(id=customer_id).update(membership_tier=tier)

            if options["clear_untraded"]:
                cleared = (
                    Customer.objects.exclude(id__in=assignments.keys())
                    .filter(membership_tier__isnull=False)
                    .update(membership_tier=None)
                )

        summary = "\n".join(
            f"- {name}: {counts[name]} khách" for name, _ in TIER_BANDS
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== {'THỬ CHẠY' if dry_run else 'HOÀN TẤT'} XẾP HẠNG THÀNH VIÊN ===\n"
                f"- Khách có giao dịch trong 12 tháng: {total_count}\n"
                f"{summary}\n"
                f"- Xóa hạng khách chưa giao dịch: {cleared}"
            )
        )
