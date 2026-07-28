from collections import Counter
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.branches.models import Employee
from apps.customers.models import CustomerAccount
from apps.kpis.models import TransactionLog
from apps.sale_admin.models import (
    SaCallResult,
    SaIcpGroup,
    SaInterestLevel,
    SaRecord,
)


SA_EMPLOYEE_CODES = [
    "HOQ7_SA_STAFF",
    "Q1_SA_STAFF",
    "Q3_SA_STAFF",
    "TB_SA_STAFF",
    "TX_SA_STAFF",
    "HN_SA_STAFF",
    "HP_SA_STAFF",
]

MATCHED_STATUSES = [
    "MATCHED",
    "PARTIALLY_MATCHED",
    "COMPLETED",
]


class Command(BaseCommand):
    help = (
        "Tạo 50 SaRecord khớp với CustomerAccount và TransactionLog, "
        "phân đều cho SA tại tất cả chi nhánh."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Số tài khoản cần tạo SaRecord, mặc định 50.",
        )
        parser.add_argument(
            "--reactivated",
            type=int,
            default=30,
            help="Số tài khoản tái kích hoạt thành công, mặc định 30.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        reactivated_count = options["reactivated"]

        if count <= 0:
            raise CommandError("--count phải lớn hơn 0.")

        if reactivated_count < 0 or reactivated_count > count:
            raise CommandError("--reactivated phải nằm trong khoảng từ 0 đến --count.")

        sa_staff = self.get_sa_staff()

        call_results = list(SaCallResult.objects.all().order_by("id"))
        interest_levels = list(SaInterestLevel.objects.all().order_by("id"))
        icp_groups = list(SaIcpGroup.objects.all().order_by("id"))

        if not call_results:
            raise CommandError("Chưa có dữ liệu SaCallResult.")

        accounts = list(
            CustomerAccount.objects.select_related(
                "customer",
                "customer__branch",
                "customer__membership_tier",
            )
            .filter(
                customer__customer_code__startswith="FAKE_HSQ7_",
                account_status="ACTIVE",
            )
            .order_by("customer__customer_code")[:count]
        )

        if len(accounts) < count:
            raise CommandError(
                f"Chỉ tìm thấy {len(accounts)} tài khoản khách hàng mẫu, "
                f"không đủ {count}. Hãy seed CustomerAccount trước."
            )

        deleted_count, _ = SaRecord.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(
                f"Đã xóa toàn bộ {deleted_count} bản ghi SaRecord trước khi seed."
            )
        )

        now = timezone.now()
        branch_distribution = Counter()
        created_count = 0
        updated_count = 0
        successful_reactivation_count = 0

        for index, customer_account in enumerate(accounts, start=1):
            employee, pic_user = sa_staff[(index - 1) % len(sa_staff)]
            branch = employee.branch
            customer = customer_account.customer
            is_reactivated = index <= reactivated_count

            # Đồng bộ Customer và TransactionLog theo chi nhánh của PIC SA.
            # CustomerEmployeeAssignment CCC HS_Q7 vẫn được giữ nguyên.
            if customer.branch_id != branch.id:
                customer.branch = branch
                customer.save(update_fields=["branch", "updated_at"])

            transactions_qs = TransactionLog.objects.filter(
                customer_account=customer_account
            ).order_by("transaction_date", "id")

            if not transactions_qs.exists():
                raise CommandError(
                    f"Tài khoản {customer_account.account_number} chưa có TransactionLog."
                )

            transactions_qs.update(branch=branch)

            if is_reactivated:
                call_date, confirmed_at = self.prepare_reactivated_transactions(
                    transactions_qs
                )

                matched_after_call = transactions_qs.filter(
                    order_status__in=MATCHED_STATUSES,
                    transaction_date__gte=call_date,
                )

                snapshot = matched_after_call.aggregate(
                    total_value=Sum("transaction_value"),
                    total_fee=Sum("transaction_fee"),
                )

                transaction_value_snapshot = (
                    snapshot["total_value"] or Decimal("0.00")
                )
                transaction_fee_snapshot = (
                    snapshot["total_fee"] or Decimal("0.00")
                )

                account_status = "REACTIVATED"
                successful_reactivation_count += 1
            else:
                latest_transaction_date = transactions_qs.order_by(
                    "-transaction_date"
                ).values_list(
                    "transaction_date",
                    flat=True,
                ).first()

                call_date = latest_transaction_date + timedelta(days=5)
                confirmed_at = None
                transaction_value_snapshot = Decimal("0.00")
                transaction_fee_snapshot = Decimal("0.00")
                account_status = "INACTIVE"

            call_result = call_results[(index - 1) % len(call_results)]
            interest_level = (
                interest_levels[(index - 1) % len(interest_levels)]
                if interest_levels
                else None
            )
            icp_group = (
                icp_groups[(index - 1) % len(icp_groups)]
                if icp_groups
                else None
            )

            record_code = f"FAKE-SA-HSQ7-{index:04d}"

            _, created = SaRecord.objects.update_or_create(
                record_code=record_code,
                defaults={
                    "account_no": customer_account.account_number,
                    "customer_name_snapshot": customer.full_name,
                    "branch_name_snapshot": branch.branch_name,
                    "pic_name_snapshot": employee.full_name,
                    "account_status": account_status,
                    "vip_classification": (
                        customer.membership_tier.tier_name
                        if customer.membership_tier
                        else None
                    ),
                    "customer_account": customer_account,
                    "customer": customer,
                    "company": customer.company,
                    "branch": branch,
                    "pic_user": pic_user,
                    "pic_employee": employee,
                    "call_date": call_date,
                    "follow_no": 1,
                    "call_result": call_result,
                    "interest_level": interest_level,
                    "icp_group": icp_group,
                    "reactivation": is_reactivated,
                    "reactivation_confirmed_at": confirmed_at,
                    "introduced_product": True,
                    "support_info": True,
                    "referred_rm": is_reactivated and index % 2 == 0,
                    "handover_to_broker": False,
                    "broker_user": None,
                    "broker_employee": None,
                    "broker_handover_at": None,
                    "broker_handover_note": None,
                    "transaction_fee_snapshot": transaction_fee_snapshot,
                    "transaction_value_snapshot": transaction_value_snapshot,
                    "note": (
                        "Khách hàng đã phát sinh lệnh khớp sau cuộc gọi."
                        if is_reactivated
                        else "Chưa phát sinh lệnh khớp sau cuộc gọi."
                    ),
                    "source_system": SaRecord.SOURCE_CRM_MINI,
                    "source_call_id": f"FAKE-CALL-HSQ7-{index:04d}",
                    "data_status": SaRecord.STATUS_VALID,
                    "created_by_user": pic_user,
                    "updated_by_user": pic_user,
                },
            )

            branch_distribution[branch.branch_code] += 1

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write("\nPhân bổ SaRecord theo chi nhánh:")
        for employee, _ in sa_staff:
            branch_code = employee.branch.branch_code
            self.stdout.write(
                f"- {branch_code:<8}: "
                f"{branch_distribution[branch_code]:>2} bản ghi "
                f"({employee.employee_code} - {employee.full_name})"
            )

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== HOÀN TẤT TẠO SA RECORD ===\n"
                f"- Tổng SaRecord: {count}\n"
                f"- Tái kích hoạt hợp lệ: {successful_reactivation_count}\n"
                f"- Chưa tái kích hoạt: {count - successful_reactivation_count}\n"
                f"- Tạo mới: {created_count}\n"
                f"- Cập nhật: {updated_count}\n"
                "- Phân bổ dự kiến với 50 bản ghi: 8, 7, 7, 7, 7, 7, 7"
            )
        )

    def get_sa_staff(self):
        result = []

        for employee_code in SA_EMPLOYEE_CODES:
            employee = Employee.objects.select_related("branch").filter(
                employee_code=employee_code,
                status="ACTIVE",
            ).first()

            if employee is None:
                raise CommandError(
                    f"Không tìm thấy nhân viên SA đang hoạt động: {employee_code}"
                )

            pic_user = User.objects.filter(
                employee=employee,
                is_active=True,
            ).first()

            if pic_user is None:
                raise CommandError(
                    f"Nhân viên {employee_code} chưa có tài khoản User đang hoạt động."
                )

            result.append((employee, pic_user))

        return result

    @staticmethod
    def prepare_reactivated_transactions(transactions_qs):
        first_transaction = transactions_qs.first()
        call_date = first_transaction.transaction_date - timedelta(days=3)

        matched_transaction = transactions_qs.filter(
            order_status__in=MATCHED_STATUSES
        ).first()

        if matched_transaction is None:
            matched_transaction = first_transaction
            matched_transaction.order_status = "MATCHED"

        if matched_transaction.transaction_date < call_date:
            matched_transaction.transaction_date = call_date + timedelta(days=1)

        confirmed_at = matched_transaction.matched_at

        if confirmed_at is None or confirmed_at.date() < call_date:
            confirmed_at = timezone.make_aware(
                datetime.combine(
                    matched_transaction.transaction_date,
                    time(hour=10, minute=0),
                )
            )
            matched_transaction.matched_at = confirmed_at

        matched_transaction.save(
            update_fields=[
                "order_status",
                "transaction_date",
                "matched_at",
                "updated_at",
            ]
        )

        return call_date, confirmed_at
