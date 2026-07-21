from django.core.management.base import BaseCommand
from django.db import transaction

from apps.external_errors.models import (
    ExternalErrorCode,
    ExternalErrorGroup,
)


INITIAL_ERROR_CATALOG = [
    {
        "group_code": "ORDER",
        "group_name": "Lệnh Đặt",
        "codes": [
            ("LĐ001", "Không đặt lệnh mua / bán được"),
            ("LĐ002", "Bước giá không hợp lệ"),
            ("LĐ003", "Lệnh bị tự hủy bất thường"),
            ("LĐ004", "Không hủy được lệnh điều kiện"),
            ("LĐ005", "Vượt sức mua (SM)"),
            ("LĐ006", "Lệnh khớp hiển thị sai / lag"),
        ],
    },
    {
        "group_code": "LOGIN",
        "group_name": "Đăng Nhập",
        "codes": [
            ("ĐN001", "Không đăng nhập được"),
            ("ĐN002", "Không nhận được SMS OTP"),
            ("ĐN003", "Session tự đăng xuất / timeout"),
            ("ĐN004", "Reset mật khẩu lỗi"),
        ],
    },
    {
        "group_code": "DISPLAY",
        "group_name": "Hiển Thị",
        "codes": [
            ("HT001", "Giá thị trường không cập nhật / sai"),
            ("HT002", "Số dư / tài sản không cập nhật"),
            ("HT003", "Thông báo lệnh khớp không hiển thị"),
            ("HT004", "Bảng giá lệch giữa các kênh"),
        ],
    },
    {
        "group_code": "EKYC_ACCOUNT",
        "group_name": "eKYC / Tài Khoản",
        "codes": [
            ("KY001", "eKYC không hoàn thành được"),
            ("KY002", "Load hình ảnh CCCD / chứng từ lỗi"),
            ("KY003", "Cập nhật thông tin cá nhân lỗi"),
            ("KY004", "Thay đổi chữ ký lỗi"),
        ],
    },
    {
        "group_code": "PORTAL_SYSTEM",
        "group_name": "Portal / Hệ Thống",
        "codes": [
            ("PT001", "BrokerPortal không truy cập được"),
            ("PT002", "Portal không hiển thị thông tin KH"),
            ("PT003", "Home không đặt lệnh / xuất báo cáo được"),
            ("PT004", "Zalo / ZNS / Email không đồng bộ"),
        ],
    },
    {
        "group_code": "TRANSFER_PAYMENT",
        "group_name": "Chuyển Khoản / Thanh Toán",
        "codes": [
            ("CK001", "Chuyển CK nội bộ lỗi"),
            ("CK002", "Thanh toán chứng khoán lỗi"),
            ("CK003", "Nộp tiền không cập nhật sức mua"),
            ("CK004", "Quyền mua không hiển thị trên app"),
        ],
    },
    {
        "group_code": "COMPLAINT",
        "group_name": "Khiếu Nại",
        "codes": [
            ("KN001", "Phí GD / phí dịch vụ tính sai"),
            ("KN002", "Môi giới tự ý đặt lệnh cho KH"),
            ("KN003", "Phàn nàn thái độ nhân viên / MG"),
            ("KN004", "Thời gian xử lý / phản hồi quá lâu"),
            ("KN005", "Yêu cầu đóng TK (bị ép / lừa mở TK)"),
            ("KN006", "Mạo danh / gian lận tài khoản"),
            ("KN007", "Spam Hotline / email liên tục"),
        ],
    },
    {
        "group_code": "SPECIAL",
        "group_name": "Đặc Biệt",
        "codes": [
            ("ĐB000", "Lỗi khác (nhập thủ công)"),
        ],
    },
]


class Command(BaseCommand):
    help = (
        "Tạo danh mục nhóm lỗi và mã lỗi ban đầu. "
        "Sau khi seed, danh mục có thể thêm, sửa, Active/Inactive từ hệ thống."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created_groups = 0
        existing_groups = 0
        created_codes = 0
        existing_codes = 0

        for group_order, group_data in enumerate(
            INITIAL_ERROR_CATALOG,
            start=1,
        ):
            group, group_created = (
                ExternalErrorGroup.objects.get_or_create(
                    group_code=group_data["group_code"],
                    defaults={
                        "group_name": group_data["group_name"],
                        "sort_order": group_order,
                        "is_active": True,
                    },
                )
            )

            if group_created:
                created_groups += 1
            else:
                existing_groups += 1

            for code_order, (error_code, error_name) in enumerate(
                group_data["codes"],
                start=1,
            ):
                _, code_created = (
                    ExternalErrorCode.objects.get_or_create(
                        error_code=error_code,
                        defaults={
                            "group": group,
                            "error_name": error_name,
                            "sort_order": code_order,
                            "is_active": True,
                        },
                    )
                )

                if code_created:
                    created_codes += 1
                else:
                    existing_codes += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seed danh mục thành công.\n"
                f"- Nhóm tạo mới: {created_groups}\n"
                f"- Nhóm đã tồn tại, giữ nguyên: {existing_groups}\n"
                f"- Mã tạo mới: {created_codes}\n"
                f"- Mã đã tồn tại, giữ nguyên: {existing_codes}\n"
                "\nCommand không cập nhật, không xóa và không tự đổi Active "
                "các nhóm/mã đã tồn tại hoặc được thêm thủ công."
            )
        )