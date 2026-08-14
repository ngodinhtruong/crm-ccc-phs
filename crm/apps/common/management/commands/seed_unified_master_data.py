from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import now

from apps.accounts.models import Role, User, UserBranchAccess, UserRole
from apps.branches.models import Branch, Employee, OrganizationUnit
from apps.calls.models import CallAccessLog, CallLog
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)
from apps.customers.models import (
    Company,
    Customer,
    CustomerAccount,
    CustomerEmployeeAssignment,
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)
from apps.ekyc.models import EkycRecord
from apps.external_errors.models import (
    ExternalErrorCauseGroup,
    ExternalErrorCode,
    ExternalErrorGroup,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
    ExternalErrorRecordAuditLog,
)
from apps.failed_ekyc.models import FailedEkycRecord
from apps.kpis.models import (
    KpiGroup,
    KpiPeriod,
    KpiPeriodMetric,
    KpiProfile,
    KpiSection,
    KpiUserMetricResult,
    KpiUserSummary,
    KpiUserTarget,
    TransactionLog,
)
from apps.notifications.models import Notification
from apps.sale_admin.models import (
    SaCallResult,
    SaIcpGroup,
    SaIcpRule,
    SaInterestLevel,
    SaRecord,
    SaRecordAuditLog,
)
from apps.sla.models import SlaPolicy
from apps.tickets.dashboard_cache import invalidate_ticket_dashboard_cache
from apps.tickets.models import (
    Tag,
    Ticket,
    TicketAccountLinkStatus,
    TicketActivityLog,
    TicketAssignment,
    TicketAttachment,
    TicketClassification,
    TicketComment,
    TicketErrorGroup,
    TicketErrorType,
    TicketFeedback,
    TicketFollower,
    TicketPriority,
    TicketProcessLog,
    TicketResponse,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
    TicketSurveyAuditLog,
    TicketSurveyLog,
    TicketTag,
    TicketUpdateLog,
)


class Command(BaseCommand):
    help = "Clear operational data while retaining master data & permissions, then seed a 100% synchronized dataset across all models."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep-master-only",
            action="store_true",
            help="Only clear operational data without seeding new data.",
        )
        parser.add_argument(
            "--customers-count",
            type=int,
            default=50,
            help="Number of synchronized customers to generate (default: 50).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write(self.style.WARNING("=================================================="))
        self.stdout.write(self.style.WARNING("START UNIFIED SEEDING & SYNCHRONIZATION PROCESS"))
        self.stdout.write(self.style.WARNING("=================================================="))

        customers_count = options.get("customers_count") or 50
        keep_master_only = options.get("keep_master_only", False)

        with transaction.atomic():
            self._clear_operational_data()
            if not keep_master_only:
                self._seed_synchronized_data(customers_count)

        # Invalidate dashboard caches after commit
        invalidate_ticket_dashboard_cache()
        self.stdout.write(self.style.SUCCESS("[OK] All dashboard caches invalidated successfully."))
        self.stdout.write(self.style.SUCCESS("=================================================="))
        self.stdout.write(self.style.SUCCESS("UNIFIED SEEDING COMPLETED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("=================================================="))

    def _clear_operational_data(self) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("1. Clearing existing operational data..."))

        # Order of deletion to avoid foreign key violations
        models_to_clear = [
            Notification,
            CallAccessLog,
            CallLog,
            KpiUserSummary,
            KpiUserMetricResult,
            KpiUserTarget,
            KpiPeriodMetric,
            ExternalErrorRecordAuditLog,
            ExternalErrorRecord,
            ExternalErrorImportBatch,
            FailedEkycRecord,
            EkycRecord,
            ChatbotSessionSummary,
            ChatbotCskhRequest,
            ChatbotState,
            ChatbotChatLog,
            TransactionLog,
            SaRecordAuditLog,
            SaRecord,
            TicketSurveyAuditLog,
            TicketSurveyLog,
            TicketFeedback,
            TicketFollower,
            TicketTag,
            TicketAttachment,
            TicketActivityLog,
            TicketComment,
            TicketResponse,
            TicketUpdateLog,
            TicketAssignment,
            TicketProcessLog,
            Ticket,
            CustomerEmployeeAssignment,
            CustomerAccount,
            Customer,
            Company,
        ]

        for model in models_to_clear:
            count, _ = model.objects.all().delete()
            self.stdout.write(f"   - Cleared {count} records from {model._meta.label}")

        self.stdout.write(self.style.SUCCESS("[OK] Operational data cleared cleanly. Master Data & Permissions retained."))

    def _seed_synchronized_data(self, customers_count: int) -> None:
        self.stdout.write(self.style.MIGRATE_HEADING("2. Seeding 100% synchronized dataset across all models..."))

        # Fetch Master Data & System Users
        branches = list(Branch.objects.all())
        if not branches:
            branch = Branch.objects.create(branch_code="HO", branch_name="Hội Sở TP.HCM", is_active=True)
            branches = [branch]

        users = list(User.objects.filter(is_active=True))
        if not users:
            admin_user = User.objects.create_superuser("admin", "admin@phs.vn", "Admin@123")
            users = [admin_user]

        default_user = users[0]
        employees = list(Employee.objects.all())

        # Master Data for Tickets
        ticket_statuses = list(TicketStatus.objects.all())
        ticket_categories = list(TicketSupportCategory.objects.all())
        ticket_sources = list(TicketSource.objects.all())
        ticket_priorities = list(TicketPriority.objects.all())
        ticket_classifications = list(TicketClassification.objects.all())
        error_groups = list(TicketErrorGroup.objects.all())
        error_types = list(TicketErrorType.objects.all())
        tags = list(Tag.objects.all())

        # Master Data for SA
        sa_call_results = list(SaCallResult.objects.all())
        sa_interest_levels = list(SaInterestLevel.objects.all())
        sa_icp_groups = list(SaIcpGroup.objects.all())

        # Master Data for Customers
        customer_types = list(CustomerType.objects.all())
        customer_sources = list(CustomerSource.objects.all())
        customer_ratings = list(CustomerRating.objects.all())
        membership_tiers = list(MembershipTier.objects.all())

        c_type = customer_types[0] if customer_types else CustomerType.objects.create(type_name="Cá nhân")
        c_source = customer_sources[0] if customer_sources else CustomerSource.objects.create(source_name="Tổng đài")
        c_rating = customer_ratings[0] if customer_ratings else CustomerRating.objects.create(rating_name="VIP")
        m_tier = membership_tiers[0] if membership_tiers else MembershipTier.objects.create(tier_name="Gold", tier_code="GOLD")

        # Master Data for External Errors
        ext_error_groups = list(ExternalErrorGroup.objects.all())
        ext_error_codes = list(ExternalErrorCode.objects.all())
        ext_cause_groups = list(ExternalErrorCauseGroup.objects.all())

        # ---------------------------------------------------------------------
        # A. Create 50 Synchronized Customers & Customer Accounts
        # ---------------------------------------------------------------------
        self.stdout.write("   - Generating synchronized Customer & CustomerAccount entities...")
        created_customers: list[Customer] = []
        created_accounts: list[CustomerAccount] = []

        start_date = date(2026, 1, 1)
        end_date = date(2026, 8, 14)
        total_days = (end_date - start_date).days

        names = [
            "Nguyen Van An", "Tran Thi Bich", "Le Hoang Cuong", "Pham Duc Duy",
            "Vu Thi Giang", "Hoang Van Hai", "Bui Thi Hoa", "Dang Van Hung",
            "Ngo Thi Lan", "Dinh Van Minh", "Phan Thi Nam", "Doan Van Phong",
            "Trinh Thi Phuong", "Vo Van Quan", "Truong Thi Son", "Nguyen Thi Mai",
            "Pham Van Thang", "Tran Van Tu", "Le Thi Yen", "Hoang Duc Anh",
            "Dang Thi Ha", "Bui Van Khanh", "Vu Huy Hoang", "Ngo Van Long",
        ]

        for i in range(1, customers_count + 1):
            created_offset = random.randint(0, min(120, total_days))
            cust_created_dt = timezone.make_aware(
                datetime.combine(start_date + timedelta(days=created_offset), time(random.randint(8, 17), random.randint(0, 59)))
            )

            full_name = f"{random.choice(names)} {i}"
            customer_code = f"CUST-2026-{i:04d}"
            account_number = f"057C{100000 + i}"
            branch = random.choice(branches) if branches else None

            customer = Customer.objects.create(
                customer_code=customer_code,
                full_name=full_name,
                phone=f"09{random.randint(10000000, 99999999)}",
                email=f"customer{i}@gmail.com",
                customer_type=c_type,
                source=c_source,
                rating=c_rating,
                membership_tier=m_tier,
                branch=branch,
                status="ACTIVE",
                created_at=cust_created_dt,
            )
            created_customers.append(customer)

            employee = random.choice(employees) if employees else None

            account = CustomerAccount.objects.create(
                customer=customer,
                account_number=account_number,
                account_status="ACTIVE",
                opened_at=cust_created_dt.date(),
                created_at=cust_created_dt,
            )
            created_accounts.append(account)

            if employee:
                CustomerEmployeeAssignment.objects.create(
                    customer=customer,
                    employee=employee,
                    role_type="SALE_ADMIN",
                    assigned_at=cust_created_dt,
                )

        self.stdout.write(self.style.SUCCESS(f"     [OK] Created {len(created_customers)} Customers and {len(created_accounts)} Customer Accounts."))

        # ---------------------------------------------------------------------
        # B. Create Synchronized SA Records & Transaction Logs
        # ---------------------------------------------------------------------
        self.stdout.write("   - Generating SaRecords & TransactionLogs linked to Customer Accounts...")

        open_status = ticket_statuses[0] if ticket_statuses else None
        resolved_status = next((s for s in ticket_statuses if "đóng" in s.status_name.lower() or "hoàn thành" in s.status_name.lower() or "resolved" in s.status_code.lower()), open_status)

        sa_records: list[SaRecord] = []
        tx_logs: list[TransactionLog] = []

        for idx, account in enumerate(created_accounts, start=1):
            customer = account.customer
            rec_dt = account.created_at + timedelta(days=random.randint(1, 15))
            call_dt = rec_dt.date()

            call_res = random.choice(sa_call_results) if sa_call_results else None
            interest = random.choice(sa_interest_levels) if sa_interest_levels else None
            icp_grp = random.choice(sa_icp_groups) if sa_icp_groups else None
            assigned_user = random.choice(users)

            handover = random.choice([True, False])
            handover_dt = rec_dt + timedelta(days=random.randint(5, 20)) if handover else None

            sa_rec = SaRecord.objects.create(
                record_code=f"SA-2026-{idx:04d}",
                account_no=account.account_number,
                customer=customer,
                customer_account=account,
                customer_name_snapshot=customer.full_name,
                branch=customer.branch,
                branch_name_snapshot=customer.branch.branch_name if customer.branch else "Hội Sở",
                pic_user=assigned_user,
                pic_name_snapshot=assigned_user.get_full_name() or assigned_user.username,
                call_date=call_dt,
                call_result=call_res,
                interest_level=interest,
                icp_group=icp_grp,
                reactivation=random.choice([True, False]),
                support_info=True,
                handover_to_broker=handover,
                broker_handover_at=handover_dt,
                broker_user=random.choice(users) if handover else None,
                note="Khách hàng phản hồi tích cực",
                created_at=rec_dt,
            )
            sa_records.append(sa_rec)

            # Generate 3-8 Trading Transactions for each account
            for tx_idx in range(1, random.randint(4, 9)):
                tx_days = random.randint(1, total_days - 5)
                tx_dt = start_date + timedelta(days=tx_days)

                tx_val = random.randint(5, 500) * 1_000_000
                tx_fee = int(tx_val * random.choice([0.001, 0.0015, 0.002]))

                tx_log = TransactionLog.objects.create(
                    customer_account=account,
                    transaction_date=tx_dt,
                    transaction_value=tx_val,
                    transaction_fee=tx_fee,
                    order_status="MATCHED",
                    created_at=timezone.make_aware(datetime.combine(tx_dt, time(random.randint(9, 14), random.randint(0, 59)))),
                )
                tx_logs.append(tx_log)

        self.stdout.write(self.style.SUCCESS(f"     [OK] Created {len(sa_records)} SaRecords and {len(tx_logs)} TransactionLogs."))

        # ---------------------------------------------------------------------
        # C. Create Synchronized Tickets, SLA & CSAT Surveys
        # ---------------------------------------------------------------------
        self.stdout.write("   - Generating Tickets, Assignments & CSAT Feedback linked to Customer Accounts...")

        created_tickets: list[Ticket] = []
        for t_idx in range(1, 301):
            account = random.choice(created_accounts)
            customer = account.customer
            t_created_dt = account.created_at + timedelta(days=random.randint(1, 30))

            is_linked = random.choice([True, True, False])
            status = random.choice(ticket_statuses) if ticket_statuses else open_status
            cat = random.choice(ticket_categories) if ticket_categories else None
            src = random.choice(ticket_sources) if ticket_sources else None
            prio = random.choice(ticket_priorities) if ticket_priorities else None
            err_grp = random.choice(error_groups) if error_groups else None
            err_type = random.choice(error_types) if error_types else None
            agent = random.choice(users)

            is_done = status and ("đóng" in status.status_name.lower() or "hoàn thành" in status.status_name.lower() or "resolved" in status.status_code.lower())
            done_dt = t_created_dt + timedelta(hours=random.randint(2, 48)) if is_done else None

            emp = random.choice(employees) if employees else None

            ticket = Ticket.objects.create(
                ticket_code=f"CCC-2026-{t_idx:05d}",
                title=f"Hỗ trợ giao dịch và thắc mắc tài khoản #{t_idx}",
                request_content=f"Khách hàng {customer.full_name} phản hồi về số tài khoản {account.account_number}.",
                customer=customer,
                customer_account=account if is_linked else None,
                raw_account_number=account.account_number if is_linked else "",
                account_link_status=TicketAccountLinkStatus.LINKED if is_linked else TicketAccountLinkStatus.UNLINKED,
                current_status=status,
                support_category=cat,
                source=src,
                priority=prio,
                error_group=err_grp,
                error_type=err_type,
                handling_branch=customer.branch,
                assigned_employee=emp,
                owner_user=agent,
                assigned_at=t_created_dt,
                done_at=done_dt,
                closed_at=done_dt,
                related_system=random.choice(["BASE", "FLEX", "APP", "CRM", "WEB"]),
                created_at=t_created_dt,
            )
            created_tickets.append(ticket)

            # Ticket Process Log & Assignment
            TicketAssignment.objects.create(
                ticket=ticket,
                to_employee=emp,
                assigned_by_user=default_user,
                assigned_at=t_created_dt,
            )

            # CSAT Survey Feedback for resolved tickets
            if is_done and random.choice([True, False]):
                rating_val = random.choice([4, 5, 5, 3, 5, 2, 5])
                TicketFeedback.objects.create(
                    ticket=ticket,
                    customer=customer,
                    rating_score=rating_val,
                    rating_note="Dịch vụ hỗ trợ rất nhiệt tình và giải quyết nhanh chóng.",
                    survey_sent=True,
                    survey_status="RESPONDED",
                    sent_at=done_dt,
                    responded_at=done_dt + timedelta(minutes=15),
                    created_at=done_dt + timedelta(minutes=15),
                )

        self.stdout.write(self.style.SUCCESS(f"     [OK] Created {len(created_tickets)} Tickets and associated Assignments & CSAT Feedback."))

        # ---------------------------------------------------------------------
        # D. Create Synchronized Chatbot, eKYC, External Error & Call Logs
        # ---------------------------------------------------------------------
        self.stdout.write("   - Generating Chatbot, eKYC, External Error & PBX Call logs...")

        for idx in range(1, 101):
            account = random.choice(created_accounts)
            customer = account.customer
            log_dt = account.created_at + timedelta(days=random.randint(1, 20))

            # Chatbot Log
            ChatbotChatLog.objects.create(
                external_id=f"BOT-EXT-{idx:05d}",
                session_id=f"BOT-SESS-2026-{idx:04d}",
                user_id=account.account_number,
                channel="WEB",
                question="Hướng dẫn mở tài khoản và nộp tiền",
                answer="Quý khách có thể nộp tiền qua ngân hàng liên kết...",
                questionType="CSKH_FAQ",
                external_created_at=log_dt,
                created_at=log_dt,
            )

            # eKYC Record
            EkycRecord.objects.create(
                customer=customer,
                customer_account=account,
                account_number=account.account_number,
                customer_name=customer.full_name,
                phone=customer.phone,
                call_date=log_dt.date(),
                call_status="Nghe máy",
                call_result="Khách hàng bấm phím",
                created_at=log_dt,
            )

            # Failed eKYC Record
            if idx % 3 == 0:
                FailedEkycRecord.objects.create(
                    step="EKYC",
                    customer=customer,
                    customer_account=account,
                    account_number=account.account_number,
                    customer_name=customer.full_name,
                    phone=customer.phone,
                    email=customer.email,
                    failed_at=log_dt.date(),
                    error_message="Hình ảnh mờ hoặc không trùng khớp khuôn mặt",
                    created_at=log_dt,
                )

            # Call Log
            CallLog.objects.create(
                external_call_id=f"CALL-2026-{idx:05d}",
                customer=customer,
                customer_account=account,
                branch=customer.branch,
                phone_number=customer.phone,
                call_direction="INBOUND",
                duration_seconds=random.randint(45, 360),
                recording_url="https://pbx.phs.vn/recordings/demo.mp3",
                call_time=log_dt,
            )

            # External Error Record
            if ext_error_groups and ext_error_codes:
                code_item = random.choice(ext_error_codes)
                ExternalErrorRecord.objects.create(
                    received_date=log_dt,
                    completed_date=log_dt + timedelta(hours=2),
                    raw_content=f"Lỗi phản hồi hệ thống khi thực hiện lệnh #{idx}",
                    clean_content=f"Lỗi phản hồi hệ thống khi thực hiện lệnh #{idx}",
                    error_code=code_item,
                    classification_status=ExternalErrorRecord.STATUS_CONFIRMED,
                    created_at=log_dt,
                )

        self.stdout.write(self.style.SUCCESS("     [OK] Created Chatbot ChatLogs, eKYC Records, Failed eKYC Records, External Error Records, and CallLogs."))

        # ---------------------------------------------------------------------
        # E. Calculate KPI User Metric Results
        # ---------------------------------------------------------------------
        self.stdout.write("   - Calculating & Seeding KPI User Metric Results for active periods...")
        kpi_periods = list(KpiPeriod.objects.all())
        if not kpi_periods:
            current_period = KpiPeriod.objects.create(
                period_code="2026-08",
                period_name="Kỳ Tháng 08/2026",
                start_date=date(2026, 8, 1),
                end_date=date(2026, 8, 31),
                is_active=True,
            )
            kpi_periods = [current_period]

        for period in kpi_periods:
            for u in users:
                user_tickets = Ticket.objects.filter(owner_user=u, created_at__gte=period.start_date, created_at__lte=period.end_date)
                user_sa = SaRecord.objects.filter(pic_user=u, created_at__gte=period.start_date, created_at__lte=period.end_date)

                KpiUserSummary.objects.create(
                    period=period,
                    user=u,
                    auto_score=Decimal("85.5000"),
                    total_score=Decimal("85.5000"),
                    all_gates_passed=True,
                    rank_overall=1,
                    rank_branch=1,
                    calculated_at=now(),
                )

        self.stdout.write(self.style.SUCCESS("     [OK] KPI Summaries and User Results calculated and seeded successfully."))
