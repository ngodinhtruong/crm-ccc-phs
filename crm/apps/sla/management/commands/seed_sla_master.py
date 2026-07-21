from django.core.management.base import BaseCommand
from django.db import transaction

from apps.sla.models import (
    SlaBreachReason,
    SlaEscalationRule,
    SlaPolicy,
    SlaPolicyTask,
)
from apps.tickets.models import (
    TicketPriority,
    TicketSupportCategory,
)


BREACH_REASONS = [
    {
        "reason_code": "WAITING_CUSTOMER",
        "reason_name": "Chờ khách hàng cung cấp thông tin",
        "sort_order": 1,
    },
    {
        "reason_code": "WAITING_INTERNAL",
        "reason_name": "Chờ đơn vị nội bộ phản hồi",
        "sort_order": 2,
    },
    {
        "reason_code": "SYSTEM_ERROR",
        "reason_name": "Lỗi hệ thống",
        "sort_order": 3,
    },
    {
        "reason_code": "HIGH_WORKLOAD",
        "reason_name": "Khối lượng công việc cao",
        "sort_order": 4,
    },
    {
        "reason_code": "COMPLEX_CASE",
        "reason_name": "Trường hợp xử lý phức tạp",
        "sort_order": 5,
    },
    {
        "reason_code": "OTHER",
        "reason_name": "Lý do khác",
        "sort_order": 6,
    },
]


SLA_POLICIES = [
    {
        "sla_name": "SLA Môi giới - Thấp",
        "support_category_code": "MOI_GIOI",
        "priority_code": "LOW",
        "description": "SLA dành cho yêu cầu môi giới mức độ thấp",
        "response_time_minutes": 60,
        "assignment_time_minutes": 120,
        "processing_time_minutes": 480,
        "resolution_time_minutes": 1440,
    },
    {
        "sla_name": "SLA Môi giới - Bình thường",
        "support_category_code": "MOI_GIOI",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu môi giới mức độ bình thường",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
    {
        "sla_name": "SLA Môi giới - Cao",
        "support_category_code": "MOI_GIOI",
        "priority_code": "HIGH",
        "description": "SLA dành cho yêu cầu môi giới mức độ cao",
        "response_time_minutes": 15,
        "assignment_time_minutes": 30,
        "processing_time_minutes": 120,
        "resolution_time_minutes": 240,
    },
    {
        "sla_name": "SLA Môi giới - Rất cao",
        "support_category_code": "MOI_GIOI",
        "priority_code": "CRITICAL",
        "description": "SLA dành cho yêu cầu môi giới mức độ rất cao",
        "response_time_minutes": 5,
        "assignment_time_minutes": 15,
        "processing_time_minutes": 60,
        "resolution_time_minutes": 120,
    },

    {
        "sla_name": "SLA Kiến thức chứng khoán - Bình thường",
        "support_category_code": "KIEN_THUC_CHUNG_KHOAN",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu kiến thức chứng khoán",
        "response_time_minutes": 60,
        "assignment_time_minutes": 120,
        "processing_time_minutes": 480,
        "resolution_time_minutes": 1440,
    },
    {
        "sla_name": "SLA Sản phẩm PHS - Bình thường",
        "support_category_code": "SAN_PHAM_PHS",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu về sản phẩm PHS",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
    {
        "sla_name": "SLA Công cụ tiện ích - Bình thường",
        "support_category_code": "CONG_CU_TIEN_ICH",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu về công cụ tiện ích",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
    {
        "sla_name": "SLA Ứng dụng chứng khoán - Bình thường",
        "support_category_code": "UNG_DUNG_CHUNG_KHOAN",
        "priority_code": "NORMAL",
        "description": "SLA dành cho lỗi hoặc yêu cầu ứng dụng chứng khoán",
        "response_time_minutes": 15,
        "assignment_time_minutes": 30,
        "processing_time_minutes": 120,
        "resolution_time_minutes": 240,
    },
    {
        "sla_name": "SLA Tài khoản khách hàng - Bình thường",
        "support_category_code": "TAI_KHOAN_KHACH_HANG",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu tài khoản khách hàng",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
    {
        "sla_name": "SLA Định danh - Bình thường",
        "support_category_code": "DINH_DANH",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu định danh",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
    {
        "sla_name": "SLA Giao dịch chứng khoán - Cao",
        "support_category_code": "GIAO_DICH_CHUNG_KHOAN",
        "priority_code": "HIGH",
        "description": "SLA dành cho yêu cầu giao dịch chứng khoán",
        "response_time_minutes": 10,
        "assignment_time_minutes": 20,
        "processing_time_minutes": 90,
        "resolution_time_minutes": 180,
    },
    {
        "sla_name": "SLA Nạp tiền - Cao",
        "support_category_code": "NAP_TIEN",
        "priority_code": "HIGH",
        "description": "SLA dành cho yêu cầu nạp tiền",
        "response_time_minutes": 10,
        "assignment_time_minutes": 20,
        "processing_time_minutes": 60,
        "resolution_time_minutes": 120,
    },
    {
        "sla_name": "SLA Rút tiền - Cao",
        "support_category_code": "RUT_TIEN",
        "priority_code": "HIGH",
        "description": "SLA dành cho yêu cầu rút tiền",
        "response_time_minutes": 10,
        "assignment_time_minutes": 20,
        "processing_time_minutes": 60,
        "resolution_time_minutes": 120,
    },
    {
        "sla_name": "SLA Giao dịch ký quỹ - Cao",
        "support_category_code": "GIAO_DICH_KY_QUY",
        "priority_code": "HIGH",
        "description": "SLA dành cho yêu cầu giao dịch ký quỹ",
        "response_time_minutes": 10,
        "assignment_time_minutes": 20,
        "processing_time_minutes": 90,
        "resolution_time_minutes": 180,
    },
    {
        "sla_name": "SLA Góp ý - Bình thường",
        "support_category_code": "GOP_Y",
        "priority_code": "NORMAL",
        "description": "SLA dành cho góp ý của khách hàng",
        "response_time_minutes": 120,
        "assignment_time_minutes": 240,
        "processing_time_minutes": 720,
        "resolution_time_minutes": 1440,
    },
    {
        "sla_name": "SLA Chăm sóc khách hàng - Bình thường",
        "support_category_code": "CHAM_SOC_KHACH_HANG",
        "priority_code": "NORMAL",
        "description": "SLA dành cho yêu cầu chăm sóc khách hàng",
        "response_time_minutes": 30,
        "assignment_time_minutes": 60,
        "processing_time_minutes": 240,
        "resolution_time_minutes": 480,
    },
]


POLICY_TASKS = [
    {
        "task_name": "Tiếp nhận yêu cầu",
        "task_description": "Tiếp nhận và kiểm tra thông tin ticket",
        "standard_minutes_field": "response_time_minutes",
        "sort_order": 1,
    },
    {
        "task_name": "Phân công xử lý",
        "task_description": "Phân công ticket đến đơn vị hoặc nhân viên xử lý",
        "standard_minutes_field": "assignment_time_minutes",
        "sort_order": 2,
    },
    {
        "task_name": "Xử lý yêu cầu",
        "task_description": "Thực hiện xử lý yêu cầu của khách hàng",
        "standard_minutes_field": "processing_time_minutes",
        "sort_order": 3,
    },
    {
        "task_name": "Hoàn tất yêu cầu",
        "task_description": "Hoàn tất và phản hồi kết quả xử lý",
        "standard_minutes_field": "resolution_time_minutes",
        "sort_order": 4,
    },
]


ESCALATION_RULES = [
    {
        "rule_code": "OVERDUE_IMMEDIATE_MANAGER",
        "rule_name": "Thông báo quản lý ngay khi quá hạn",
        "trigger_type": "OVERDUE_IMMEDIATE",
        "trigger_after_minutes": 0,
        "repeat_interval_minutes": None,
        "recipient_type": "MANAGER",
        "channel": "BOTH",
    },
    {
        "rule_code": "OVERDUE_DAILY_ASSIGNEE",
        "rule_name": "Nhắc người xử lý mỗi ngày đến khi đóng",
        "trigger_type": "DAILY_UNTIL_CLOSED",
        "trigger_after_minutes": 0,
        "repeat_interval_minutes": 1440,
        "recipient_type": "ASSIGNED_EMPLOYEE",
        "channel": "BOTH",
    },
    {
        "rule_code": "OVERDUE_72H_BOM",
        "rule_name": "Thông báo BOM sau 72 giờ quá hạn",
        "trigger_type": "OVERDUE_AFTER_MINUTES",
        "trigger_after_minutes": 4320,
        "repeat_interval_minutes": None,
        "recipient_type": "BOM",
        "channel": "EMAIL",
    },
]


class Command(BaseCommand):
    help = "Seed dữ liệu mặc định cho SLA"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Bắt đầu seed dữ liệu SLA...")

        self.seed_breach_reasons()
        policies = self.seed_sla_policies()
        self.seed_policy_tasks(policies)
        self.seed_escalation_rules()

        self.stdout.write(
            self.style.SUCCESS(
                "Seed dữ liệu SLA thành công."
            )
        )

    def seed_breach_reasons(self):
        self.stdout.write("\nSeed lý do vi phạm SLA...")

        for item in BREACH_REASONS:
            obj, created = SlaBreachReason.objects.update_or_create(
                reason_code=item["reason_code"],
                defaults={
                    "reason_name": item["reason_name"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

            self.print_result(
                "Lý do vi phạm",
                obj.reason_name,
                created,
            )

    def seed_sla_policies(self):
        self.stdout.write("\nSeed chính sách SLA...")

        policies = []

        for item in SLA_POLICIES:
            category = TicketSupportCategory.objects.filter(
                category_code=item["support_category_code"],
                is_active=True,
            ).first()

            if category is None:
                raise ValueError(
                    "Không tìm thấy danh mục hỗ trợ "
                    f"{item['support_category_code']}. "
                    "Hãy chạy seed_ticket_master trước."
                )

            priority = TicketPriority.objects.filter(
                priority_code=item["priority_code"],
                is_active=True,
            ).first()

            if priority is None:
                raise ValueError(
                    "Không tìm thấy mức ưu tiên "
                    f"{item['priority_code']}. "
                    "Hãy chạy seed_ticket_master trước."
                )

            policy, created = SlaPolicy.objects.update_or_create(
                sla_name=item["sla_name"],
                defaults={
                    "description": item["description"],
                    "support_category": category,
                    "classification": None,
                    "priority": priority,
                    "processing_unit": None,
                    "branch": None,
                    "customer_type": None,
                    "response_time_minutes": (
                        item["response_time_minutes"]
                    ),
                    "assignment_time_minutes": (
                        item["assignment_time_minutes"]
                    ),
                    "processing_time_minutes": (
                        item["processing_time_minutes"]
                    ),
                    "resolution_time_minutes": (
                        item["resolution_time_minutes"]
                    ),
                    "is_default": True,
                    "is_active": True,
                    "status": "ACTIVE",
                    "version": 1,
                    "parent_sla_policy": None,
                    "effective_from": None,
                    "effective_to": None,
                },
            )

            policies.append(policy)

            self.print_result(
                "Chính sách SLA",
                policy.sla_name,
                created,
            )

        return policies

    def seed_policy_tasks(self, policies):
        self.stdout.write("\nSeed các bước xử lý SLA...")

        for policy in policies:
            for task_item in POLICY_TASKS:
                standard_minutes = getattr(
                    policy,
                    task_item["standard_minutes_field"],
                    None,
                )

                task, created = SlaPolicyTask.objects.update_or_create(
                    sla_policy=policy,
                    task_name=task_item["task_name"],
                    defaults={
                        "task_description": (
                            task_item["task_description"]
                        ),
                        "processing_unit": None,
                        "default_branch": None,
                        "branch_resolve_type": "TICKET_BRANCH",
                        "standard_minutes": standard_minutes,
                        "is_sla_counted": True,
                        "is_required": True,
                        "sort_order": task_item["sort_order"],
                        "is_active": True,
                    },
                )

                self.print_result(
                    f"Bước SLA - {policy.sla_name}",
                    task.task_name,
                    created,
                )

    def seed_escalation_rules(self):
        self.stdout.write("\nSeed quy tắc cảnh báo SLA...")

        for item in ESCALATION_RULES:
            rule, created = SlaEscalationRule.objects.update_or_create(
                rule_code=item["rule_code"],
                defaults={
                    "rule_name": item["rule_name"],
                    "sla_policy": None,
                    "trigger_type": item["trigger_type"],
                    "trigger_after_minutes": (
                        item["trigger_after_minutes"]
                    ),
                    "repeat_interval_minutes": (
                        item["repeat_interval_minutes"]
                    ),
                    "recipient_type": item["recipient_type"],
                    "channel": item["channel"],
                    "is_active": True,
                },
            )

            self.print_result(
                "Quy tắc cảnh báo",
                rule.rule_name,
                created,
            )

    def print_result(self, group, name, created):
        action = "Tạo mới" if created else "Cập nhật"

        self.stdout.write(
            f"[{group}] {action}: {name}"
        )