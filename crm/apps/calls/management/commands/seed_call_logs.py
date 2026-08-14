"""
Sinh lịch sử cuộc gọi mẫu cho các khách hàng đã có tài khoản giao dịch.

Chỉ seed cho khách đã có ``CustomerAccount``: màn Customer 360 đặt biểu đồ cuộc
gọi cạnh biểu đồ giao dịch, nếu hai nguồn rơi vào hai tập khách khác nhau thì
mở khách nào cũng chỉ thấy một nửa số liệu.

Cuộc gọi được gắn vào ticket của chính khách đó khi có, vì phần lớn cuộc gọi
thật phát sinh từ một yêu cầu hỗ trợ chứ không đứng một mình.
"""

import random
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.branches.models import Employee
from apps.calls.models import CallLog
from apps.customers.models import CustomerAccount
from apps.tickets.models import Ticket

DIRECTIONS = ["INBOUND", "OUTBOUND"]
SOURCE_SYSTEMS = ["CALL_CENTER", "CLOUDGO", "CRM"]

NOTES = [
    "Khách hỏi về phí giao dịch.",
    "Tư vấn mở thêm tiểu khoản margin.",
    "Khách phản ánh app đăng nhập chậm.",
    "Xác nhận lệnh khớp trong phiên.",
    "Hướng dẫn khách đổi số điện thoại nhận OTP.",
    "Khách hỏi lịch chi trả cổ tức.",
    "Nhắc khách bổ sung hồ sơ eKYC.",
    "Khách không nghe máy.",
]

# Tiền tố để --reset nhận ra dữ liệu do lệnh này sinh, không đụng dữ liệu thật.
EXTERNAL_CALL_ID_PREFIX = "FAKE-CALL-"

MONTHS_BACK = 12

# Gọi nhỡ để duration bằng 0 — biểu đồ thời lượng cần có cả trường hợp này,
# nếu mọi cuộc đều có thời lượng thì tỷ lệ kết nối luôn ra 100%.
MISSED_CALL_RATE = 0.18


class Command(BaseCommand):
    help = (
        "Sinh lịch sử cuộc gọi mẫu trải 12 tháng cho khách hàng đã có tài khoản."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--customers",
            type=int,
            default=0,
            help="Giới hạn số khách hàng được seed; 0 (mặc định) là tất cả.",
        )
        parser.add_argument(
            "--max-calls",
            type=int,
            default=8,
            help="Số cuộc gọi tối đa mỗi khách, mặc định 8.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help=f"Xóa các cuộc gọi {EXTERNAL_CALL_ID_PREFIX}* trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        limit = options["customers"]
        max_calls = options["max_calls"]

        if limit < 0:
            raise CommandError("--customers không được âm.")

        if max_calls <= 0:
            raise CommandError("--max-calls phải lớn hơn 0.")

        accounts = list(
            CustomerAccount.objects.select_related("customer", "customer__branch")
            .filter(customer__isnull=False)
            .order_by("account_number")
        )

        if limit:
            accounts = accounts[:limit]

        if not accounts:
            raise CommandError(
                "Không có CustomerAccount nào để gắn cuộc gọi. "
                "Hãy seed khách hàng và tài khoản trước."
            )

        employees_by_branch = {}

        for employee in Employee.objects.filter(status="ACTIVE").order_by("employee_code"):
            employees_by_branch.setdefault(employee.branch_id, []).append(employee)

        if not employees_by_branch:
            raise CommandError("Không có nhân viên ACTIVE nào để gán cuộc gọi.")

        if options["reset"]:
            deleted_count, _ = CallLog.objects.filter(
                external_call_id__startswith=EXTERNAL_CALL_ID_PREFIX
            ).delete()

            self.stdout.write(
                self.style.WARNING(f"Đã xóa {deleted_count} cuộc gọi mẫu cũ.")
            )

        rng = random.Random(20260814)
        now = timezone.now()
        earliest = now - timedelta(days=MONTHS_BACK * 30)

        # Gom ticket theo khách một lượt thay vì query trong vòng lặp.
        tickets_by_customer = {}

        for ticket_id, customer_id in Ticket.objects.filter(
            customer_id__in=[account.customer_id for account in accounts]
        ).values_list("id", "customer_id"):
            tickets_by_customer.setdefault(customer_id, []).append(ticket_id)

        created_count = 0
        skipped_count = 0
        missed_count = 0

        for account in accounts:
            customer = account.customer
            branch = customer.branch
            employees = employees_by_branch.get(
                branch.id if branch else None
            ) or next(iter(employees_by_branch.values()))

            customer_tickets = tickets_by_customer.get(customer.id, [])

            for call_index in range(1, rng.randint(0, max_calls) + 1):
                external_call_id = (
                    f"{EXTERNAL_CALL_ID_PREFIX}{account.account_number}-{call_index:03d}"
                )

                if CallLog.objects.filter(external_call_id=external_call_id).exists():
                    skipped_count += 1
                    continue

                call_time = earliest + timedelta(
                    seconds=rng.randint(0, int((now - earliest).total_seconds()))
                )
                call_time = call_time.replace(
                    hour=rng.randint(8, 17), minute=rng.randint(0, 59)
                )

                is_missed = rng.random() < MISSED_CALL_RATE

                if is_missed:
                    missed_count += 1

                employee = rng.choice(employees)

                CallLog.objects.create(
                    ticket_id=rng.choice(customer_tickets) if customer_tickets else None,
                    customer=customer,
                    customer_account=account,
                    employee=employee,
                    branch=branch or employee.branch,
                    call_time=call_time,
                    duration_seconds=0 if is_missed else rng.randint(30, 600),
                    call_direction=rng.choice(DIRECTIONS),
                    phone_number=customer.phone,
                    source_system=rng.choice(SOURCE_SYSTEMS),
                    external_call_id=external_call_id,
                    note=(
                        "Khách không nghe máy." if is_missed else rng.choice(NOTES)
                    ),
                    created_at=call_time,
                )

                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT TẠO LỊCH SỬ CUỘC GỌI MẪU ===\n"
                f"- Khách hàng xử lý: {len(accounts)}\n"
                f"- Cuộc gọi tạo mới: {created_count}\n"
                f"- Trong đó gọi nhỡ: {missed_count}\n"
                f"- Bỏ qua (đã tồn tại): {skipped_count}"
            )
        )
