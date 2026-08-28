import sys
import random
from decimal import Decimal
from datetime import datetime, time, timedelta

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.branches.models import Employee
from apps.sale_admin.models import (
    SaCallResult,
    SaIcpGroup,
    SaInterestLevel,
    SaProduct,
    SaSupportCategory,
    SaRecord,
)

SAMPLE_CARE_NOTES = [
    "Khách hàng rất quan tâm gói sản phẩm Margin T+3, đề xuất gửi tài liệu hướng dẫn qua Zalo/Email.",
    "KH thắc mắc về lỗi xác thực eKYC CCCD gắn chip, SA đã hỗ trợ cập nhật thông tin thành công.",
    "KH trao đổi về mức phí giao dịch phái sinh, đồng ý tái kích hoạt tài khoản để giao dịch thử nghiệm.",
    "Khách hàng yêu cầu đăng ký lại SĐT nhận OTP giao dịch do chuyển đổi nhà mạng.",
    "KH đang bận công tác, hẹn SA gọi lại tư vấn danh mục đầu tư vào cuối tuần.",
    "Đã bàn giao tài khoản cho Môi giới quản lý trực tiếp tư vấn chiến lược đầu tư dài hạn.",
    "KH có tài sản lớn, muốn mở rộng hạn mức giao dịch trong ngày và đăng ký gói VIP 9.9%.",
    "KH phản hồi hệ thống ổn định, đã thực hiện nạp tiền và phát sinh lệnh khớp ngay trong ngày.",
    "Hỗ trợ trích xuất sao kê tài khoản chứng khoán 6 tháng gần nhất cho khách hàng làm hồ sơ tài chính.",
    "Kích hoạt thành công Smart OTP trên thiết bị di động mới của khách hàng.",
]

class Command(BaseCommand):
    help = "Seed du lieu Cham soc khach hang phong phu cho toan bo SA Records."

    @transaction.atomic
    def handle(self, *args, **options):
        print("=== Bat dau Seed du lieu Cham soc Khach hang (Customer Care) ===")

        # 1. Dam bao co Danh muc Ho tro KH
        from apps.sale_admin.management.commands.seed_sa_support_categories import Command as SeedCatCommand
        SeedCatCommand().handle()

        # 2. Dam bao co SaProduct
        from apps.sale_admin.management.commands.seed_sa_products import Command as SeedProdCommand
        SeedProdCommand().handle()

        categories = list(SaSupportCategory.objects.filter(is_active=True))
        products = list(SaProduct.objects.filter(is_active=True))
        brokers = list(User.objects.filter(is_active=True, is_staff=True)[:10])
        broker_employees = list(Employee.objects.filter(status="ACTIVE")[:10])

        records = list(SaRecord.objects.all())
        if not records:
            print("Chua co SA Record trong CSDL. Vui long chay 'python manage.py seed_sa_records' truoc.")
            return

        updated_cnt = 0
        handover_cnt = 0
        now = timezone.now()

        for idx, record in enumerate(records):
            # Gan note cham soc khach hang phong phu
            record.note = SAMPLE_CARE_NOTES[idx % len(SAMPLE_CARE_NOTES)]

            # Lần follow phong phu (1, 2, 3)
            record.follow_no = (idx % 3) + 1

            # 75% record co ho tro thong tin
            if idx % 4 != 0 and categories:
                cat = categories[idx % len(categories)]
                record.support_info = True
                record.support_info_category_obj = cat
                record.support_info_category_name = cat.name
            else:
                record.support_info = False
                record.support_info_category_obj = None
                record.support_info_category_name = ""

            # 70% record co gioi thieu san pham
            if idx % 3 != 0 and products:
                prod = products[idx % len(products)]
                record.introduced_product = True
                record.introduced_product_obj = prod
                record.introduced_product_name = prod.name
            else:
                record.introduced_product = False
                record.introduced_product_obj = None
                record.introduced_product_name = ""

            # 35% record co ban giao moi gioi
            if idx % 3 == 0:
                record.handover_to_broker = True
                if brokers:
                    record.broker_user = brokers[idx % len(brokers)]
                if broker_employees:
                    record.broker_employee = broker_employees[idx % len(broker_employees)]
                record.broker_handover_at = now - timedelta(days=idx % 15, hours=idx % 12)
                record.broker_handover_note = f"Bàn giao khách hàng TK {record.account_no} cho Môi giới hỗ trợ tư vấn danh mục 1-on-1."
                handover_cnt += 1
            else:
                record.handover_to_broker = False
                record.broker_user = None
                record.broker_employee = None
                record.broker_handover_at = None
                record.broker_handover_note = ""

            # Referral flag cho phep bat ky nhom nao
            record.referred_rm = (idx % 2 == 0)

            record.save(update_fields=[
                "note",
                "follow_no",
                "support_info",
                "support_info_category_obj",
                "support_info_category_name",
                "introduced_product",
                "introduced_product_obj",
                "introduced_product_name",
                "handover_to_broker",
                "broker_user",
                "broker_employee",
                "broker_handover_at",
                "broker_handover_note",
                "referred_rm",
                "updated_at",
            ])
            updated_cnt += 1

        # Tinh lai usage_count cho tat ca Products & Support Categories
        for prod in products:
            cnt = SaRecord.objects.filter(introduced_product_obj_id=prod.id).count()
            prod.usage_count = cnt
            prod.save(update_fields=["usage_count", "updated_at"])

        for cat in categories:
            cnt = SaRecord.objects.filter(support_info_category_obj_id=cat.id).count()
            cat.usage_count = cnt
            cat.save(update_fields=["usage_count", "updated_at"])

        print(f"\n=== DA HOAN TAT SEED DU LIEU CHAM SOC KHONG ===")
        print(f"- Tong SA Records duoc cap nhat: {updated_cnt}")
        print(f"- So luong ban giao Moi gioi: {handover_cnt}")
        print(f"- Da cap nhat usage_count cho {len(products)} San pham va {len(categories)} Danh muc Ho tro.")
