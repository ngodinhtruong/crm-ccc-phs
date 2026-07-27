import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.branches.models import Branch, Employee
from apps.customers.models import (
    Customer,
    CustomerEmployeeAssignment,
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)


LAST_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
    "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý",
]

MIDDLE_NAMES = [
    "Văn", "Thị", "Minh", "Quốc", "Thanh", "Ngọc", "Hoàng", "Gia",
    "Đức", "Thu", "Hồng", "Xuân", "Khánh", "Anh",
]

FIRST_NAMES = [
    "An", "Bình", "Châu", "Dũng", "Đạt", "Đức", "Giang", "Hà", "Hải", "Hạnh",
    "Hiếu", "Hoài", "Hùng", "Hương", "Khánh", "Khoa", "Lan", "Linh", "Long",
    "Mai", "Minh", "Nam", "Nga", "Ngân", "Ngọc", "Nhân", "Phát", "Phong",
    "Phúc", "Phương", "Quân", "Quang", "Quỳnh", "Sơn", "Tâm", "Thảo", "Thành",
    "Thiện", "Thu", "Trang", "Trí", "Trung", "Tuấn", "Uyên", "Việt", "Vy",
]

HCMC_DISTRICTS = [
    ("Quận 1", "Phường Bến Nghé"),
    ("Quận 3", "Phường Võ Thị Sáu"),
    ("Quận 4", "Phường 6"),
    ("Quận 5", "Phường 7"),
    ("Quận 7", "Phường Tân Phong"),
    ("Quận 8", "Phường 5"),
    ("Quận 10", "Phường 12"),
    ("Quận 11", "Phường 8"),
    ("Quận Bình Thạnh", "Phường 25"),
    ("Quận Tân Bình", "Phường 4"),
    ("Thành phố Thủ Đức", "Phường An Khánh"),
]


class Command(BaseCommand):
    help = (
        "Tạo 100 khách hàng mẫu thuộc HS_Q7 và giao cho "
        "nhân viên CCC HOQ7_CCC_STAFF."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Số khách hàng cần tạo, mặc định 100.",
        )
        parser.add_argument(
            "--employee-code",
            type=str,
            default="HOQ7_CCC_STAFF",
            help="Mã nhân viên CCC nhận khách hàng.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa các khách hàng có mã FAKE_HSQ7_* trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        employee_code = options["employee_code"]
        reset = options["reset"]

        if count <= 0:
            raise CommandError("--count phải lớn hơn 0.")

        branch = Branch.objects.filter(
            branch_code="HS_Q7",
            status="ACTIVE",
        ).first()

        if branch is None:
            raise CommandError(
                "Không tìm thấy chi nhánh HS_Q7 đang hoạt động. "
                "Hãy chạy command seed chi nhánh trước."
            )

        employee = Employee.objects.select_related("branch").filter(
            employee_code=employee_code,
            branch=branch,
            status="ACTIVE",
        ).first()

        if employee is None:
            raise CommandError(
                f"Không tìm thấy nhân viên CCC {employee_code} tại HS_Q7. "
                "Hãy chạy command seed nhân viên trước."
            )

        customer_types = list(
            CustomerType.objects.filter(is_active=True)
        )
        sources = list(
            CustomerSource.objects.filter(is_active=True)
        )
        ratings = list(
            CustomerRating.objects.filter(is_active=True)
        )
        membership_tiers = list(
            MembershipTier.objects.filter(is_active=True)
        )

        if not customer_types:
            raise CommandError(
                "Chưa có CustomerType. Hãy chạy command seed master khách hàng trước."
            )

        if reset:
            deleted_count, _ = Customer.objects.filter(
                customer_code__startswith="FAKE_HSQ7_"
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Đã xóa {deleted_count} bản ghi liên quan đến khách hàng mẫu cũ."
                )
            )

        rng = random.Random(20260727)
        now = timezone.now()

        created_count = 0
        updated_count = 0
        assignment_created_count = 0
        assignment_updated_count = 0

        individual_type = next(
            (
                item
                for item in customer_types
                if item.type_code == "INDIVIDUAL"
            ),
            customer_types[0],
        )

        for index in range(1, count + 1):
            customer_code = f"FAKE_HSQ7_{index:04d}"
            full_name = self.build_full_name(rng)
            district, ward = rng.choice(HCMC_DISTRICTS)
            gender = rng.choice(["MALE", "FEMALE"])
            date_of_birth = self.random_birth_date(rng)

            source = rng.choice(sources) if sources else None
            rating = rng.choice(ratings) if ratings else None

            # Khoảng 75% khách hàng được xếp hạng thành viên.
            membership_tier = (
                rng.choice(membership_tiers)
                if membership_tiers and rng.random() < 0.75
                else None
            )

            customer, created = Customer.objects.update_or_create(
                customer_code=customer_code,
                defaults={
                    "external_customer_id": f"EXT-HSQ7-{index:06d}",
                    "customer_type": individual_type,
                    "salutation": "Ông" if gender == "MALE" else "Bà",
                    "full_name": full_name,
                    "identity_number": f"0792{index:08d}",
                    "date_of_birth": date_of_birth,
                    "gender": gender,
                    "phone": f"09{index:08d}",
                    "email": f"fake.hsq7.{index:04d}@example.com",
                    "branch": branch,
                    "company": None,
                    "source": source,
                    "rating": rating,
                    "membership_tier": membership_tier,
                    "address": f"{rng.randint(1, 999)} Đường Nguyễn Văn Linh",
                    "country": "Việt Nam",
                    "province": "TP. Hồ Chí Minh",
                    "district": district,
                    "ward": ward,
                    "description": "Khách hàng mẫu phục vụ kiểm thử hệ thống.",
                    "status": "ACTIVE",
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            # Chỉ giữ một phân công hiện tại cho mỗi khách hàng mẫu.
            CustomerEmployeeAssignment.objects.filter(
                customer=customer,
                is_current=True,
            ).exclude(
                employee=employee,
                role_type="OWNER",
            ).update(
                is_current=False,
                unassigned_at=now,
                transfer_reason="Cập nhật dữ liệu seed khách hàng HS_Q7.",
            )

            assignment, assignment_created = (
                CustomerEmployeeAssignment.objects.update_or_create(
                    customer=customer,
                    employee=employee,
                    role_type="OWNER",
                    defaults={
                        "assigned_by_user": None,
                        "assigned_at": now,
                        "unassigned_at": None,
                        "is_current": True,
                        "transfer_reason": None,
                        "note": "Phân công khách hàng mẫu cho CCC HS_Q7.",
                    },
                )
            )

            if assignment_created:
                assignment_created_count += 1
            else:
                assignment_updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT TẠO KHÁCH HÀNG MẪU ===\n"
                f"- Chi nhánh: {branch.branch_code} - {branch.branch_name}\n"
                f"- Nhân viên phụ trách: {employee.employee_code} - {employee.full_name}\n"
                f"- Khách hàng tạo mới: {created_count}\n"
                f"- Khách hàng cập nhật: {updated_count}\n"
                f"- Phân công tạo mới: {assignment_created_count}\n"
                f"- Phân công cập nhật: {assignment_updated_count}"
            )
        )

    @staticmethod
    def build_full_name(rng):
        return (
            f"{rng.choice(LAST_NAMES)} "
            f"{rng.choice(MIDDLE_NAMES)} "
            f"{rng.choice(FIRST_NAMES)}"
        )

    @staticmethod
    def random_birth_date(rng):
        today = date.today()
        youngest = today - timedelta(days=18 * 365)
        oldest = today - timedelta(days=65 * 365)
        number_of_days = (youngest - oldest).days
        return oldest + timedelta(days=rng.randint(0, number_of_days))
