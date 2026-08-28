import sys
import random

# Ensure UTF-8 output on Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.sale_admin.models import SaSupportCategory, SaRecord


SAMPLE_SUPPORT_CATEGORIES = [
    {
        "name": "Cập nhật CCCD gắn chip & eKYC",
        "code": "EKYC_CCCD",
        "description": "Hỗ trợ khách hàng cập nhật giấy tờ CCCD gắn chip và định danh eKYC.",
        "base_usage": 42,
    },
    {
        "name": "Thay đổi SĐT & Email nhận OTP",
        "code": "CHANGE_OTP_INFO",
        "description": "Thay đổi thông tin số điện thoại, email đăng ký nhận OTP giao dịch.",
        "base_usage": 35,
    },
    {
        "name": "Hướng dẫn Nạp / Rút tiền & Chuyển khoản",
        "code": "DEPOSIT_WITHDRAW",
        "description": "Hướng dẫn thao tác nạp tiền, rút tiền và đăng ký tài khoản ngân hàng thụ hưởng.",
        "base_usage": 28,
    },
    {
        "name": "Đăng ký Dịch vụ Margin / Ký quỹ",
        "code": "MARGIN_REGISTER",
        "description": "Hướng dẫn đăng ký hạn mức Margin, ký quỹ giao dịch.",
        "base_usage": 22,
    },
    {
        "name": "Mở rộng Hạn mức Giao dịch Ngày",
        "code": "INCREASE_LIMIT",
        "description": "Hỗ trợ nâng hạn mức giao dịch chứng khoán cơ sở và phái sinh.",
        "base_usage": 17,
    },
    {
        "name": "Kích hoạt Smart OTP / Security Key",
        "code": "SMART_OTP_ACTIVATE",
        "description": "Cài đặt lại Smart OTP, khôi phục mật khẩu hoặc khóa bảo mật.",
        "base_usage": 14,
    },
    {
        "name": "Giải đáp Biểu phí & Thuế Giao dịch",
        "code": "FEE_TAX_INFO",
        "description": "Giải đáp thắc mắc biểu phí môi giới, phí lưu ký và thuế TNCN.",
        "base_usage": 11,
    },
    {
        "name": "Hỗ trợ Trích xuất Sao kê & Xác nhận Số dư",
        "code": "STATEMENT_CONFIRM",
        "description": "Cấp bản trích xuất sao kê tài khoản và xác nhận tài sản cho khách hàng.",
        "base_usage": 9,
    },
]


class Command(BaseCommand):
    help = "Seed danh muc Danh muc Ho tro mau va gan vao cac SA Record hien co."

    def add_arguments(self, parser):
        parser.add_argument(
            "--assign-records",
            action="store_true",
            help="Tu dong gan danh muc ho tro vao cac SA Record hien co.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        assign_records = options.get("assign_records", True)

        print("=== Bat dau Seed du lieu Danh muc Ho tro KH ===")

        created_count = 0
        updated_count = 0
        cat_objs = []

        for cdata in SAMPLE_SUPPORT_CATEGORIES:
            cat, created = SaSupportCategory.objects.get_or_create(
                name__iexact=cdata["name"],
                defaults={
                    "name": cdata["name"],
                    "code": cdata["code"],
                    "description": cdata["description"],
                    "usage_count": cdata["base_usage"],
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                print(f"  + Tao moi Danh muc: {cat.code}")
            else:
                updated_count += 1
                cat.code = cdata["code"]
                cat.description = cdata["description"]
                cat.save(update_fields=["code", "description", "updated_at"])
                print(f"  ~ Cap nhat Danh muc: {cat.code}")

            cat_objs.append(cat)

        print(
            f"\nDa hoan thanh Seed {len(cat_objs)} danh muc ho tro (Moi: {created_count}, Cap nhat: {updated_count})"
        )

        records = list(SaRecord.objects.all())
        if not records:
            print("Chua co SA Record nao trong DB.")
            return

        if assign_records:
            print(f"\n--- Gan danh muc ho tro mau vao {len(records)} SA Record hien co ---")

            assigned_cnt = 0
            for idx, record in enumerate(records):
                # 65% so record se co ho tro thong tin
                if idx % 10 < 6.5:
                    chosen_cat = random.choice(cat_objs)
                    record.support_info = True
                    record.support_info_category_obj = chosen_cat
                    record.support_info_category_name = chosen_cat.name
                    record.save(update_fields=[
                        "support_info",
                        "support_info_category_obj",
                        "support_info_category_name",
                        "updated_at",
                    ])
                    assigned_cnt += 1

            # Recalculate usage_count for all categories based on actual assigned records
            for cat in cat_objs:
                real_cnt = SaRecord.objects.filter(support_info_category_obj_id=cat.id).count()
                cat.usage_count = real_cnt
                cat.save(update_fields=["usage_count", "updated_at"])

            print(
                f"Da gan thanh cong danh muc ho tro cho {assigned_cnt}/{len(records)} SA Records!"
            )
