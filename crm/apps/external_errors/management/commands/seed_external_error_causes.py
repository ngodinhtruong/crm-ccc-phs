
from django.core.management.base import BaseCommand

from apps.external_errors.models import ExternalErrorCauseGroup


CAUSES = [
    {
        "cause_code": "SOFTWARE_LOGIC",
        "cause_name": "Lỗi phần mềm / Logic ứng dụng",
        "description": (
            "Bug hiển thị, chức năng hoặc xử lý sai logic nghiệp vụ "
            "trên App, Portal hoặc Home."
        ),
        "keywords": [
            "bug", "lỗi phần mềm", "logic ứng dụng",
            "xử lý sai", "hiển thị sai",
        ],
        "examples": [
            "App xử lý sai trạng thái lệnh.",
            "Portal hiển thị sai dữ liệu do bug.",
        ],
        "sort_order": 1,
    },
    {
        "cause_code": "DATA_SYNC_CACHE",
        "cause_name": "Đồng bộ dữ liệu & Cache",
        "description": (
            "Lệch số dư chứng khoán, giá hoặc cache hệ thống/máy trạm "
            "gây sai lệch dữ liệu."
        ),
        "keywords": ["đồng bộ", "cache", "lệch dữ liệu", "số dư", "giá"],
        "examples": [
            "Số dư trên app chưa đồng bộ.",
            "Cache máy trạm làm hiển thị dữ liệu cũ.",
        ],
        "sort_order": 2,
    },
    {
        "cause_code": "EKYC_AUTH",
        "cause_name": "eKYC / Xác thực (OTP)",
        "description": (
            "Không nhận OTP hoặc lỗi bước xác thực khi mở tài khoản trực tuyến."
        ),
        "keywords": ["ekyc", "otp", "xác thực", "mở tài khoản"],
        "examples": [
            "Khách hàng không nhận được OTP eKYC.",
            "Lỗi xác thực ảnh CCCD.",
        ],
        "sort_order": 3,
    },
    {
        "cause_code": "INFRA_NETWORK_SERVER",
        "cause_name": "Hạ tầng - Mạng / Server",
        "description": (
            "Sự cố đường truyền, DDoS, máy chủ cũ, quá tải cân bằng tải "
            "hoặc chứng thư SSL."
        ),
        "keywords": [
            "mạng", "máy chủ", "server", "ddos",
            "load balancer", "ssl", "quá tải",
        ],
        "examples": [
            "Server quá tải khiến hệ thống gián đoạn.",
            "Đường truyền nội bộ mất kết nối.",
        ],
        "sort_order": 4,
    },
    {
        "cause_code": "CUSTOMER_DEVICE_NETWORK",
        "cause_name": "Phía khách hàng (Thiết bị / Mạng)",
        "description": (
            "Kết nối mạng hoặc thiết bị cá nhân của khách hàng không ổn định."
        ),
        "keywords": [
            "thiết bị khách hàng", "mạng khách hàng",
            "wifi", "3g", "4g", "trình duyệt",
        ],
        "examples": [
            "Mạng khách hàng chập chờn.",
            "Thiết bị khách hàng không tương thích.",
        ],
        "sort_order": 5,
    },
    {
        "cause_code": "BUSINESS_PERMISSION",
        "cause_name": "Nghiệp vụ / Phân quyền",
        "description": (
            "Thiếu quy tắc nghiệp vụ hoặc cấu hình phân quyền chưa đúng."
        ),
        "keywords": [
            "nghiệp vụ", "phân quyền",
            "quyền truy cập", "cấu hình", "rule",
        ],
        "examples": [
            "Tài khoản chưa được cấp đúng quyền.",
            "Rule nghiệp vụ thiếu trường hợp xử lý.",
        ],
        "sort_order": 6,
    },
]


class Command(BaseCommand):
    help = "Seed danh mục nguyên nhân ban đầu."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for item in CAUSES:
            _, was_created = ExternalErrorCauseGroup.objects.update_or_create(
                cause_code=item["cause_code"],
                defaults={
                    "cause_name": item["cause_name"],
                    "description": item["description"],
                    "keywords": item["keywords"],
                    "examples": item["examples"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded cause groups. Created: {created}, Updated: {updated}."
            )
        )
