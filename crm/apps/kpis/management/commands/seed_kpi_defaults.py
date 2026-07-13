from django.core.management.base import BaseCommand

from apps.accounts.models import Permission, Role, RolePermission
from apps.kpis.models import KpiGateDefinition, KpiMetricDefinition


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


MANUAL_METRICS = [
    ("CONTACT_COMPLIANCE", "Tuân thủ liên hệ KH", "Đánh giá số cuộc gọi tối thiểu, chất lượng cuộc gọi, tuân thủ kịch bản."),
    ("ICP_ACCURACY", "Độ chính xác phân nhóm ICP", "Đánh giá độ đầy đủ và chính xác của phân nhóm ICP."),
    ("DATA_QUALITY", "Chất lượng nhập liệu", "Đánh giá tính đầy đủ, kịp thời và không trùng lặp dữ liệu."),
    ("INTERNAL_COLLAB", "Phối hợp nội bộ", "Đánh giá phối hợp với CCC/ticket/escalation."),
    ("REPORT_PROFILE", "Báo cáo & hồ sơ", "Đánh giá nộp biểu mẫu, báo cáo, tham dự họp."),
    ("PROFESSIONAL_DEVELOPMENT", "Phát triển chuyên môn", "Đánh giá đào tạo, chứng chỉ, kiến thức sản phẩm."),
]


AUTO_METRICS = [
    ("TOTAL_CALLS", "Tổng cuộc gọi", "total_calls", "COUNT", "HIGHER_BETTER"),
    ("REACTIVATED_ACCOUNTS", "TK đã tái kích hoạt", "reactivated_accounts", "COUNT", "HIGHER_BETTER"),
    ("RETENTION_RATE", "Tỷ lệ duy trì", "retention_rate", "PERCENT", "HIGHER_BETTER"),
    ("ICP_AB_CUSTOMERS", "Số KH Nhóm A/B", "icp_ab_customers", "COUNT", "HIGHER_BETTER"),
    ("TOTAL_FEE", "Phí GD phát sinh", "transaction_fee", "MONEY", "HIGHER_BETTER"),
    ("TOTAL_VALUE", "Giá trị GD phát sinh", "transaction_value", "MONEY", "HIGHER_BETTER"),
    ("INTRODUCED_PRODUCT_COUNT", "Số lần giới thiệu SP", "introduced_product_count", "COUNT", "HIGHER_BETTER"),
    ("ON_TIME_FOLLOWUP_RATE", "Tỷ lệ Follow-up đúng hạn", "on_time_followup_rate", "PERCENT", "HIGHER_BETTER"),
    ("RM_REFERRAL_COUNT", "Số lần giới thiệu/chuyển RM", "rm_referral_count", "COUNT", "HIGHER_BETTER"),
    ("FAKE_REACTIVATION_RATE", "Tỷ lệ tái kích hoạt ảo", "fake_reactivation_rate", "PERCENT", "LOWER_BETTER"),
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
    "SA_STAFF": [
        "KPI_DASHBOARD_VIEW_SELF",
        "KPI_MANUAL_SCORE_VIEW",
        "KPI_TARGET_VIEW",
        "KPI_GATE_VIEW",
        "KPI_REWARD_VIEW",
    ],
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
    "SA_MANAGER": [
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
    "SA_ADMIN": [
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
    help = "Seed KPI permissions, metric definitions, and gate definitions."

    def handle(self, *args, **options):
        self.seed_permissions()
        self.seed_metric_definitions()
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

                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                )

        self.stdout.write(self.style.SUCCESS("Seed KPI permissions done."))

    def seed_metric_definitions(self):
        for code, name, description in MANUAL_METRICS:
            KpiMetricDefinition.objects.update_or_create(
                metric_code=code,
                defaults={
                    "metric_name": name,
                    "description": description,
                    "input_type": KpiMetricDefinition.INPUT_MANUAL,
                    "formula_key": None,
                    "score_direction": KpiMetricDefinition.DIRECTION_HIGHER_BETTER,
                    "unit": KpiMetricDefinition.UNIT_SCORE,
                    "is_active": True,
                },
            )

        for code, name, formula_key, unit, direction in AUTO_METRICS:
            KpiMetricDefinition.objects.update_or_create(
                metric_code=code,
                defaults={
                    "metric_name": name,
                    "description": name,
                    "input_type": KpiMetricDefinition.INPUT_AUTO,
                    "formula_key": formula_key,
                    "score_direction": direction,
                    "unit": unit,
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seed KPI metric definitions done."))

    def seed_gate_definitions(self):
        for code, name, description, formula_key, operator, threshold in GATES:
            KpiGateDefinition.objects.update_or_create(
                gate_code=code,
                defaults={
                    "gate_name": name,
                    "description": description,
                    "formula_key": formula_key,
                    "operator": operator,
                    "default_threshold": threshold,
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS("Seed KPI gate definitions done."))