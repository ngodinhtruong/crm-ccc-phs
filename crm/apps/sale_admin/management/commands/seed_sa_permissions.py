from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Permission, Role, RolePermission


class Command(BaseCommand):
    help = "Seed Sale Admin roles and permissions"

    def handle(self, *args, **options):
        now = timezone.now()

        permissions = [
            ("SA_RECORD_VIEW", "Xem SA Record", "SALE_ADMIN", "VIEW"),
            ("SA_RECORD_CREATE", "Tạo SA Record", "SALE_ADMIN", "CREATE"),
            ("SA_RECORD_UPDATE", "Sửa SA Record", "SALE_ADMIN", "UPDATE"),
            ("SA_RECORD_DELETE", "Xóa SA Record", "SALE_ADMIN", "DELETE"),
            ("SA_RECORD_IMPORT", "Import SA Record", "SALE_ADMIN", "IMPORT"),
            ("SA_RECORD_AUDIT_VIEW", "Xem lịch sử SA Record", "SALE_ADMIN", "AUDIT_VIEW"),

            ("SA_KPI_VIEW_SELF", "Xem KPI cá nhân Sale Admin", "SALE_ADMIN", "KPI_VIEW_SELF"),
            ("SA_KPI_VIEW_BRANCH", "Xem KPI chi nhánh Sale Admin", "SALE_ADMIN", "KPI_VIEW_BRANCH"),
            ("SA_KPI_CONFIG", "Cấu hình KPI Sale Admin", "SALE_ADMIN", "KPI_CONFIG"),
            ("SA_DASHBOARD_VIEW", "Xem dashboard Sale Admin", "SALE_ADMIN", "DASHBOARD_VIEW"),

            ("CUSTOMER_360_VIEW", "Xem Customer 360", "CUSTOMER", "VIEW_360"),
        ]

        permission_map = {}

        for code, name, module_code, action_code in permissions:
            permission, _ = Permission.objects.update_or_create(
                permission_code=code,
                defaults={
                    "permission_name": name,
                    "module_code": module_code,
                    "action_code": action_code,
                    "is_active": True,
                },
            )
            permission_map[code] = permission

        roles = {
            "SA_STAFF": {
                "role_name": "Sale Admin Staff",
                "default_scope_type": "OWN",
                "group_code": "SALE_ADMIN",
                "is_active": True,
            },
            "SA_SUPERVISOR": {
                "role_name": "Sale Admin Supervisor",
                "default_scope_type": "BRANCH",
                "group_code": "SALE_ADMIN",
                "is_active": True,
            },
            "CCC_STAFF": {
                "role_name": "CCC Staff",
                "default_scope_type": "OWN",
                "group_code": "CCC",
                "is_active": True,
            },
            "CCC_SUPERVISOR": {
                "role_name": "CCC Supervisor",
                "default_scope_type": "ORGANIZATION_UNIT",
                "group_code": "CCC",
                "is_active": True,
            },
            "SYSTEM_ADMIN": {
                "role_name": "System Admin",
                "default_scope_type": "ALL",
                "group_code": "GLOBAL",
                "is_active": True,
            },
        }

        role_map = {}

        for code, data in roles.items():
            role, _ = Role.objects.update_or_create(
                role_code=code,
                defaults=data,
            )
            role_map[code] = role

        role_permissions = {
            "SA_STAFF": [
                "SA_RECORD_VIEW",
                "SA_RECORD_CREATE",
                "SA_RECORD_UPDATE",
                "SA_RECORD_IMPORT",
                "SA_RECORD_AUDIT_VIEW",
                "SA_KPI_VIEW_SELF",
                "CUSTOMER_360_VIEW",
            ],
            "SA_SUPERVISOR": [
                "SA_RECORD_VIEW",
                "SA_RECORD_AUDIT_VIEW",
                "SA_KPI_VIEW_SELF",
                "SA_KPI_VIEW_BRANCH",
                "SA_DASHBOARD_VIEW",
                "CUSTOMER_360_VIEW",
            ],
            "CCC_STAFF": [
                "SA_RECORD_VIEW",
                "CUSTOMER_360_VIEW",
            ],
            "CCC_SUPERVISOR": [
                "SA_RECORD_VIEW",
                "SA_RECORD_AUDIT_VIEW",
                "SA_KPI_VIEW_BRANCH",
                "SA_DASHBOARD_VIEW",
                "CUSTOMER_360_VIEW",
            ],
            "SYSTEM_ADMIN": list(permission_map.keys()),
        }

        for role_code, permission_codes in role_permissions.items():
            role = role_map.get(role_code)

            if not role:
                continue

            for permission_code in permission_codes:
                permission = permission_map.get(permission_code)

                if not permission:
                    continue

                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                    defaults={
                        "created_at": now,
                    },
                )

        # Nếu hệ thống cũ đang dùng CS_* thay vì CCC_*, cấp thêm quyền xem Sale Admin cho các role đó nếu tồn tại.
        legacy_ccc_role_permissions = {
            "CS_STAFF": role_permissions["CCC_STAFF"],
            "CS_SUPERVISOR": role_permissions["CCC_SUPERVISOR"],
        }

        for role_code, permission_codes in legacy_ccc_role_permissions.items():
            role = Role.objects.filter(role_code=role_code).first()

            if not role:
                continue

            for permission_code in permission_codes:
                permission = permission_map.get(permission_code)

                if not permission:
                    continue

                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                    defaults={
                        "created_at": now,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Seed Sale Admin permissions completed."))