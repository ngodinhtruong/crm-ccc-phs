import random
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.branches.models import Branch, Employee
from apps.customers.models import Customer, CustomerAccount
from apps.sale_admin.models import (
    SaCallResult,
    SaIcpGroup,
    SaInterestLevel,
    SaRecord,
)

User = get_user_model()


# Mẫu ghi chú đa dạng cho từng loại cuộc gọi
ANSWERED_NOTES = [
    "KH quan tâm gói sản phẩm Margin ưu đãi 8.8%, đề nghị gửi bảng phí qua Zalo.",
    "KH phản hồi thị trường biến động nên tạm dừng giao dịch, hẹn gọi lại vào tuần sau.",
    "Đã hướng dẫn KH thao tác tái kích hoạt tài khoản thành công qua ứng dụng.",
    "KH hỏi về điều kiện nâng hạng VIP và chính sách giảm phí giao dịch.",
    "KH cần hỗ trợ đăng ký mở tài khoản Ký quỹ (Margin) trực tuyến.",
    "Đã tư vấn dịch vụ tư vấn đầu tư chuyên sâu, KH hào hứng và hẹn gặp trực tiếp.",
    "KH có nhu cầu rút vốn chuyển kênh đầu tư khác, SA đã tư vấn giữ chân.",
    "KH phản hồi hệ thống đặt lệnh nhanh chóng, sẽ tiếp tục giao dịch thường xuyên.",
    "KH bận họp, yêu cầu SA liên hệ lại sau 17h00 cùng ngày.",
    "Đã tư vấn gói Margin T+3, KH đồng ý trải nghiệm thử với quy mô tài sản nhỏ.",
    "KH thắc mắc về lịch sao kê tài khoản và thuế TNCN giao dịch chứng khoán.",
    "KH cần môi giới hỗ trợ tư vấn danh mục đầu tư dài hạn.",
]

NO_ANSWER_NOTES = [
    "Số điện thoại đổ chuông nhưng không có người nghe máy. Đã gọi 2 lần.",
    "Máy bận. Đã gửi tin nhắn Zalo chăm sóc tự động.",
    "KH không bắt máy, hẹn thử liên hệ lại vào khung giờ chiều.",
    "Cuộc gọi bị hủy giữa chừng từ phía khách hàng.",
]

INVALID_NOTES = [
    "Số điện thoại báo thuê bao không liên lạc được.",
    "Số máy không tồn tại hoặc đã thay đổi chủ sở hữu.",
    "Không thể kết nối tổng đài tới số điện thoại này.",
]

BROKER_HANDOVER_NOTES = [
    "Bàn giao KH VIP cho Broker chuyên trách hỗ trợ giao dịch lớn.",
    "Chuyển Broker quản lý danh mục theo yêu cầu trực tiếp của KH.",
    "Bàn giao chi nhánh hỗ trợ làm thủ tục thay đổi thông tin hợp đồng.",
]

ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE", "DORMANT", "NEW_OPENED"]
VIP_CLASSES = ["NORMAL", "SILVER", "GOLD", "PLATINUM", "DIAMOND"]

# Phân bổ số lượng record từng tháng từ T1 -> T7 năm 2026 (Tổng = 185 record < 200)
MONTHLY_COUNTS = {
    1: 18,
    2: 22,
    3: 35,
    4: 25,
    5: 30,
    6: 28,
    7: 27,
}


class Command(BaseCommand):
    help = "Seed ~185 SA Records phân bổ từ đầu năm 2026 (T1->T7), đầy đủ các chi nhánh & nhân viên SA."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Xóa toàn bộ SaRecord hiện có trước khi seed.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = SaRecord.objects.count()
            SaRecord.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Da xoa {count} SaRecord cu."))

        self.stdout.write("Bat dau khoi tao du lieu SaRecord...")

        # Lấy Master Data
        call_results = {cr.result_code: cr for cr in SaCallResult.objects.all()}
        interest_levels = {il.level_code: il for il in SaInterestLevel.objects.all()}
        icp_groups = {icp.icp_code: icp for icp in SaIcpGroup.objects.all()}

        if not call_results or not interest_levels or not icp_groups:
            self.stdout.write(self.style.ERROR("Thiếu master data SA. Hãy chạy `python manage.py seed_sa_record_master` trước."))
            return

        branches = list(Branch.objects.all())

        if not branches:
            self.stdout.write(self.style.ERROR("Chưa có Branch trong hệ thống."))
            return

        # Map SA Users theo Branch
        sa_users_by_branch = {}
        all_sa_users = list(User.objects.filter(user_roles__role__role_code__in=["SA_STAFF", "SA_SUPERVISOR"]).distinct())

        for u in all_sa_users:
            ur = UserRole.objects.filter(user=u, role__role_code__in=["SA_STAFF", "SA_SUPERVISOR"]).first()
            br = ur.branch if ur and ur.branch else None
            if not br:
                # Gán chi nhánh dựa trên tên username nếu ur.branch null
                uname = u.username.lower()
                if "q1" in uname:
                    br = Branch.objects.filter(branch_code="CN_Q1").first()
                elif "q3" in uname:
                    br = Branch.objects.filter(branch_code="CN_Q3").first()
                elif "tanbinh" in uname or "tb" in uname:
                    br = Branch.objects.filter(branch_code="CN_TB").first()
                elif "thanhxuan" in uname or "tx" in uname:
                    br = Branch.objects.filter(branch_code="CN_TX").first()
                elif "hanoi" in uname or "hn" in uname:
                    br = Branch.objects.filter(branch_code="CN_HN").first()
                elif "haiphong" in uname or "hp" in uname:
                    br = Branch.objects.filter(branch_code="CN_HP").first()
                else:
                    br = Branch.objects.filter(branch_code="HS_Q7").first()

            if br:
                sa_users_by_branch.setdefault(br.id, []).append(u)

        # Mẫu danh sách khách hàng & tài khoản
        customer_accounts = list(CustomerAccount.objects.select_related("customer").all())
        existing_customers = list(Customer.objects.all())

        admin_user = User.objects.filter(is_superuser=True).first() or (all_sa_users[0] if all_sa_users else None)

        records_to_create = []
        record_idx = 1000

        year = 2026

        with transaction.atomic():
            for m, target_count in MONTHLY_COUNTS.items():
                self.stdout.write(f"Dang seed Thang {m}/{year}: {target_count} records...")

                # Tính ngày đầu & ngày cuối tháng (nếu T7 thì đến ngày 27)
                start_day = 1
                end_day = 27 if m == 7 else (28 if m == 2 else 30)

                for _ in range(target_count):
                    record_idx += 1
                    rec_code = f"SA{year}{m:02d}{record_idx:04d}"

                    # Chọn ngẫu nhiên Branch (đảm bảo chia đều cho tất cả các Chi nhánh)
                    branch = random.choice(branches)

                    # Chọn PIC User từ Chi nhánh này (hoặc fallback)
                    possible_pics = sa_users_by_branch.get(branch.id) or all_sa_users
                    pic_user = random.choice(possible_pics) if possible_pics else admin_user

                    # Tìm employee tương ứng với pic_user nếu có
                    pic_employee = Employee.objects.filter(branch=branch).first()

                    # Chọn Customer Account
                    if customer_accounts:
                        ca = random.choice(customer_accounts)
                        acc_no = ca.account_number
                        cust = ca.customer
                        cust_name = cust.full_name if cust else ca.account_number
                    else:
                        acc_no = f"057C{random.randint(100000, 999999)}"
                        cust = random.choice(existing_customers) if existing_customers else None
                        cust_name = cust.full_name if cust else f"Khách hàng {acc_no}"

                    # Chọn ngày gọi ngẫu nhiên trong tháng
                    day_val = random.randint(start_day, end_day)
                    call_dt = date(year, m, day_val)

                    # Xác định Loại kết quả cuộc gọi & Phân nhóm ICP
                    rand_res = random.random()
                    if rand_res < 0.65:
                        # 65% Nghe máy
                        c_res = call_results.get("ANSWERED") or random.choice(list(call_results.values()))
                        i_lev = random.choice([interest_levels.get("VERY_INTERESTED"), interest_levels.get("INTERESTED"), interest_levels.get("NO_CURRENT_NEED")])
                        icp = random.choice([icp_groups.get("A"), icp_groups.get("B"), icp_groups.get("C")])
                        note_text = random.choice(ANSWERED_NOTES)
                    elif rand_res < 0.85:
                        # 20% Không nghe máy
                        c_res = call_results.get("NO_ANSWER") or random.choice(list(call_results.values()))
                        i_lev = interest_levels.get("NOT_INTERESTED")
                        icp = random.choice([icp_groups.get("E"), icp_groups.get("D")])
                        note_text = random.choice(NO_ANSWER_NOTES)
                    elif rand_res < 0.95:
                        # 10% Thuê bao / Không hợp lệ
                        c_res = call_results.get("INVALID_PHONE") or random.choice(list(call_results.values()))
                        i_lev = None
                        icp = random.choice([icp_groups.get("F"), icp_groups.get("G")])
                        note_text = random.choice(INVALID_NOTES)
                    else:
                        # 5% Trực tiếp
                        c_res = call_results.get("DIRECT") or random.choice(list(call_results.values()))
                        i_lev = interest_levels.get("VERY_INTERESTED")
                        icp = icp_groups.get("A")
                        note_text = "Tư vấn trực tiếp tại sàn chi nhánh, KH ký hợp đồng dịch vụ."

                    # Boolean indicators
                    is_reactivation = random.choice([True, False, False, False]) # 25% tái kích hoạt
                    intro_prod = random.choice([True, True, False])
                    supp_info = random.choice([True, False])
                    ref_rm = random.choice([True, False, False])
                    handover_broker = random.choice([True, False, False, False]) # 25% bàn giao broker

                    # Financial snapshots
                    if is_reactivation or i_lev == interest_levels.get("VERY_INTERESTED"):
                        fee_snap = round(random.uniform(200000, 4500000), -3)
                        val_snap = round(random.uniform(50000000, 1500000000), -5)
                    else:
                        fee_snap = round(random.uniform(0, 500000), -3) if random.random() > 0.5 else 0
                        val_snap = round(random.uniform(0, 100000000), -5) if fee_snap > 0 else 0

                    react_time = timezone.make_aware(datetime.combine(call_dt, datetime.min.time()) + timedelta(hours=random.randint(2, 48))) if is_reactivation else None

                    broker_emp = Employee.objects.filter(branch=branch).order_by("?").first() if handover_broker else None
                    broker_time = timezone.make_aware(datetime.combine(call_dt, datetime.min.time()) + timedelta(hours=random.randint(1, 24))) if handover_broker else None
                    broker_note = random.choice(BROKER_HANDOVER_NOTES) if handover_broker else None

                    record = SaRecord(
                        record_code=rec_code,
                        account_no=acc_no,
                        customer_name_snapshot=cust_name,
                        branch_name_snapshot=branch.branch_name if branch else "Chi nhánh Q1",
                        pic_name_snapshot=pic_user.get_full_name() or pic_user.username if pic_user else "Sale Admin",
                        account_status=random.choice(ACCOUNT_STATUSES),
                        vip_classification=random.choice(VIP_CLASSES),
                        customer_account=ca if customer_accounts else None,
                        customer=cust,
                        branch=branch,
                        pic_user=pic_user,
                        pic_employee=pic_employee,
                        call_date=call_dt,
                        follow_no=random.randint(1, 4),
                        call_result=c_res,
                        interest_level=i_lev,
                        icp_group=icp,
                        reactivation=is_reactivation,
                        reactivation_confirmed_at=react_time,
                        introduced_product=intro_prod,
                        support_info=supp_info,
                        referred_rm=ref_rm,
                        handover_to_broker=handover_broker,
                        broker_user=getattr(broker_emp, "user", None) if broker_emp else None,
                        broker_employee=broker_emp,
                        broker_handover_at=broker_time,
                        broker_handover_note=broker_note,
                        transaction_fee_snapshot=fee_snap,
                        transaction_value_snapshot=val_snap,
                        note=note_text,
                        source_system=random.choice([SaRecord.SOURCE_CRM_MINI, SaRecord.SOURCE_EXCEL]),
                        data_status=SaRecord.STATUS_VALID,
                        created_by_user=admin_user,
                    )
                    records_to_create.append(record)

            SaRecord.objects.bulk_create(records_to_create)

        total_created = len(records_to_create)
        self.stdout.write(self.style.SUCCESS(f"Hoan thanh! Da khoi tao {total_created} SaRecord thanh cong."))
