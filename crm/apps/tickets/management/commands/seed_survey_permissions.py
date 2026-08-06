"""
Cấp quyền khảo sát CSAT cho admin và CCC.

    python manage.py seed_survey_permissions
    python manage.py seed_survey_permissions --scope BRANCH

Chỉ nhóm CCC (``Role.group_code = "CCC"``) và quản trị hệ thống được nhập
khảo sát. Lệnh cấp thêm ``TICKET_VIEW`` vì màn hình khảo sát phải tra ra
ticket của khách; không có quyền đó thì tìm mãi không ra ticket nào và người
nhập tưởng chức năng hỏng.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Permission, Role, RolePermission, UserRole
from apps.common.constants import PermissionCode, ScopeType

# (mã, tên, module, hành động)
SURVEY_PERMISSIONS = (
    (PermissionCode.SURVEY_VIEW, "Xem kết quả khảo sát", "SURVEY", "VIEW"),
    (PermissionCode.SURVEY_ENTRY, "Nhập kết quả khảo sát", "SURVEY", "ENTRY"),
    (PermissionCode.SURVEY_UPDATE, "Sửa kết quả khảo sát", "SURVEY", "UPDATE"),
    (PermissionCode.TICKET_VIEW, "Xem ticket", "TICKET", "VIEW"),
)

# Nhóm vai trò được nhập khảo sát. Dùng group_code thay vì liệt kê tên vai
# trò: dự án đang có cả CS_STAFF lẫn CCC_STAFF cho cùng một đội.
ENTRY_ROLE_GROUPS = ("CCC", "GLOBAL")

# Vai trò quản trị nằm ngoài nhóm CCC nhưng vẫn phải nhập được.
ENTRY_ROLE_CODES = ("SYSTEM_ADMIN", "CCC_ADMIN", "CS_MANAGER")


class Command(BaseCommand):
    help = "Cấp quyền xem/nhập khảo sát CSAT cho admin và CCC"

    def add_arguments(self, parser):
        parser.add_argument(
            "--scope",
            default=ScopeType.ALL,
            choices=[
                ScopeType.OWN,
                ScopeType.ORGANIZATION_UNIT,
                ScopeType.BRANCH,
                ScopeType.MULTI_BRANCH,
                ScopeType.ALL,
            ],
            help=(
                "Phạm vi ticket gán cho các user CCC chưa có phạm vi. "
                "ALL = thấy mọi ticket; BRANCH = chỉ chi nhánh của mình."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ in ra những gì sẽ đổi, không ghi vào DB.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        scope = options["scope"]
        dry_run = options["dry_run"]

        permissions = {}

        for code, name, module_code, action_code in SURVEY_PERMISSIONS:
            permission, created = Permission.objects.update_or_create(
                permission_code=code,
                defaults={
                    "permission_name": name,
                    "module_code": module_code,
                    "action_code": action_code,
                    "is_active": True,
                },
            )
            permissions[code] = permission
            self.stdout.write(
                f"  quyền {code:14} {'tạo mới' if created else 'đã có'}"
            )

        roles = Role.objects.filter(is_active=True).filter(
            group_code__in=ENTRY_ROLE_GROUPS
        ) | Role.objects.filter(role_code__in=ENTRY_ROLE_CODES)
        roles = roles.distinct()

        if not roles:
            self.stdout.write(
                self.style.WARNING(
                    "Không tìm thấy vai trò CCC nào (group_code='CCC'). "
                    "Kiểm tra lại bảng roles."
                )
            )
            return

        self.stdout.write("\nGán quyền cho vai trò:")

        for role in roles:
            for code, permission in permissions.items():
                _, created = RolePermission.objects.get_or_create(
                    role=role, permission=permission
                )
                if created:
                    self.stdout.write(f"  + {role.role_code:16} {code}")

        # Không có phạm vi thì filter_tickets_by_user trả về rỗng, người dùng
        # có quyền nhập nhưng tra không ra ticket nào.
        blank_scope = UserRole.objects.filter(
            role__in=roles, is_active=True, scope_type=""
        )

        self.stdout.write(
            f"\nUser CCC chưa có phạm vi: {blank_scope.count()} -> gán {scope}"
        )

        for assignment in blank_scope.select_related("user", "role"):
            self.stdout.write(
                f"  {assignment.user.username:18} {assignment.role.role_code}"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("\n--dry-run: không ghi gì."))
            transaction.set_rollback(True)
            return

        blank_scope.update(scope_type=scope)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nXong. {roles.count()} vai trò được cấp quyền khảo sát."
            )
        )
