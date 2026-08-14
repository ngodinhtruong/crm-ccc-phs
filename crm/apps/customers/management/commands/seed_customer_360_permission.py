"""
Cấp quyền xem Customer 360 cho các role đang có trong hệ thống.

Tách riêng khỏi ``seed_sa_permissions``: lệnh kia dựng cả 11 permission và 6
role mới (gồm SYSTEM_ADMIN) — đúng cho lần khởi tạo hệ thống, nhưng quá rộng
khi chỉ cần mở một màn hình. Lệnh này chạm đúng một permission.

Chạy lại nhiều lần không nhân bản: permission tra theo mã, còn role-permission
có ràng buộc duy nhất trên cặp (role, permission).
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Permission, Role, RolePermission
from apps.common.constants import PermissionCode

# Các role được xem 360. Cố ý liệt kê tường minh thay vì cấp cho mọi role:
# màn này gộp cả lịch sử giao dịch lẫn điểm khảo sát của khách, không phải
# thông tin ai đăng nhập cũng nên đọc được.
TARGET_ROLE_CODES = [
    "CS_STAFF",
    "CS_SUPERVISOR",
    "SA_STAFF",
    "SA_SUPERVISOR",
]


class Command(BaseCommand):
    help = "Cấp quyền CUSTOMER_360_VIEW cho các role nghiệp vụ đang có."

    def add_arguments(self, parser):
        parser.add_argument(
            "--roles",
            nargs="*",
            default=TARGET_ROLE_CODES,
            help=f"Danh sách role code, mặc định: {' '.join(TARGET_ROLE_CODES)}",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ liệt kê việc sẽ làm, không ghi vào database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        role_codes = options["roles"]
        dry_run = options["dry_run"]

        permission = Permission.objects.filter(
            permission_code=PermissionCode.CUSTOMER_360_VIEW
        ).first()

        if permission is None:
            self.stdout.write(
                f"Sẽ tạo permission {PermissionCode.CUSTOMER_360_VIEW}"
            )

            if not dry_run:
                permission = Permission.objects.create(
                    permission_code=PermissionCode.CUSTOMER_360_VIEW,
                    permission_name="Xem Customer 360",
                    module_code="CUSTOMER",
                    action_code="VIEW_360",
                    is_active=True,
                )
        else:
            self.stdout.write(
                f"Permission {permission.permission_code} đã có (id={permission.id})"
            )

            if not permission.is_active and not dry_run:
                permission.is_active = True
                permission.save(update_fields=["is_active", "updated_at"])
                self.stdout.write(self.style.WARNING("  → đã bật lại is_active"))

        granted = []
        already = []
        missing = []

        for role_code in role_codes:
            role = Role.objects.filter(role_code=role_code).first()

            if role is None:
                missing.append(role_code)
                continue

            if permission is not None and RolePermission.objects.filter(
                role=role, permission=permission
            ).exists():
                already.append(role_code)
                continue

            granted.append(role_code)

            if not dry_run and permission is not None:
                RolePermission.objects.create(role=role, permission=permission)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== {'THỬ CHẠY' if dry_run else 'HOÀN TẤT'} CẤP QUYỀN 360 ===\n"
                f"- Cấp mới: {', '.join(granted) or 'không có'}\n"
                f"- Đã có sẵn: {', '.join(already) or 'không có'}\n"
                f"- Không tìm thấy role: {', '.join(missing) or 'không có'}"
            )
        )
