from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
import random
from datetime import timedelta

from apps.branches.models import ProcessingUnit, ProcessingUnitMember, Branch, Employee
from apps.tickets.models import (
    TicketStatus, TicketPriority, TicketSource, TicketSupportCategory,
    TicketClassification, Ticket, TicketAssignment, TicketComment, TicketActivityLog
)
from apps.sla.models import SlaBreachReason, SlaEscalationRule, SlaPolicy
from apps.external_errors.models import ExternalErrorRecord, ExternalErrorImportBatch
from apps.calls.models import CallLog
from apps.chatbots.models import ChatbotSessionSummary, ChatbotChatLog
from apps.notifications.models import Notification
from apps.customers.models import Customer, CustomerType

User = get_user_model()


class Command(BaseCommand):
    help = "Seed fake data for all remaining models (Branches, Tickets, SLA, External Errors, Calls, Chatbots, Notifications)"

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Ensure we have some base data to work with
        self.users = list(User.objects.all())
        self.employees = list(Employee.objects.all())
        self.customers = list(Customer.objects.all())
        self.branches = list(Branch.objects.all())
        
        if not self.users or not self.employees or not self.customers:
            self.stdout.write(self.style.ERROR("Missing base data. Please run `python manage.py seed_test_data` first."))
            return

        self.seed_branches(now)
        self.seed_tickets(now)
        self.seed_sla(now)
        self.seed_external_errors(now)
        self.seed_calls(now)
        self.seed_chatbots(now)
        self.seed_notifications(now)

        self.stdout.write(self.style.SUCCESS("Seed all fake data completed."))

    def seed_branches(self, now):
        ho_branch = self.branches[0] if self.branches else Branch.objects.create(branch_code="HO", branch_name="Hội sở", status="ACTIVE")

        units = [
            ("CCC", "Customer Care Center"),
            ("IT", "IT"),
            ("BMD", "BMD"),
            ("FN", "FN"),
            ("ACC", "ACC"),
            ("SALE_ADMIN", "Sale Admin"),
        ]

        processing_units = []
        for code, name in units:
            unit, _ = ProcessingUnit.objects.update_or_create(
                unit_code=code,
                defaults={
                    "unit_name": name,
                    "default_branch": ho_branch,
                    "is_active": True,
                },
            )
            processing_units.append(unit)

        if self.employees:
            for i, employee in enumerate(self.employees):
                unit = processing_units[i % len(processing_units)]
                ProcessingUnitMember.objects.update_or_create(
                    processing_unit=unit,
                    employee=employee,
                    defaults={
                        "unit_role": "STAFF",
                        "is_active": True,
                        "joined_at": now,
                    }
                )

        self.stdout.write("Seeded Branches models.")

    def seed_tickets(self, now):
        # 1. Statuses
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
                defaults={"status_name": name, "sort_order": sort_order, "is_final": is_final, "is_active": True}
            )

        # 2. Priorities
        priorities = [
            ("LOW", "Thấp", 4, 1440),
            ("NORMAL", "Bình thường", 3, 480),
            ("HIGH", "Cao", 2, 120),
            ("URGENT", "Khẩn cấp", 1, 30),
        ]
        for code, name, level_order, default_sla in priorities:
            TicketPriority.objects.update_or_create(
                priority_code=code,
                defaults={"priority_name": name, "level_order": level_order, "default_sla_minutes": default_sla, "is_active": True}
            )

        # 3. Sources
        sources = [("MANUAL", "Nhập thủ công"), ("EMAIL", "Email"), ("WEBFORM", "Webform"), ("CHATBOT", "Chatbot")]
        for code, name in sources:
            TicketSource.objects.update_or_create(source_code=code, defaults={"source_name": name, "is_active": True})

        # 4. Categories & Classifications
        cat_biz, _ = TicketSupportCategory.objects.update_or_create(category_code="BUSINESS", defaults={"category_name": "Ticket nghiệp vụ", "is_active": True})
        cat_err, _ = TicketSupportCategory.objects.update_or_create(category_code="ERROR", defaults={"category_name": "Ticket lỗi", "is_active": True})
        
        classifications = [
            ("GENERAL_SUPPORT", "Hỗ trợ chung", cat_biz),
            ("SYSTEM_ERROR", "Lỗi hệ thống", cat_err),
        ]
        for code, name, category in classifications:
            TicketClassification.objects.update_or_create(
                classification_code=code,
                defaults={"classification_name": name, "support_category": category, "is_active": True}
            )

        # 5. Tickets
        status_list = list(TicketStatus.objects.all())
        priority_list = list(TicketPriority.objects.all())
        source_list = list(TicketSource.objects.all())
        
        for i in range(5):
            ticket, created = Ticket.objects.get_or_create(
                ticket_code=f"TICK-FAKE-{i+1:04d}",
                defaults={
                    "title": f"Fake Ticket {i+1} for testing",
                    "customer": random.choice(self.customers) if self.customers else None,
                    "current_status": random.choice(status_list) if status_list else None,
                    "priority": random.choice(priority_list) if priority_list else None,
                    "source": random.choice(source_list) if source_list else None,
                    "classification": TicketClassification.objects.first(),
                    "request_content": "This is a fake ticket generated by seed_all_fake_data.",
                    "handling_branch": self.branches[0] if self.branches else None,
                }
            )

            if created and self.employees:
                emp = random.choice(self.employees)
                TicketAssignment.objects.create(
                    ticket=ticket,
                    to_employee=emp,
                    assigned_by_user=self.users[0] if self.users else None,
                    assigned_at=now,
                    is_current=True
                )
                TicketComment.objects.create(
                    ticket=ticket,
                    created_by_user=self.users[0] if self.users else None,
                    comment_content="Vui lòng kiểm tra và xử lý gấp.",
                    is_internal=False
                )
                TicketActivityLog.objects.create(
                    ticket=ticket,
                    created_by_user=self.users[0] if self.users else None,
                    action_type="CREATE",
                    action_name="Tạo ticket"
                )

        self.stdout.write("Seeded Tickets models.")

    def seed_sla(self, now):
        reasons = [("CUSTOMER_MULTI_RESPONSE", "Khách hàng phản hồi nhiều lần"), ("SLOW_PROCESSING", "Xử lý chậm")]
        for code, name in reasons:
            SlaBreachReason.objects.update_or_create(reason_code=code, defaults={"reason_name": name, "is_active": True})

        SlaEscalationRule.objects.update_or_create(
            rule_code="EMAIL_MANAGER_OVERDUE",
            defaults={
                "rule_name": "Email Manager ngay khi SLA quá hạn",
                "trigger_type": "OVERDUE_IMMEDIATE",
                "trigger_after_minutes": 0,
                "recipient_type": "MANAGER",
                "channel": "EMAIL",
                "is_active": True,
            }
        )
        
        priority = TicketPriority.objects.first()
        if priority:
            SlaPolicy.objects.update_or_create(
                sla_name="SLA Mặc định Hệ thống",
                defaults={
                    "description": "SLA áp dụng mặc định khi không có rule nào match",
                    "priority": priority,
                    "response_time_minutes": 30,
                    "resolution_time_minutes": 480,
                    "is_default": True,
                    "is_active": True,
                    "status": "ACTIVE",
                }
            )
        self.stdout.write("Seeded SLA models.")

    def seed_external_errors(self, now):
        batch, _ = ExternalErrorImportBatch.objects.get_or_create(
            batch_code="BATCH-FAKE",
            defaults={
                "file_name": "Fake Import Batch",
                "total_rows": 5,
                "created_by": self.users[0] if self.users else None,
            }
        )
        
        for i in range(5):
            ExternalErrorRecord.objects.create(
                batch=batch,
                received_date=now.date(),
                raw_content=f"Lỗi hiển thị app KH {i}",
                error_type_name="Lỗi hiển thị app",
                clean_content="Khách hàng không thấy số dư cập nhật",
                classification_status="UNCLASSIFIED"
            )
        self.stdout.write("Seeded External Errors models.")

    def seed_calls(self, now):
        for i in range(5):
            CallLog.objects.get_or_create(
                external_call_id=f"CALL-{1000+i}",
                defaults={
                    "call_direction": random.choice(["INBOUND", "OUTBOUND"]),
                    "phone_number": f"090{random.randint(1000000, 9999999)}",
                    "call_time": now - timedelta(minutes=random.randint(10, 60)),
                    "duration_seconds": random.randint(60, 600),
                    "customer": random.choice(self.customers) if self.customers else None,
                    "employee": random.choice(self.employees) if self.employees else None,
                }
            )
        self.stdout.write("Seeded Calls models.")

    def seed_chatbots(self, now):
        for i in range(3):
            session, _ = ChatbotSessionSummary.objects.get_or_create(
                session_id=f"SESS-{2000+i}",
                defaults={
                    "channel": "WEB",
                    "outcome_type": "BOT_DONE",
                }
            )
            
            ChatbotChatLog.objects.get_or_create(
                external_id=f"MSG-{i}-1",
                defaults={
                    "session_id": session.session_id,
                    "channel": "WEB",
                    "question": "Xin chào, tôi cần hỗ trợ",
                    "external_created_at": now - timedelta(hours=1),
                }
            )
            ChatbotChatLog.objects.get_or_create(
                external_id=f"MSG-{i}-2",
                defaults={
                    "session_id": session.session_id,
                    "channel": "WEB",
                    "answer": "Chào bạn, tôi có thể giúp gì cho bạn?",
                    "external_created_at": now - timedelta(hours=1, seconds=-2),
                }
            )
        self.stdout.write("Seeded Chatbot models.")

    def seed_notifications(self, now):
        if self.users:
            for i in range(5):
                Notification.objects.get_or_create(
                    title=f"Thông báo hệ thống {i+1}",
                    defaults={
                        "content": f"Đây là nội dung thông báo giả lập {i+1}.",
                        "user": random.choice(self.users),
                        "notification_type": "SYSTEM",
                        "is_read": False,
                        "created_at": now,
                    }
                )
        self.stdout.write("Seeded Notifications models.")
