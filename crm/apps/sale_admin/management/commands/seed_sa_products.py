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
from apps.sale_admin.models import SaProduct, SaRecord


SAMPLE_PRODUCTS = [
    {
        "name": "Margin T+3 (Ưu đãi lãi suất 0%)",
        "code": "MARGIN_T3",
        "description": "Gói Margin ngắn hạn T+3 miễn phí lãi vay 3 ngày đầu.",
        "base_usage": 45,
    },
    {
        "name": "Gói Phí Zero Fee 0.08%",
        "code": "ZERO_FEE_008",
        "description": "Ưu đãi phí giao dịch chứng khoán cơ sở 0.08% trọn đời.",
        "base_usage": 38,
    },
    {
        "name": "Margin Cố Định 9.9%/Năm",
        "code": "MARGIN_FIXED_99",
        "description": "Gói vay Margin lãi suất cố định 9.9%/năm cho tài khoản VIP.",
        "base_usage": 30,
    },
    {
        "name": "Trái Phiếu iBond Fix 10.5%/Năm",
        "code": "BOND_FIX_105",
        "description": "Trái phiếu doanh nghiệp niêm yết lãi suất hấp dẫn 10.5%/năm.",
        "base_usage": 24,
    },
    {
        "name": "Ủy Thác Đầu Tư iWealth Smart",
        "code": "WEALTH_SMART",
        "description": "Dịch vụ quản lý tài sản tự động theo danh mục VN30.",
        "base_usage": 18,
    },
    {
        "name": "Giao Dịch Phái Sinh VIP Fee 500đ",
        "code": "DERIV_VIP_500",
        "description": "Phí giao dịch Hợp đồng tương lai chỉ 500đ/hợp đồng.",
        "base_usage": 15,
    },
    {
        "name": "Chứng Quyền Có Bảo Đảm CW-Pro",
        "code": "CW_PRO",
        "description": "Gói sản phẩm chứng quyền với tỷ lệ ký quỹ linh hoạt.",
        "base_usage": 10,
    },
    {
        "name": "Tư Vấn Chiến Lược ProTrader 1:1",
        "code": "PRO_TRADER_11",
        "description": "Đồng hành tư vấn danh mục 1:1 cùng Chuyên viên Senior.",
        "base_usage": 8,
    },
]


class Command(BaseCommand):
    help = "Seed danh muc San pham mau va gan vao cac SA Record hien co."

    def add_arguments(self, parser):
        parser.add_argument(
            "--assign-records",
            action="store_true",
            help="Tu dong gan san pham vao cac SA Record hien co.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        assign_records = options.get("assign_records", True)

        print("=== Bat dau Seed du lieu San pham GiOi thieu ===")

        created_count = 0
        updated_count = 0
        product_objs = []

        for pdata in SAMPLE_PRODUCTS:
            prod, created = SaProduct.objects.get_or_create(
                name__iexact=pdata["name"],
                defaults={
                    "name": pdata["name"],
                    "code": pdata["code"],
                    "description": pdata["description"],
                    "usage_count": pdata["base_usage"],
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                print(f"  + Tao moi SP: {prod.code}")
            else:
                updated_count += 1
                prod.code = pdata["code"]
                prod.description = pdata["description"]
                prod.save(update_fields=["code", "description", "updated_at"])
                print(f"  ~ Cap nhat SP: {prod.code}")

            product_objs.append(prod)

        print(
            f"\nDa hoan thanh Seed {len(product_objs)} san pham (Moi: {created_count}, Cap nhat: {updated_count})"
        )

        records = list(SaRecord.objects.all())
        if not records:
            print("Chua co SA Record nao trong DB.")
            return

        if assign_records:
            print(f"\n--- Gan san pham mau vao {len(records)} SA Record hien co ---")

            assigned_cnt = 0
            for idx, record in enumerate(records):
                # 70% so record se co gioi thieu SP
                if idx % 10 < 7:
                    chosen_prod = random.choice(product_objs)
                    record.introduced_product = True
                    record.introduced_product_obj = chosen_prod
                    record.introduced_product_name = chosen_prod.name
                    record.save(update_fields=[
                        "introduced_product",
                        "introduced_product_obj",
                        "introduced_product_name",
                        "updated_at",
                    ])
                    assigned_cnt += 1

            # Recalculate usage_count for all products based on actual assigned records
            for prod in product_objs:
                real_cnt = SaRecord.objects.filter(introduced_product_obj_id=prod.id).count()
                prod.usage_count = real_cnt
                prod.save(update_fields=["usage_count", "updated_at"])

            print(
                f"Da gan thanh cong san pham cho {assigned_cnt}/{len(records)} SA Records!"
            )
