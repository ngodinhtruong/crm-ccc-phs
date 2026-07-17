from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import date, timedelta
import random

from apps.branches.models import Branch, Employee
from apps.customers.models import Customer, CustomerAccount, MembershipTier, CustomerType
from apps.tickets.models import (
    Ticket,
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketSupportCategory,
    TicketClassification,
)
from apps.sale_admin.models import SaRecord, SaIcpGroup, SaCallResult, SaInterestLevel
from apps.kpis.models import TransactionLog

User = get_user_model()


class Command(BaseCommand):
    help = "Seed realistic data for General Dashboard: CustomerAccounts, SaRecords, TransactionLogs, and link Tickets"

    def handle(self, *args, **options):
        self.stdout.write("Starting general dashboard seeding...")

        # 1. Ensure we have the base branch, employees, and user
        branch = Branch.objects.get_or_create(
            branch_code="HO",
            defaults={"branch_name": "Hội sở", "status": "ACTIVE"},
        )[0]
        
        employee = Employee.objects.first()
        user = User.objects.first()

        # 2. Get or create membership tiers & customer types
        gold_tier = MembershipTier.objects.get_or_create(tier_code="GOLD", defaults={"tier_name": "Gold Member"})[0]
        silver_tier = MembershipTier.objects.get_or_create(tier_code="SILVER", defaults={"tier_name": "Silver Member"})[0]
        bronze_tier = MembershipTier.objects.get_or_create(tier_code="BRONZE", defaults={"tier_name": "Bronze Member"})[0]

        individual_type = CustomerType.objects.get_or_create(type_code="INDIVIDUAL", defaults={"type_name": "Cá nhân"})[0]
        company_type = CustomerType.objects.get_or_create(type_code="COMPANY", defaults={"type_name": "Công ty"})[0]

        # 3. Create/Retrieve Customers
        customers = list(Customer.objects.all())
        if not customers:
            self.stdout.write("No customers found. Running seed_test_data first.")
            from django.core.management import call_command
            call_command("seed_test_data")
            customers = list(Customer.objects.all())

        # Make sure they have membership tiers assigned
        tiers_list = [gold_tier, silver_tier, bronze_tier]
        for idx, cust in enumerate(customers):
            cust.membership_tier = tiers_list[idx % len(tiers_list)]
            cust.save()

        # 4. Create CustomerAccounts for customers
        accounts = []
        for idx, customer in enumerate(customers):
            acc_num = f"0001200{idx + 1:02d}"
            account, created = CustomerAccount.objects.update_or_create(
                account_number=acc_num,
                defaults={
                    "customer": customer,
                    "opened_at": date.today() - timedelta(days=random.randint(30, 365)),
                    "account_status": "ACTIVE",
                    "source_system": "CORE_PHS",
                }
            )
            accounts.append(account)
            self.stdout.write(f"CustomerAccount: {account.account_number} for customer {customer.full_name}")

        # 5. Create SaCallResult, SaInterestLevel, SaIcpGroup
        results = ["Thành công", "Không nhấc máy", "Bận", "Sai số"]
        call_results = []
        for idx, r_name in enumerate(results):
            code = f"CR_{idx + 1}"
            cr, _ = SaCallResult.objects.get_or_create(
                result_code=code,
                defaults={"result_name": r_name, "is_active": True, "sort_order": idx}
            )
            call_results.append(cr)

        levels = [("HIGH", "Rất quan tâm"), ("MEDIUM", "Quan tâm"), ("LOW", "Không quan tâm")]
        interest_levels = []
        for idx, (code, name) in enumerate(levels):
            il, _ = SaInterestLevel.objects.get_or_create(
                level_code=code,
                defaults={"level_name": name, "is_active": True, "sort_order": idx}
            )
            interest_levels.append(il)

        # ICP Groups (A-H groups)
        groups = [
            ("GROUP_A", "Nhóm A - Tiềm năng cao"),
            ("GROUP_B", "Nhóm B - Tiềm năng trung bình"),
            ("GROUP_C", "Nhóm C - Đã kích hoạt"),
            ("GROUP_D", "Nhóm D - Chưa kích hoạt"),
            ("GROUP_E", "Nhóm E - Ít tương tác"),
            ("GROUP_F", "Nhóm F - Cần chăm sóc"),
            ("GROUP_G", "Nhóm G - Khác"),
            ("GROUP_H", "Nhóm H - Chờ phản hồi"),
        ]
        icp_groups = []
        for idx, (code, name) in enumerate(groups):
            ig, _ = SaIcpGroup.objects.get_or_create(
                icp_code=code,
                defaults={
                    "icp_name": name,
                    "icp_type": SaIcpGroup.TYPE_POTENTIAL if idx < 3 else SaIcpGroup.TYPE_NURTURE,
                    "is_potential": idx < 3,
                    "is_active": True,
                    "sort_order": idx
                }
            )
            icp_groups.append(ig)

        # 6. Create SaRecords
        for idx, customer in enumerate(customers):
            account = accounts[idx]
            # Create a record for each customer
            SaRecord.objects.create(
                record_code=f"REC_00{idx + 1}",
                account_no=account.account_number,
                customer_name_snapshot=customer.full_name,
                branch_name_snapshot="Hội sở",
                pic_name_snapshot=employee.full_name if employee else "Hệ thống",
                account_status="ACTIVE",
                customer=customer,
                branch=branch,
                pic_employee=employee,
                pic_user=user,
                call_date=date.today() - timedelta(days=random.randint(1, 15)),
                call_result=random.choice(call_results),
                interest_level=random.choice(interest_levels),
                icp_group=random.choice(icp_groups),
                reactivation=(idx % 2 == 0), # alternate reactivation
                reactivation_confirmed_at=timezone.now() if (idx % 2 == 0) else None,
                introduced_product=(idx % 3 == 0),
                support_info=(idx % 4 == 0),
            )
        self.stdout.write("Created SaRecords successfully.")

        # 7. Create TransactionLogs
        products = ["STOCK_BUY", "STOCK_SELL", "BOND_BUY", "BOND_SELL", "DERIV_BUY", "DERIV_SELL"]
        systems = ["CORE_PHS", "MOBILE_APP", "WEB_TRADING"]
        statuses = ["KHOP_TOANBO", "KHOP_MOTPHAN", "CHO_KHOP"]

        for idx, customer in enumerate(customers):
            account = accounts[idx]
            # 3 transactions per customer account
            for tx_idx in range(3):
                prod = random.choice(products)
                val = random.randint(100_000_000, 5_000_000_000) # 100M to 5B
                fee = int(val * 0.0015) # 0.15% fee
                
                TransactionLog.objects.create(
                    account_no=account.account_number,
                    customer=customer,
                    customer_account=account,
                    branch=branch,
                    transaction_date=date.today() - timedelta(days=random.randint(1, 20)),
                    transaction_value=val,
                    transaction_fee=fee,
                    order_status=random.choice(statuses),
                    product_code=prod,
                    source_system=random.choice(systems),
                    source_transaction_id=f"TX_{idx + 1}_{tx_idx + 1}"
                )
        self.stdout.write("Created TransactionLogs successfully.")

        # 8. Link seeded Tickets to CustomerAccounts
        tickets = list(Ticket.objects.all())
        for idx, t in enumerate(tickets):
            assigned_account = accounts[idx % len(accounts)]
            t.customer_account = assigned_account
            t.customer = assigned_account.customer
            t.save()
            self.stdout.write(f"Linked ticket {t.ticket_code} to customer account {assigned_account.account_number}")

        self.stdout.write(self.style.SUCCESS("All general dashboard data seeded successfully!"))
