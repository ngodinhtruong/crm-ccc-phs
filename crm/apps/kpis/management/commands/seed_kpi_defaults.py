from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role, RolePermission
from apps.kpis.models import KpiGateDefinition

KPI_PERMISSIONS = [
    ("KPI_DASHBOARD_VIEW_SELF", "Xem KPI cá nhân", "VIEW_SELF"),
    ("KPI_DASHBOARD_VIEW_BRANCH", "Xem KPI chi nhánh", "VIEW_BRANCH"),
    ("KPI_DASHBOARD_VIEW_ALL", "Xem KPI toàn hệ thống", "VIEW_ALL"),
    ("KPI_MANUAL_SCORE_VIEW", "Xem điểm KPI nhập tay", "MANUAL_SCORE_VIEW"),
    ("KPI_MANUAL_SCORE_UPDATE", "Chấm điểm KPI nhập tay", "MANUAL_SCORE_UPDATE"),
    ("KPI_TARGET_VIEW", "Xem chỉ tiêu KPI", "TARGET_VIEW"),
    ("KPI_TARGET_MANAGE", "Quản lý chỉ tiêu KPI", "TARGET_MANAGE"),
    ("KPI_CONFIG_VIEW", "Xem cấu hình KPI", "CONFIG_VIEW"),
    ("KPI_CONFIG_MANAGE", "Quản lý cấu hình KPI", "CONFIG_MANAGE"),
    ("KPI_GATE_VIEW", "Xem điều kiện cổng KPI", "GATE_VIEW"),
    ("KPI_GATE_MANAGE", "Quản lý điều kiện cổng KPI", "GATE_MANAGE"),
    ("KPI_REWARD_VIEW", "Xem bậc thưởng KPI", "REWARD_VIEW"),
    ("KPI_REWARD_MANAGE", "Quản lý bậc thưởng KPI", "REWARD_MANAGE"),
    ("KPI_REPORT_EXPORT", "Xuất báo cáo KPI", "REPORT_EXPORT"),
    ("KPI_AUTO_CALCULATE", "Tính KPI tự động", "AUTO_CALCULATE"),
]

GATES = [
    (
        "B1_MIN_CALLS",
        "Số cuộc gọi tối thiểu",
        "SA phải hoàn thành tối thiểu 80% chỉ tiêu cuộc gọi hàng tháng.",
        "min_calls_rate",
        ">=",
        80,
    ),
    (
        "B2_ICP_COMPLETE",
        "Gán nhãn ICP",
        "100% SA Records phải có Nhóm KH hợp lệ trước cuối tháng.",
        "icp_complete_rate",
        "=",
        100,
    ),
    (
        "B3_FAKE_REACTIVATION",
        "Không tái kích hoạt ảo",
        "Tỷ lệ tái kích hoạt ảo phải nhỏ hơn 20%.",
        "fake_reactivation_rate",
        "<",
        20,
    ),
    (
        "B4_REQUIRED_FIELDS",
        "Dữ liệu đầy đủ",
        "Không có record thiếu trường bắt buộc.",
        "missing_required_count",
        "=",
        0,
    ),
]

ROLE_PERMISSION_MAP = {
    # SA không có quyền cấu hình KPI.
    "SA_STAFF": [
        "KPI_DASHBOARD_VIEW_SELF",
        "KPI_MANUAL_SCORE_VIEW",
        "KPI_TARGET_VIEW",
        "KPI_GATE_VIEW",
        "KPI_REWARD_VIEW",
    ],
    # SA_SUP có quyền cấu hình, nhưng backend chỉ cho phép chỉnh profile SA.
    "SA_SUPERVISOR": [
        "KPI_DASHBOARD_VIEW_SELF",
        "KPI_DASHBOARD_VIEW_BRANCH",
        "KPI_MANUAL_SCORE_VIEW",
        "KPI_MANUAL_SCORE_UPDATE",
        "KPI_TARGET_VIEW",
        "KPI_TARGET_MANAGE",
        "KPI_CONFIG_VIEW",
        "KPI_CONFIG_MANAGE",
        "KPI_GATE_VIEW",
        "KPI_GATE_MANAGE",
        "KPI_REWARD_VIEW",
        "KPI_REWARD_MANAGE",
        "KPI_REPORT_EXPORT",
        "KPI_AUTO_CALCULATE",
    ],
    "SYSTEM_ADMIN": [
        "KPI_DASHBOARD_VIEW_SELF",
        "KPI_DASHBOARD_VIEW_BRANCH",
        "KPI_DASHBOARD_VIEW_ALL",
        "KPI_MANUAL_SCORE_VIEW",
        "KPI_MANUAL_SCORE_UPDATE",
        "KPI_TARGET_VIEW",
        "KPI_TARGET_MANAGE",
        "KPI_CONFIG_VIEW",
        "KPI_CONFIG_MANAGE",
        "KPI_GATE_VIEW",
        "KPI_GATE_MANAGE",
        "KPI_REWARD_VIEW",
        "KPI_REWARD_MANAGE",
        "KPI_REPORT_EXPORT",
        "KPI_AUTO_CALCULATE",
    ],
}


class Command(BaseCommand):
    help = "Seed KPI permissions and gate definitions. KPI master/metric definitions are not used."

    def handle(self, *args, **options):
        self.seed_permissions()
        self.seed_gate_definitions()
        self.stdout.write(self.style.SUCCESS("Seed KPI defaults completed."))

    def seed_permissions(self):
        permission_map = {}

        for code, name, action in KPI_PERMISSIONS:
            permission, _ = Permission.objects.get_or_create(
                permission_code=code,
                defaults={
                    "permission_name": name,
                    "module_code": "KPIS",
                    "action_code": action,
                    "is_active": True,
                },
            )

            changed = False
            if permission.permission_name != name:
                permission.permission_name = name
                changed = True
            if permission.module_code != "KPIS":
                permission.module_code = "KPIS"
                changed = True
            if permission.action_code != action:
                permission.action_code = action
                changed = True
            if not permission.is_active:
                permission.is_active = True
                changed = True
            if changed:
                permission.save()

            permission_map[code] = permission

        for role_code, permission_codes in ROLE_PERMISSION_MAP.items():
            role = Role.objects.filter(role_code=role_code).first()
            if not role:
                self.stdout.write(self.style.WARNING(f"Role {role_code} không tồn tại, bỏ qua."))
                continue

            for permission_code in permission_codes:
                permission = permission_map.get(permission_code)
                if not permission:
                    continue
                RolePermission.objects.get_or_create(role=role, permission=permission)

            self.stdout.write(self.style.SUCCESS(f"Seeded KPI permissions for role {role_code}."))

    def seed_gate_definitions(self):
        for gate_code, gate_name, description, formula_key, operator, threshold in GATES:
            gate, created = KpiGateDefinition.objects.get_or_create(
                gate_code=gate_code,
                defaults={
                    "gate_name": gate_name,
                    "description": description,
                    "formula_key": formula_key,
                    "operator": operator,
                    "default_threshold": threshold,
                    "is_active": True,
                },
            )

            changed = False
            for field, value in {
                "gate_name": gate_name,
                "description": description,
                "formula_key": formula_key,
                "operator": operator,
                "default_threshold": threshold,
                "is_active": True,
            }.items():
                if getattr(gate, field) != value:
                    setattr(gate, field, value)
                    changed = True

            if changed:
                gate.save()

            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} gate {gate_code}."))
