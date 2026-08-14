"""
Sinh giao dịch mẫu cho các tài khoản khách hàng đã có sẵn.

Lệnh này chỉ đọc ``CustomerAccount``, không tạo và không sửa số tài khoản: số
TK là khoá nối sang ``SaRecord.account_no``, ghi đè lên sẽ làm đứt liên kết của
dữ liệu đã seed trước đó.

Dữ liệu được trải trên 12 tháng gần nhất và chia theo vài kiểu hành vi khác
nhau, vì màn Customer 360 phân loại khách theo số tháng có giao dịch — nếu mọi
khách đều có lượng lệnh giống nhau thì biểu đồ hành vi không nói lên điều gì.
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.customers.models import CustomerAccount
from apps.kpis.models import TransactionLog

STOCK_CODES = [
    "FPT", "VNM", "HPG", "SSI", "VND", "MWG", "VCB", "BID", "CTG", "MBB",
    "TCB", "ACB", "VIC", "VHM", "GAS", "POW", "PVS", "HAH", "HCM", "KDH",
]

MARKETS = ["HOSE", "HNX", "UPCOM"]
ORDER_TYPES = ["LO", "ATO", "ATC", "MP"]
SIDES = ["BUY", "SELL"]
PRODUCT_CODES = ["STOCK", "MARGIN", "DERIVATIVE"]
SOURCE_SYSTEMS = ["WEBTRADING", "MOBILE", "CORE_SECURITIES"]

# Mã tiếng Anh, không phải nhãn tiếng Việt: dashboard SA và KPI auto-calculation
# lọc theo đúng bộ mã này (xem MATCHED_ORDER_STATUSES ở apps/common/
# dashboard_views.py). Seed nhãn tiếng Việt sẽ khiến mọi số liệu ra 0.
ORDER_STATUSES = ["MATCHED", "MATCHED", "MATCHED", "PARTIALLY_MATCHED"]

# Tiền tố để --reset nhận ra dữ liệu do lệnh này sinh, không đụng dữ liệu thật.
TRANSACTION_CODE_PREFIX = "FAKE-TXN-"

MONTHS_BACK = 12
RECENT_MONTHS = 6

# Kiểu hành vi và tỷ lệ khách rơi vào mỗi kiểu. Tên khớp với cách Customer 360
# gợi ý phân loại, để nhìn dữ liệu seed là đối chiếu được ngay với màn hình.
BEHAVIOUR_WEIGHTS = [
    ("REGULAR", 30),      # Giao dịch đều
    ("OCCASIONAL", 40),   # Thỉnh thoảng
    ("BURST", 20),        # Bùng phát rồi tắt
    ("NONE", 10),         # Chưa giao dịch
]

FEE_RATE = Decimal("0.0015")


def _month_starts(today, count):
    """``count`` mốc đầu tháng, cũ nhất trước, tháng hiện tại cuối cùng."""
    starts = []
    index = today.year * 12 + today.month - 1

    for offset in range(count - 1, -1, -1):
        moment = index - offset
        starts.append(today.replace(year=moment // 12, month=moment % 12 + 1, day=1))

    return starts


def _pick_months(rng, months, behaviour):
    """
    Chọn các tháng có phát sinh lệnh và số lệnh của từng tháng.

    Trả về list ``(month_start, số lệnh)``.
    """
    recent = months[-RECENT_MONTHS:]
    earlier = months[:-RECENT_MONTHS]

    if behaviour == "NONE":
        return []

    if behaviour == "REGULAR":
        chosen = rng.sample(recent, rng.randint(4, RECENT_MONTHS))
        chosen += rng.sample(earlier, rng.randint(2, 4))
        return [(month, rng.randint(2, 5)) for month in chosen]

    if behaviour == "BURST":
        # Dồn lệnh vào một tháng cũ rồi im hẳn — nửa năm gần đây không có gì.
        return [(rng.choice(earlier), rng.randint(5, 9))]

    return [(month, rng.randint(1, 3)) for month in rng.sample(months, rng.randint(2, 3))]


def _day_in_month(rng, month_start, today):
    """Ngày ngẫu nhiên trong tháng, không vượt quá hôm nay."""
    next_month = (month_start + timedelta(days=32)).replace(day=1)
    last_day = min(next_month - timedelta(days=1), today)

    if last_day < month_start:
        return month_start

    return month_start + timedelta(days=rng.randint(0, (last_day - month_start).days))


class Command(BaseCommand):
    help = (
        "Sinh giao dịch mẫu trải 12 tháng cho các tài khoản khách hàng đã có. "
        "Không tạo và không sửa CustomerAccount."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--customers",
            type=int,
            default=0,
            help="Giới hạn số tài khoản được seed; 0 (mặc định) là tất cả.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help=f"Xóa các giao dịch {TRANSACTION_CODE_PREFIX}* trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        limit = options["customers"]

        if limit < 0:
            raise CommandError("--customers không được âm.")

        accounts = list(
            CustomerAccount.objects.select_related("customer", "customer__branch")
            .filter(customer__isnull=False)
            .order_by("account_number")
        )

        if limit:
            accounts = accounts[:limit]

        if not accounts:
            raise CommandError(
                "Không có CustomerAccount nào để gắn giao dịch. "
                "Hãy seed khách hàng và tài khoản trước."
            )

        if options["reset"]:
            deleted_count, _ = TransactionLog.objects.filter(
                transaction_code__startswith=TRANSACTION_CODE_PREFIX
            ).delete()

            self.stdout.write(
                self.style.WARNING(f"Đã xóa {deleted_count} giao dịch mẫu cũ.")
            )

        rng = random.Random(20260814)
        today = timezone.localdate()
        months = _month_starts(today, MONTHS_BACK)

        behaviours = [name for name, weight in BEHAVIOUR_WEIGHTS for _ in range(weight)]
        behaviour_counts = {name: 0 for name, _ in BEHAVIOUR_WEIGHTS}
        created_count = 0
        updated_count = 0

        for account in accounts:
            behaviour = rng.choice(behaviours)
            behaviour_counts[behaviour] += 1
            order_index = 0

            for month_start, order_count in _pick_months(rng, months, behaviour):
                for _ in range(order_count):
                    order_index += 1
                    transaction_date = _day_in_month(rng, month_start, today)

                    matched_at = timezone.make_aware(
                        datetime.combine(transaction_date, datetime.min.time()).replace(
                            hour=rng.randint(9, 14),
                            minute=rng.randint(0, 59),
                        )
                    )

                    quantity = Decimal(rng.choice([100, 200, 300, 500, 1000, 1500, 2000]))
                    price = Decimal(rng.randrange(10000, 120001, 100))
                    transaction_value = quantity * price

                    _, created = TransactionLog.objects.update_or_create(
                        transaction_code=(
                            f"{TRANSACTION_CODE_PREFIX}"
                            f"{account.account_number}-{order_index:03d}"
                        ),
                        defaults={
                            "customer_account": account,
                            "branch": account.customer.branch,
                            "transaction_date": transaction_date,
                            "matched_at": matched_at,
                            "source_transaction_id": (
                                f"CORE-{account.account_number}-{order_index:03d}"
                            ),
                            "stock_code": rng.choice(STOCK_CODES),
                            "side": rng.choice(SIDES),
                            "quantity": quantity,
                            "price": price,
                            "market": rng.choice(MARKETS),
                            "order_type": rng.choice(ORDER_TYPES),
                            "transaction_value": transaction_value,
                            "transaction_fee": (
                                transaction_value * FEE_RATE
                            ).quantize(Decimal("0.01")),
                            "order_status": rng.choice(ORDER_STATUSES),
                            "product_code": rng.choice(PRODUCT_CODES),
                            "source_system": rng.choice(SOURCE_SYSTEMS),
                        },
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

        summary = "\n".join(
            f"- {name}: {behaviour_counts[name]} tài khoản"
            for name, _ in BEHAVIOUR_WEIGHTS
        )

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT TẠO GIAO DỊCH MẪU ===\n"
                f"- Tài khoản xử lý: {len(accounts)}\n"
                f"- Khoảng thời gian: {months[0]} → {today}\n"
                f"- Giao dịch tạo mới: {created_count}\n"
                f"- Giao dịch cập nhật: {updated_count}\n"
                f"{summary}"
            )
        )
