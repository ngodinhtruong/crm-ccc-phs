from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role, Permission, RolePermission
from apps.branches.models import Branch, ProcessingUnit
from apps.tickets.models import (
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketSupportCategory,
    TicketClassification,
)
from apps.sla.models import SlaBreachReason, SlaEscalationRule


class Command(BaseCommand):
    help = "Seed initial CRM master data"

    def handle(self, *args, **options):
        now = timezone.now()

        self.seed_branches(now)
        self.seed_processing_units(now)
        self.seed_roles(now)
        self.seed_permissions(now)
        self.seed_role_permissions(now)
        self.seed_ticket_statuses()
        self.seed_ticket_priorities(now)
        self.seed_ticket_sources()
        self.seed_ticket_categories(now)
        self.seed_sla_breach_reasons(now)
        self.seed_sla_escalation_rules(now)

        self.stdout.write(self.style.SUCCESS("Seed initial data completed."))

    def seed_branches(self, now):
        Branch.objects.update_or_create(
            branch_code="HO",
            defaults={
                "branch_name": "Hội sở",
                "address": "",
                "status": "ACTIVE",
                "updated_at": now,
            },
        )

    def seed_processing_units(self, now):
        ho = Branch.objects.get(branch_code="HO")

        units = [
            ("CCC", "Customer Care Center"),
            ("IT", "IT"),
            ("BMD", "BMD"),
            ("FN", "FN"),
            ("ACC", "ACC"),
            ("SALE_ADMIN", "Sale Admin"),
        ]

        for code, name in units:
            ProcessingUnit.objects.update_or_create(
                unit_code=code,
                defaults={
                    "unit_name": name,
                    "default_branch": ho,
                    "is_active": True,
                    "updated_at": now,
                },
            )

    def seed_roles(self, now):
        roles = [
            ("CS_STAFF", "User CS Staff", "BRANCH"),
            ("CS_SUPERVISOR", "User CS Supervisor", "BRANCH"),
            ("CS_MANAGER", "User CS Manager", "ALL"),
            ("RELATED_DEPT", "User Related Depts", "BRANCH"),
            ("IC", "User IC", "ALL"),
            ("BOM", "User BOM", "ALL"),
        ]

        for code, name, scope in roles:
            Role.objects.update_or_create(
                role_code=code,
                defaults={
                    "role_name": name,
                    "scope_type": scope,
                    "updated_at": now,
                },
            )

    def seed_permissions(self, now):
        permissions = [
            ("TICKET_CREATE", "Create ticket", "TICKET", "CREATE"),
            ("TICKET_AMEND", "Amend ticket", "TICKET", "AMEND"),
            ("TICKET_UPDATE_STATUS", "Update ticket status", "TICKET", "UPDATE_STATUS"),
            ("TICKET_ASSIGN", "Assign ticket", "TICKET", "ASSIGN"),
            ("TICKET_VIEW", "View ticket", "TICKET", "VIEW"),

            ("SLA_CREATE", "Create SLA", "SLA", "CREATE"),
            ("SLA_AMEND", "Amend SLA", "SLA", "AMEND"),
            ("SLA_ACTIVATE_DEACTIVATE", "Activate / Deactivate SLA", "SLA", "ACTIVATE_DEACTIVATE"),
            ("SLA_VIEW", "View SLA", "SLA", "VIEW"),

            ("OVERDUE_SLA_NOTIFICATION", "Receive overdue SLA notification", "OVERDUE_SLA", "NOTIFICATION"),
            ("OVERDUE_SLA_EMAIL", "Receive overdue SLA email", "OVERDUE_SLA", "EMAIL"),

            ("CALL_HISTORY_VIEW", "View call history", "CALL_HISTORY", "VIEW"),
            ("CALL_HISTORY_LISTEN", "Listen call record", "CALL_HISTORY", "LISTEN"),

            ("CUSTOMER_CREATE", "Create customer", "CUSTOMER", "CREATE"),
            ("CUSTOMER_AMEND", "Amend customer", "CUSTOMER", "AMEND"),

            ("AUTO_REPORT_VIEW", "View automatic report", "AUTO_REPORT", "VIEW"),
            ("AUTO_REPORT_EXPORT", "Export automatic report", "AUTO_REPORT", "EXPORT"),

            ("CUSTOM_REPORT_VIEW", "View custom report", "CUSTOM_REPORT", "VIEW"),
            ("CUSTOM_REPORT_EXPORT", "Export custom report", "CUSTOM_REPORT", "EXPORT"),
        ]

        for code, name, module, action in permissions:
            Permission.objects.update_or_create(
                permission_code=code,
                defaults={
                    "permission_name": name,
                    "module_code": module,
                    "action_code": action,
                    "is_active": True,
                    "updated_at": now,
                },
            )

    def seed_role_permissions(self, now):
        role_permission_map = {
            "CS_STAFF": [
                "TICKET_CREATE",
                "TICKET_AMEND",
                "TICKET_UPDATE_STATUS",
                "TICKET_VIEW",
                "SLA_VIEW",
                "OVERDUE_SLA_NOTIFICATION",
                "OVERDUE_SLA_EMAIL",
                "CALL_HISTORY_VIEW",
                "CALL_HISTORY_LISTEN",
                "CUSTOMER_CREATE",
            ],
            "CS_SUPERVISOR": [
                "TICKET_CREATE",
                "TICKET_AMEND",
                "TICKET_UPDATE_STATUS",
                "TICKET_ASSIGN",
                "TICKET_VIEW",
                "SLA_CREATE",
                "SLA_AMEND",
                "SLA_VIEW",
                "OVERDUE_SLA_NOTIFICATION",
                "OVERDUE_SLA_EMAIL",
                "CALL_HISTORY_VIEW",
                "CALL_HISTORY_LISTEN",
                "CUSTOMER_CREATE",
                "AUTO_REPORT_VIEW",
                "AUTO_REPORT_EXPORT",
                "CUSTOM_REPORT_VIEW",
                "CUSTOM_REPORT_EXPORT",
            ],
            "CS_MANAGER": [
                "TICKET_ASSIGN",
                "TICKET_VIEW",
                "SLA_ACTIVATE_DEACTIVATE",
                "SLA_VIEW",
                "OVERDUE_SLA_NOTIFICATION",
                "OVERDUE_SLA_EMAIL",
                "CALL_HISTORY_VIEW",
                "CALL_HISTORY_LISTEN",
                "CUSTOMER_CREATE",
                "AUTO_REPORT_VIEW",
                "AUTO_REPORT_EXPORT",
                "CUSTOM_REPORT_VIEW",
                "CUSTOM_REPORT_EXPORT",
            ],
            "RELATED_DEPT": [
                "TICKET_UPDATE_STATUS",
                "TICKET_VIEW",
                "SLA_VIEW",
                "OVERDUE_SLA_NOTIFICATION",
                "OVERDUE_SLA_EMAIL",
            ],
            "IC": [
                "TICKET_VIEW",
                "SLA_VIEW",
                "CALL_HISTORY_VIEW",
                "CALL_HISTORY_LISTEN",
                "AUTO_REPORT_VIEW",
                "AUTO_REPORT_EXPORT",
            ],
            "BOM": [
                "TICKET_VIEW",
                "SLA_ACTIVATE_DEACTIVATE",
                "SLA_VIEW",
                "OVERDUE_SLA_EMAIL",
                "CALL_HISTORY_VIEW",
                "CALL_HISTORY_LISTEN",
                "AUTO_REPORT_VIEW",
                "AUTO_REPORT_EXPORT",
                "CUSTOM_REPORT_VIEW",
                "CUSTOM_REPORT_EXPORT",
            ],
        }

        for role_code, permission_codes in role_permission_map.items():
            role = Role.objects.get(role_code=role_code)

            for permission_code in permission_codes:
                permission = Permission.objects.get(permission_code=permission_code)

                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                    defaults={"created_at": now},
                )

    def seed_ticket_statuses(self):
        statuses = [
            ("CREATED", "Khởi tạo", 1, False),
            ("ACCEPTED", "Tiếp nhận", 2, False),
            ("PROCESSING", "Đang xử lý", 3, False),
            ("DONE_WAIT_CLOSE", "Đã xong - chờ đóng", 4, False),
            ("CLOSED", "Đã đóng", 5, True),
            ("CANCELLED", "Đã hủy", 6, True),
        ]

        for code, name, sort_order, is_final in statuses:
            TicketStatus.objects.update_or_create(
                status_code=code,
                defaults={
                    "status_name": name,
                    "sort_order": sort_order,
                    "is_final": is_final,
                    "is_active": True,
                },
            )

    def seed_ticket_priorities(self, now):
        priorities = [
            ("LOW", "Thấp", 4, 1440),
            ("NORMAL", "Bình thường", 3, 480),
            ("HIGH", "Cao", 2, 120),
            ("URGENT", "Khẩn cấp", 1, 30),
        ]

        for code, name, level_order, default_sla in priorities:
            TicketPriority.objects.update_or_create(
                priority_code=code,
                defaults={
                    "priority_name": name,
                    "level_order": level_order,
                    "default_sla_minutes": default_sla,
                    "is_active": True,
                    "updated_at": now,
                },
            )

    def seed_ticket_sources(self):
        sources = [
            ("MANUAL", "Nhập thủ công"),
            ("EMAIL", "Email"),
            ("WEBFORM", "Webform"),
            ("CHATBOT", "Chatbot"),
            ("FACEBOOK", "Facebook"),
            ("CLOUDGO", "CRM CloudGO"),
            ("BASE", "Base"),
            ("API", "API"),
        ]

        for code, name in sources:
            TicketSource.objects.update_or_create(
                source_code=code,
                defaults={
                    "source_name": name,
                    "is_active": True,
                },
            )

    def seed_ticket_categories(self, now):
        categories = [
            ("BUSINESS", "Ticket nghiệp vụ"),
            ("ERROR", "Ticket lỗi"),
            ("COMPLAINT", "Khiếu nại"),
            ("ACCOUNT_SUPPORT", "Hỗ trợ tài khoản"),
            ("TRANSACTION_SUPPORT", "Hỗ trợ giao dịch"),
            ("CONSULTING", "Tư vấn thông tin"),
        ]

        created_categories = {}

        for code, name in categories:
            category, _ = TicketSupportCategory.objects.update_or_create(
                category_code=code,
                defaults={
                    "category_name": name,
                    "is_active": True,
                    "updated_at": now,
                },
            )
            created_categories[code] = category

        classifications = [
            ("GENERAL_SUPPORT", "Hỗ trợ chung", "BUSINESS"),
            ("ACCOUNT_INFO", "Thông tin tài khoản", "ACCOUNT_SUPPORT"),
            ("TRANSACTION_INFO", "Thông tin giao dịch", "TRANSACTION_SUPPORT"),
            ("COMPLAINT_GENERAL", "Khiếu nại chung", "COMPLAINT"),
            ("SYSTEM_ERROR", "Lỗi hệ thống", "ERROR"),
            ("CONSULTING_INFO", "Tư vấn thông tin", "CONSULTING"),
        ]

        for code, name, category_code in classifications:
            TicketClassification.objects.update_or_create(
                classification_code=code,
                defaults={
                    "classification_name": name,
                    "support_category": created_categories[category_code],
                    "is_active": True,
                    "updated_at": now,
                },
            )

    def seed_sla_breach_reasons(self, now):
        reasons = [
            ("CUSTOMER_MULTI_RESPONSE", "Khách hàng phản hồi nhiều lần"),
            ("CUSTOMER_MULTI_REQUEST", "Khách hàng gửi nhiều yêu cầu đồng thời"),
            ("SLOW_PROCESSING", "Xử lý chậm"),
            ("INTERNAL_DISCUSSION_DELAY", "Mất thời gian trao đổi nội bộ"),
            ("FORGOT_UPDATE_STATUS", "Quên cập nhật trạng thái"),
            ("OTHER", "Khác"),
        ]

        for index, (code, name) in enumerate(reasons, start=1):
            SlaBreachReason.objects.update_or_create(
                reason_code=code,
                defaults={
                    "reason_name": name,
                    "is_active": True,
                    "sort_order": index,
                    "updated_at": now,
                },
            )

    def seed_sla_escalation_rules(self, now):
        rules = [
            {
                "rule_code": "REMIND_PIC_DAILY",
                "rule_name": "Remind PIC mỗi ngày đến khi đóng ticket",
                "trigger_type": "DAILY_UNTIL_CLOSED",
                "trigger_after_minutes": 0,
                "repeat_interval_minutes": 1440,
                "recipient_type": "ASSIGNED_EMPLOYEE",
                "channel": "BOTH",
            },
            {
                "rule_code": "EMAIL_MANAGER_OVERDUE",
                "rule_name": "Email Manager ngay khi SLA quá hạn",
                "trigger_type": "OVERDUE_IMMEDIATE",
                "trigger_after_minutes": 0,
                "repeat_interval_minutes": None,
                "recipient_type": "MANAGER",
                "channel": "EMAIL",
            },
            {
                "rule_code": "EMAIL_HEAD_OVERDUE",
                "rule_name": "Email Head ngay khi SLA quá hạn",
                "trigger_type": "OVERDUE_IMMEDIATE",
                "trigger_after_minutes": 0,
                "repeat_interval_minutes": None,
                "recipient_type": "HEAD",
                "channel": "EMAIL",
            },
            {
                "rule_code": "EMAIL_BOM_AFTER_72H",
                "rule_name": "Email BOM sau 72h ticket vẫn quá hạn",
                "trigger_type": "OVERDUE_AFTER_MINUTES",
                "trigger_after_minutes": 4320,
                "repeat_interval_minutes": None,
                "recipient_type": "BOM",
                "channel": "EMAIL",
            },
        ]

        for rule in rules:
            SlaEscalationRule.objects.update_or_create(
                rule_code=rule["rule_code"],
                defaults={
                    "rule_name": rule["rule_name"],
                    "trigger_type": rule["trigger_type"],
                    "trigger_after_minutes": rule["trigger_after_minutes"],
                    "repeat_interval_minutes": rule["repeat_interval_minutes"],
                    "recipient_type": rule["recipient_type"],
                    "channel": rule["channel"],
                    "is_active": True,
                    "updated_at": now,
                },
            )