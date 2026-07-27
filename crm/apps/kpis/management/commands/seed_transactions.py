import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.customers.models import Customer, CustomerAccount
from apps.kpis.models import TransactionLog


STOCK_CODES = [
    "FPT", "VNM", "HPG", "SSI", "VND", "MWG", "VCB", "BID", "CTG", "MBB",
    "TCB", "ACB", "VIC", "VHM", "GAS", "POW", "PVS", "HAH", "HCM", "KDH",
]

MARKETS = ["HOSE", "HNX", "UPCOM"]
ORDER_TYPES = ["LO", "ATO", "ATC", "MP"]
SIDES = ["BUY", "SELL"]
ORDER_STATUSES = ["MATCHED", "PARTIALLY_MATCHED", "COMPLETED"]
PRODUCT_CODES = ["STOCK", "MARGIN", "DERIVATIVE"]
SOURCE_SYSTEMS = ["WEBTRADING", "MOBILE", "CORE_SECURITIES"]


class Command(BaseCommand):
    help = (
        "Tạo tài khoản và giao dịch mẫu cho 50 khách hàng HS_Q7; "
        "mỗi khách hàng có 5 giao dịch."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--customers",
            type=int,
            default=50,
            help="Số khách hàng được tạo giao dịch, mặc định 50.",
        )
        parser.add_argument(
            "--transactions-per-customer",
            type=int,
            default=5,
            help="Số giao dịch trên mỗi khách hàng, mặc định 5.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa các giao dịch FAKE-TXN-HSQ7-* trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        customer_count = options["customers"]
        transactions_per_customer = options["transactions_per_customer"]
        reset = options["reset"]

        if customer_count <= 0:
            raise CommandError("--customers phải lớn hơn 0.")

        if transactions_per_customer <= 0:
            raise CommandError("--transactions-per-customer phải lớn hơn 0.")

        customers = list(
            Customer.objects.select_related("branch")
            .filter(
                customer_code__startswith="FAKE_HSQ7_",
                branch__branch_code="HS_Q7",
                status="ACTIVE",
            )
            .order_by("customer_code")[:customer_count]
        )

        if len(customers) < customer_count:
            raise CommandError(
                f"Chỉ tìm thấy {len(customers)} khách hàng mẫu HS_Q7, "
                f"không đủ {customer_count}. "
                "Hãy chạy seed_fake_customers_hsq7 trước."
            )

        if reset:
            deleted_count, _ = TransactionLog.objects.filter(
                transaction_code__startswith="FAKE-TXN-HSQ7-"
            ).delete()

            self.stdout.write(
                self.style.WARNING(
                    f"Đã xóa {deleted_count} giao dịch mẫu cũ."
                )
            )

        rng = random.Random(20260727)
        now = timezone.now()

        account_created_count = 0
        account_updated_count = 0
        transaction_created_count = 0
        transaction_updated_count = 0

        for customer_index, customer in enumerate(customers, start=1):
            account_number = f"7{customer_index:09d}"

            customer_account, account_created = CustomerAccount.objects.update_or_create(
                customer=customer,
                defaults={
                    "account_number": account_number,
                    "opened_at": now.date() - timedelta(days=rng.randint(30, 1500)),
                    "account_status": "ACTIVE",
                    "source_system": "CORE_SECURITIES",
                },
            )

            if account_created:
                account_created_count += 1
            else:
                account_updated_count += 1

            for transaction_index in range(1, transactions_per_customer + 1):
                transaction_code = (
                    f"FAKE-TXN-HSQ7-"
                    f"{customer_index:03d}-"
                    f"{transaction_index:02d}"
                )

                transaction_date = (
                    now.date() - timedelta(days=rng.randint(0, 180))
                )
                matched_hour = rng.randint(9, 14)
                matched_minute = rng.randint(0, 59)

                matched_at = timezone.make_aware(
                    datetime.combine(
                        transaction_date,
                        datetime.min.time(),
                    ).replace(
                        hour=matched_hour,
                        minute=matched_minute,
                    )
                )

                stock_code = rng.choice(STOCK_CODES)
                side = rng.choice(SIDES)
                quantity = Decimal(rng.choice([100, 200, 300, 500, 1000, 1500, 2000]))
                price = Decimal(rng.randrange(10000, 120001, 100))
                transaction_value = quantity * price
                fee_rate = Decimal("0.0015")
                transaction_fee = (
                    transaction_value * fee_rate
                ).quantize(Decimal("0.01"))

                _, transaction_created = TransactionLog.objects.update_or_create(
                    transaction_code=transaction_code,
                    defaults={
                        "customer_account": customer_account,
                        "branch": customer.branch,
                        "transaction_date": transaction_date,
                        "matched_at": matched_at,
                        "source_transaction_id": (
                            f"CORE-{customer_index:03d}-{transaction_index:02d}"
                        ),
                        "stock_code": stock_code,
                        "side": side,
                        "quantity": quantity,
                        "price": price,
                        "market": rng.choice(MARKETS),
                        "order_type": rng.choice(ORDER_TYPES),
                        "transaction_value": transaction_value,
                        "transaction_fee": transaction_fee,
                        "order_status": rng.choice(ORDER_STATUSES),
                        "product_code": rng.choice(PRODUCT_CODES),
                        "source_system": rng.choice(SOURCE_SYSTEMS),
                    },
                )

                if transaction_created:
                    transaction_created_count += 1
                else:
                    transaction_updated_count += 1

        expected_transactions = customer_count * transactions_per_customer

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT TẠO GIAO DỊCH MẪU ===\n"
                f"- Khách hàng được xử lý: {customer_count}\n"
                f"- Giao dịch mỗi khách hàng: {transactions_per_customer}\n"
                f"- Tổng giao dịch dự kiến: {expected_transactions}\n"
                f"- Tài khoản tạo mới: {account_created_count}\n"
                f"- Tài khoản cập nhật: {account_updated_count}\n"
                f"- Giao dịch tạo mới: {transaction_created_count}\n"
                f"- Giao dịch cập nhật: {transaction_updated_count}"
            )
        )
