from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User, UserBranchAccess, UserRole
from apps.branches.models import Branch, Employee


BRANCH_EMPLOYEE_DATA = {
    "HS_Q7": [
        {
            "employee_code": "HOQ7_CCC_SUP",
            "full_name": "Nguyễn Văn An",
            "email": "ccc.supervisor@phs.vn",
            "phone": "0901000001",
            "department": "CCC",
            "position": "Giám sát CCC",
            "username": "ccc.supervisor",
            "role_code": "CS_SUPERVISOR",
        },
        {
            "employee_code": "HOQ7_CCC_STAFF",
            "full_name": "Trần Thị Bình",
            "email": "ccc.staff@phs.vn",
            "phone": "0901000002",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "ccc.staff",
            "role_code": "CS_STAFF",
        },
    ],
    "CN_Q1": [
        {
            "employee_code": "Q1_SA_SUP",
            "full_name": "Lê Minh Châu",
            "email": "q1.sa.supervisor@phs.vn",
            "phone": "0901000003",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "q1.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "Q1_SA_STAFF",
            "full_name": "Phạm Quốc Dũng",
            "email": "q1.sa.staff@phs.vn",
            "phone": "0901000004",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "q1.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
    "CN_Q3": [
        {
            "employee_code": "Q3_SA_SUP",
            "full_name": "Hoàng Gia Huy",
            "email": "q3.sa.supervisor@phs.vn",
            "phone": "0901000005",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "q3.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "Q3_SA_STAFF",
            "full_name": "Võ Thanh Hà",
            "email": "q3.sa.staff@phs.vn",
            "phone": "0901000006",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "q3.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
    "CN_TB": [
        {
            "employee_code": "TB_SA_SUP",
            "full_name": "Đặng Đức Khang",
            "email": "tanbinh.sa.supervisor@phs.vn",
            "phone": "0901000007",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "tanbinh.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "TB_SA_STAFF",
            "full_name": "Bùi Ngọc Lan",
            "email": "tanbinh.sa.staff@phs.vn",
            "phone": "0901000008",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "tanbinh.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
    "CN_TX": [
        {
            "employee_code": "TX_SA_SUP",
            "full_name": "Phan Quốc Minh",
            "email": "thanhxuan.sa.supervisor@phs.vn",
            "phone": "0901000009",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "thanhxuan.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "TX_SA_STAFF",
            "full_name": "Nguyễn Thu Nga",
            "email": "thanhxuan.sa.staff@phs.vn",
            "phone": "0901000010",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "thanhxuan.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
    "CN_HN": [
        {
            "employee_code": "HN_SA_SUP",
            "full_name": "Trịnh Hoàng Nam",
            "email": "hanoi.sa.supervisor@phs.vn",
            "phone": "0901000011",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "hanoi.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "HN_SA_STAFF",
            "full_name": "Đỗ Thị Oanh",
            "email": "hanoi.sa.staff@phs.vn",
            "phone": "0901000012",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "hanoi.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
    "CN_HP": [
        {
            "employee_code": "HP_SA_SUP",
            "full_name": "Vũ Thành Phong",
            "email": "haiphong.sa.supervisor@phs.vn",
            "phone": "0901000013",
            "department": "SALE_ADMIN",
            "position": "Giám sát Sale Admin",
            "username": "haiphong.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
        {
            "employee_code": "HP_SA_STAFF",
            "full_name": "Lý Minh Trang",
            "email": "haiphong.sa.staff@phs.vn",
            "phone": "0901000014",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "haiphong.sa.staff",
            "role_code": "SA_STAFF",
        },
    ],
}


class Command(BaseCommand):
    help = "Seed chi nhánh, nhân viên mẫu và tài khoản cho từng nhân viên"

    @transaction.atomic
    def handle(self, *args, **options):
        roles = self.seed_roles()

        employee_created_count = 0
        user_created_count = 0

        for branch_code, employees in BRANCH_EMPLOYEE_DATA.items():
            try:
                branch = Branch.objects.get(branch_code=branch_code)
            except Branch.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"Bỏ qua {branch_code}: chưa tồn tại chi nhánh"
                    )
                )
                continue

            for item in employees:
                employee, employee_created = Employee.objects.update_or_create(
                    employee_code=item["employee_code"],
                    defaults={
                        "full_name": item["full_name"],
                        "email": item["email"],
                        "phone": item["phone"],
                        "branch": branch,
                        "department": item["department"],
                        "position": item["position"],
                        "status": "ACTIVE",
                    },
                )

                if employee_created:
                    employee_created_count += 1

                user, user_created = User.objects.update_or_create(
                    username=item["username"],
                    defaults={
                        "email": item["email"],
                        "employee": employee,
                        "status": "ACTIVE",
                        "is_active": True,
                    },
                )

                if user_created:
                    user_created_count += 1

                role = roles[item["role_code"]]

                # Mỗi tài khoản mẫu chỉ giữ đúng vai trò được khai báo.
                UserRole.objects.filter(user=user).exclude(role=role).delete()

                UserRole.objects.get_or_create(
                    user=user,
                    role=role,
                    defaults={
                        "created_at": timezone.now(),
                    },
                )

                # Chỉ cho phép truy cập đúng chi nhánh của nhân viên.
                UserBranchAccess.objects.filter(user=user).exclude(
                    branch=branch
                ).delete()

                UserBranchAccess.objects.get_or_create(
                    user=user,
                    branch=branch,
                    defaults={
                        "created_at": timezone.now(),
                    },
                )

                self.stdout.write(
                    f"{employee.employee_code} | "
                    f"{employee.full_name} | "
                    f"{branch.branch_code} | "
                    f"{role.role_code}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                "\nSeed nhân viên hoàn tất:\n"
                f"- Nhân viên tạo mới: {employee_created_count}\n"
                f"- Tài khoản tạo mới: {user_created_count}"
            )
        )

    def seed_roles(self):
        role_data = [
            {
                "role_code": "CS_STAFF",
                "role_name": "Nhân viên chăm sóc khách hàng",
                "scope_type": "OWN",
                "group_code": Role.GROUP_CCC,
            },
            {
                "role_code": "CS_SUPERVISOR",
                "role_name": "Giám sát chăm sóc khách hàng",
                "scope_type": "BRANCH",
                "group_code": Role.GROUP_CCC,
            },
            {
                "role_code": "SA_STAFF",
                "role_name": "Nhân viên Sale Admin",
                "scope_type": "OWN",
                "group_code": Role.GROUP_SALE_ADMIN,
            },
            {
                "role_code": "SA_SUPERVISOR",
                "role_name": "Giám sát Sale Admin",
                "scope_type": "BRANCH",
                "group_code": Role.GROUP_SALE_ADMIN,
            },
        ]

        roles = {}

        for item in role_data:
            role, _ = Role.objects.update_or_create(
                role_code=item["role_code"],
                defaults={
                    "role_name": item["role_name"],
                    "scope_type": item["scope_type"],
                    "group_code": item["group_code"],
                },
            )

            roles[role.role_code] = role

        return roles