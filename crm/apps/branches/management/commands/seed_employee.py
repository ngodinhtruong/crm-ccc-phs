from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User, UserBranchAccess, UserRole
from apps.branches.models import Branch, Employee, OrganizationUnit, EmployeeOrganizationMembership


BRANCH_EMPLOYEE_DATA = {
    "HS_Q7": [
        {
            "employee_code": "HOQ7_CCC_STAFF",
            "full_name": "Trần Thị Bình",
            "email": "ccc.staff@phs.vn",
            "phone": "0901000001",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "HOQ7_SA_STAFF",
            "full_name": "Nguyễn Văn Hùng",
            "email": "hoq7.sa.staff@phs.vn",
            "phone": "0901000002",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "hoq7.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "HOQ7_CCC_SUP",
            "full_name": "Nguyễn Văn An",
            "email": "ccc.supervisor@phs.vn",
            "phone": "0901000003",
            "department": "CCC",
            "position": "Giám sát Hội sở Q7",
            "username": "ccc.supervisor",
            "role_code": "CS_SUPERVISOR",
        },
    ],
    "CN_Q1": [
        {
            "employee_code": "Q1_CCC_STAFF",
            "full_name": "Phạm Văn Minh",
            "email": "q1.ccc.staff@phs.vn",
            "phone": "0901000004",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "q1.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "Q1_SA_STAFF",
            "full_name": "Phạm Quốc Dũng",
            "email": "q1.sa.staff@phs.vn",
            "phone": "0901000005",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "q1.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "Q1_SA_SUP",
            "full_name": "Lê Minh Châu",
            "email": "q1.sa.supervisor@phs.vn",
            "phone": "0901000006",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Q1",
            "username": "q1.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
    "CN_Q3": [
        {
            "employee_code": "Q3_CCC_STAFF",
            "full_name": "Nguyễn Thị Phương",
            "email": "q3.ccc.staff@phs.vn",
            "phone": "0901000007",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "q3.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "Q3_SA_STAFF",
            "full_name": "Võ Thanh Hà",
            "email": "q3.sa.staff@phs.vn",
            "phone": "0901000008",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "q3.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "Q3_SA_SUP",
            "full_name": "Hoàng Gia Huy",
            "email": "q3.sa.supervisor@phs.vn",
            "phone": "0901000009",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Q3",
            "username": "q3.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
    "CN_TB": [
        {
            "employee_code": "TB_CCC_STAFF",
            "full_name": "Lê Hoàng Đức",
            "email": "tanbinh.ccc.staff@phs.vn",
            "phone": "0901000010",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "tanbinh.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "TB_SA_STAFF",
            "full_name": "Bùi Ngọc Lan",
            "email": "tanbinh.sa.staff@phs.vn",
            "phone": "0901000011",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "tanbinh.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "TB_SA_SUP",
            "full_name": "Đặng Đức Khang",
            "email": "tanbinh.sa.supervisor@phs.vn",
            "phone": "0901000012",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Tân Bình",
            "username": "tanbinh.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
    "CN_TX": [
        {
            "employee_code": "TX_CCC_STAFF",
            "full_name": "Vũ Thu Trang",
            "email": "thanhxuan.ccc.staff@phs.vn",
            "phone": "0901000013",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "thanhxuan.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "TX_SA_STAFF",
            "full_name": "Nguyễn Thu Nga",
            "email": "thanhxuan.sa.staff@phs.vn",
            "phone": "0901000014",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "thanhxuan.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "TX_SA_SUP",
            "full_name": "Phan Quốc Minh",
            "email": "thanhxuan.sa.supervisor@phs.vn",
            "phone": "0901000015",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Thanh Xuân",
            "username": "thanhxuan.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
    "CN_HN": [
        {
            "employee_code": "HN_CCC_STAFF",
            "full_name": "Trần Anh Tuấn",
            "email": "hanoi.ccc.staff@phs.vn",
            "phone": "0901000016",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "hanoi.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "HN_SA_STAFF",
            "full_name": "Đỗ Thị Oanh",
            "email": "hanoi.sa.staff@phs.vn",
            "phone": "0901000017",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "hanoi.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "HN_SA_SUP",
            "full_name": "Trịnh Hoàng Nam",
            "email": "hanoi.sa.supervisor@phs.vn",
            "phone": "0901000018",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Hà Nội",
            "username": "hanoi.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
    "CN_HP": [
        {
            "employee_code": "HP_CCC_STAFF",
            "full_name": "Đặng Bảo Ngọc",
            "email": "haiphong.ccc.staff@phs.vn",
            "phone": "0901000019",
            "department": "CCC",
            "position": "Nhân viên CCC",
            "username": "haiphong.ccc.staff",
            "role_code": "CS_STAFF",
        },
        {
            "employee_code": "HP_SA_STAFF",
            "full_name": "Lý Minh Trang",
            "email": "haiphong.sa.staff@phs.vn",
            "phone": "0901000020",
            "department": "SALE_ADMIN",
            "position": "Nhân viên Sale Admin",
            "username": "haiphong.sa.staff",
            "role_code": "SA_STAFF",
        },
        {
            "employee_code": "HP_SA_SUP",
            "full_name": "Vũ Thành Phong",
            "email": "haiphong.sa.supervisor@phs.vn",
            "phone": "0901000021",
            "department": "SALE_ADMIN",
            "position": "Giám sát Chi nhánh Hải Phòng",
            "username": "haiphong.sa.supervisor",
            "role_code": "SA_SUPERVISOR",
        },
    ],
}


class Command(BaseCommand):
    help = "Seed lại nhân viên mẫu: Mỗi chi nhánh gồm 1 CCC, 1 SA và 1 Supervisor (Tổng 21 nhân viên/tài khoản)."

    @transaction.atomic
    def handle(self, *args, **options):
        roles = self.seed_roles()

        employee_created_count = 0
        user_created_count = 0

        active_codes = []

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
                active_codes.append(item["employee_code"])

                employee, employee_created = Employee.objects.update_or_create(
                    employee_code=item["employee_code"],
                    defaults={
                        "full_name": item["full_name"],
                        "email": item["email"],
                        "phone": item["phone"],
                        "branch": branch,
                        "position": item["position"],
                        "status": "ACTIVE",
                    },
                )

                if employee_created:
                    employee_created_count += 1

                unit_code = f"{item['department']}_{branch.branch_code}"
                unit = OrganizationUnit.objects.filter(unit_code=unit_code).first()
                if unit is None:
                    unit = OrganizationUnit.objects.filter(unit_code=item["department"]).first()
                if unit is None:
                    raise RuntimeError(f"Chưa seed organization unit {unit_code}")

                EmployeeOrganizationMembership.objects.filter(
                    employee=employee,
                    is_active=True,
                    is_primary=True,
                ).exclude(organization_unit=unit).update(is_primary=False)

                EmployeeOrganizationMembership.objects.update_or_create(
                    employee=employee,
                    organization_unit=unit,
                    defaults={
                        "responsibility": "SUPERVISOR" if "SUP" in item["employee_code"] else "STAFF",
                        "is_primary": True,
                        "is_active": True,
                        "joined_at": timezone.now(),
                        "left_at": None,
                    },
                )

                user, user_created = User.objects.update_or_create(
                    username=item["username"],
                    defaults={
                        "email": item["email"],
                        "employee": employee,
                        "status": "ACTIVE",
                        "is_active": True,
                    },
                )

                # Cài mật khẩu mặc định 123456 nếu tài khoản mới hoặc chưa có mật khẩu
                if user_created or not user.has_usable_password():
                    user.set_password("123456")
                    user.save()

                if user_created:
                    user_created_count += 1

                role = roles[item["role_code"]]

                # Mỗi tài khoản mẫu giữ đúng một role assignment và luôn
                # cập nhật lại scope khi command được chạy lại.
                UserRole.objects.filter(user=user).delete()
                UserRole.objects.create(
                    user=user,
                    role=role,
                    scope_type=role.default_scope_type,
                    branch=branch if role.default_scope_type == "BRANCH" else None,
                    organization_unit=(
                        unit if role.default_scope_type == "ORGANIZATION_UNIT" else None
                    ),
                    include_descendants=(
                        role.default_scope_type == "ORGANIZATION_UNIT"
                    ),
                    is_active=True,
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                )

                # Gán quyền truy cập chi nhánh.
                UserBranchAccess.objects.filter(user=user).exclude(
                    branch=branch
                ).delete()

                UserBranchAccess.objects.get_or_create(
                    user=user,
                    branch=branch,
                    defaults={
                        "is_active": True,
                        "created_at": timezone.now(),
                        "updated_at": timezone.now(),
                    },
                )

                self.stdout.write(
                    f"{employee.employee_code:<18} | "
                    f"{employee.full_name:<20} | "
                    f"{branch.branch_code:<8} | "
                    f"{role.role_code}"
                )

        # Chuyển trạng thái các nhân viên cũ ngoài 21 nhân viên mẫu sang INACTIVE
        deactivated = Employee.objects.exclude(
            employee_code__in=active_codes
        ).update(status="INACTIVE")

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT SEED NHÂN VIÊN (3 NV/CHI NHÁNH) ===\n"
                f"- Số chi nhánh: {len(BRANCH_EMPLOYEE_DATA)}\n"
                f"- Tổng số nhân viên active: {len(active_codes)}\n"
                f"- Nhân viên tạo mới: {employee_created_count}\n"
                f"- Tài khoản tạo mới: {user_created_count}\n"
                f"- Nhân viên cũ ngưng hoạt động (INACTIVE): {deactivated}"
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
                "scope_type": "ORGANIZATION_UNIT",
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
                    "default_scope_type": item["scope_type"],
                    "is_active": True,
                    "group_code": item["group_code"],
                },
            )

            roles[role.role_code] = role

        return roles