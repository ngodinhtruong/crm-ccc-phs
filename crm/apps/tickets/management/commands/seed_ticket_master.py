from django.core.management.base import BaseCommand
from django.db import transaction

from apps.branches.models import OrganizationUnit, OrganizationUnitType
from apps.tickets.models import (
    TicketClassification,
    TicketPriority,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)


SUPPORT_CATEGORIES = [
    ("MOI_GIOI", "Môi giới", 1),
    ("KIEN_THUC_CHUNG_KHOAN", "Kiến thức chứng khoán", 2),
    ("SAN_PHAM_PHS", "Sản phẩm PHS", 3),
    ("CONG_CU_TIEN_ICH", "Công cụ tiện ích", 4),
    ("UNG_DUNG_CHUNG_KHOAN", "Ứng dụng chứng khoán", 5),
    ("TAI_KHOAN_KHACH_HANG", "Tài khoản khách hàng", 6),
    ("DINH_DANH", "Định danh", 7),
    ("GIAO_DICH_CHUNG_KHOAN", "Giao dịch CK", 8),
    ("NAP_TIEN", "Nạp tiền", 9),
    ("RUT_TIEN", "Rút tiền", 10),
    ("GIAO_DICH_KY_QUY", "Giao dịch ký quỹ", 11),
    ("GOP_Y", "Góp ý", 12),
    ("CHAM_SOC_KHACH_HANG", "Chăm sóc khách hàng", 13),
]


# classification_code, classification_name,
# support_category_code, sort_order
CLASSIFICATIONS = [
    # Môi giới
    (
        "MOI_GIOI_TU_VAN",
        "Tư vấn môi giới",
        "MOI_GIOI",
        1,
    ),
    (
        "MOI_GIOI_THAY_DOI",
        "Thay đổi nhân viên môi giới",
        "MOI_GIOI",
        2,
    ),
    (
        "MOI_GIOI_LIEN_HE",
        "Liên hệ nhân viên môi giới",
        "MOI_GIOI",
        3,
    ),

    # Kiến thức chứng khoán
    (
        "KTCK_TU_VAN_DAU_TU",
        "Tư vấn kiến thức đầu tư",
        "KIEN_THUC_CHUNG_KHOAN",
        1,
    ),
    (
        "KTCK_SAN_PHAM",
        "Thông tin sản phẩm chứng khoán",
        "KIEN_THUC_CHUNG_KHOAN",
        2,
    ),
    (
        "KTCK_THI_TRUONG",
        "Thông tin thị trường",
        "KIEN_THUC_CHUNG_KHOAN",
        3,
    ),

    # Sản phẩm PHS
    (
        "SPPHS_TU_VAN",
        "Tư vấn sản phẩm PHS",
        "SAN_PHAM_PHS",
        1,
    ),
    (
        "SPPHS_DANG_KY",
        "Đăng ký sản phẩm PHS",
        "SAN_PHAM_PHS",
        2,
    ),
    (
        "SPPHS_HUY_DICH_VU",
        "Hủy sản phẩm hoặc dịch vụ",
        "SAN_PHAM_PHS",
        3,
    ),

    # Công cụ tiện ích
    (
        "CCTI_DANG_KY",
        "Đăng ký công cụ tiện ích",
        "CONG_CU_TIEN_ICH",
        1,
    ),
    (
        "CCTI_HUONG_DAN",
        "Hướng dẫn sử dụng tiện ích",
        "CONG_CU_TIEN_ICH",
        2,
    ),
    (
        "CCTI_LOI",
        "Lỗi công cụ tiện ích",
        "CONG_CU_TIEN_ICH",
        3,
    ),

    # Ứng dụng chứng khoán
    (
        "UDCK_DANG_NHAP",
        "Lỗi đăng nhập",
        "UNG_DUNG_CHUNG_KHOAN",
        1,
    ),
    (
        "UDCK_HIEN_THI",
        "Lỗi hiển thị",
        "UNG_DUNG_CHUNG_KHOAN",
        2,
    ),
    (
        "UDCK_DAT_LENH",
        "Lỗi đặt lệnh",
        "UNG_DUNG_CHUNG_KHOAN",
        3,
    ),
    (
        "UDCK_HE_THONG",
        "Lỗi hệ thống",
        "UNG_DUNG_CHUNG_KHOAN",
        4,
    ),
    (
        "UDCK_KET_NOI",
        "Lỗi kết nối",
        "UNG_DUNG_CHUNG_KHOAN",
        5,
    ),

    # Tài khoản khách hàng
    (
        "TKKH_MO_TAI_KHOAN",
        "Mở tài khoản",
        "TAI_KHOAN_KHACH_HANG",
        1,
    ),
    (
        "TKKH_CAP_NHAT",
        "Cập nhật thông tin tài khoản",
        "TAI_KHOAN_KHACH_HANG",
        2,
    ),
    (
        "TKKH_KHOA_MO_KHOA",
        "Khóa hoặc mở khóa tài khoản",
        "TAI_KHOAN_KHACH_HANG",
        3,
    ),
    (
        "TKKH_DONG_TAI_KHOAN",
        "Đóng tài khoản",
        "TAI_KHOAN_KHACH_HANG",
        4,
    ),
    (
        "TKKH_QUEN_MAT_KHAU",
        "Quên hoặc cấp lại mật khẩu",
        "TAI_KHOAN_KHACH_HANG",
        5,
    ),

    # Định danh
    (
        "DINH_DANH_EKYC",
        "Định danh eKYC",
        "DINH_DANH",
        1,
    ),
    (
        "DINH_DANH_CCCD",
        "Cập nhật CCCD hoặc giấy tờ",
        "DINH_DANH",
        2,
    ),
    (
        "DINH_DANH_KHUON_MAT",
        "Xác thực khuôn mặt",
        "DINH_DANH",
        3,
    ),
    (
        "DINH_DANH_THAT_BAI",
        "Định danh không thành công",
        "DINH_DANH",
        4,
    ),

    # Giao dịch chứng khoán
    (
        "GDCK_DAT_LENH",
        "Đặt lệnh",
        "GIAO_DICH_CHUNG_KHOAN",
        1,
    ),
    (
        "GDCK_HUY_SUA_LENH",
        "Hủy hoặc sửa lệnh",
        "GIAO_DICH_CHUNG_KHOAN",
        2,
    ),
    (
        "GDCK_KHOP_LENH",
        "Khớp lệnh",
        "GIAO_DICH_CHUNG_KHOAN",
        3,
    ),
    (
        "GDCK_SO_DU_CHUNG_KHOAN",
        "Số dư chứng khoán",
        "GIAO_DICH_CHUNG_KHOAN",
        4,
    ),
    (
        "GDCK_QUYEN",
        "Quyền và cổ tức",
        "GIAO_DICH_CHUNG_KHOAN",
        5,
    ),

    # Nạp tiền
    (
        "NAP_TIEN_CHUYEN_KHOAN",
        "Nạp tiền bằng chuyển khoản",
        "NAP_TIEN",
        1,
    ),
    (
        "NAP_TIEN_CHUA_GHI_NHAN",
        "Nạp tiền chưa được ghi nhận",
        "NAP_TIEN",
        2,
    ),
    (
        "NAP_TIEN_SAI_NOI_DUNG",
        "Nạp tiền sai nội dung",
        "NAP_TIEN",
        3,
    ),

    # Rút tiền
    (
        "RUT_TIEN_DANG_KY",
        "Đăng ký rút tiền",
        "RUT_TIEN",
        1,
    ),
    (
        "RUT_TIEN_CHUA_NHAN",
        "Rút tiền chưa nhận được",
        "RUT_TIEN",
        2,
    ),
    (
        "RUT_TIEN_HUY",
        "Hủy yêu cầu rút tiền",
        "RUT_TIEN",
        3,
    ),
    (
        "RUT_TIEN_TU_CHOI",
        "Yêu cầu rút tiền bị từ chối",
        "RUT_TIEN",
        4,
    ),

    # Giao dịch ký quỹ
    (
        "GDKQ_DANG_KY",
        "Đăng ký giao dịch ký quỹ",
        "GIAO_DICH_KY_QUY",
        1,
    ),
    (
        "GDKQ_HAN_MUC",
        "Hạn mức ký quỹ",
        "GIAO_DICH_KY_QUY",
        2,
    ),
    (
        "GDKQ_TY_LE",
        "Tỷ lệ ký quỹ",
        "GIAO_DICH_KY_QUY",
        3,
    ),
    (
        "GDKQ_CALL_MARGIN",
        "Call Margin",
        "GIAO_DICH_KY_QUY",
        4,
    ),
    (
        "GDKQ_XU_LY_NO",
        "Xử lý dư nợ ký quỹ",
        "GIAO_DICH_KY_QUY",
        5,
    ),

    # Góp ý
    (
        "GOP_Y_SAN_PHAM",
        "Góp ý sản phẩm",
        "GOP_Y",
        1,
    ),
    (
        "GOP_Y_DICH_VU",
        "Góp ý dịch vụ",
        "GOP_Y",
        2,
    ),
    (
        "GOP_Y_NHAN_VIEN",
        "Góp ý nhân viên",
        "GOP_Y",
        3,
    ),
    (
        "GOP_Y_HE_THONG",
        "Góp ý hệ thống",
        "GOP_Y",
        4,
    ),

    # Chăm sóc khách hàng
    (
        "CSKH_TU_VAN",
        "Tư vấn khách hàng",
        "CHAM_SOC_KHACH_HANG",
        1,
    ),
    (
        "CSKH_KHIEU_NAI",
        "Khiếu nại",
        "CHAM_SOC_KHACH_HANG",
        2,
    ),
    (
        "CSKH_PHAN_ANH",
        "Phản ánh dịch vụ",
        "CHAM_SOC_KHACH_HANG",
        3,
    ),
    (
        "CSKH_YEU_CAU_KHAC",
        "Yêu cầu khác",
        "CHAM_SOC_KHACH_HANG",
        4,
    ),
]


PROCESSING_UNITS = [
    ("CUSTOMER_CARE_CENTER", "Customer Care Center"),
    ("SECURITY_SERVICE", "Security Service"),
    ("BROKERAGE_MANAGEMENT", "Brokerage Management"),
    ("IT", "IT"),
    ("ACCOUNTING", "Accounting"),
    ("FINANCE", "Finance"),
]


PRIORITIES = [
    ("LOW", "Thấp", 1),
    ("NORMAL", "Bình thường", 2),
    ("HIGH", "Cao", 3),
    ("CRITICAL", "Rất cao", 4),
]


SOURCES = [
    ("HOTLINE", "Hotline"),
    ("EMAIL", "Email"),
    ("WEBSITE", "Website"),
    ("INTERNAL", "Thủ công"),
    ("FANPAGE", "Fanpage"),
    ("ZALO", "Zalo"),
]


STATUSES = [
    ("CREATED", "Mở", 1, False),
    ("ACCEPTED", "Tiếp nhận", 2, False),
    ("PROCESSING", "Đang xử lý", 3, False),
    ("DONE_WAIT_CLOSE", "Đã xong", 4, False),
    ("PENDING_CLOSE", "Chờ đóng", 5, False),
    ("CLOSED", "Đã đóng", 6, True),
    ("CANCELLED", "Đã hủy", 7, True),
]


class Command(BaseCommand):
    help = "Seed dữ liệu danh mục mặc định cho hệ thống ticket"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Bắt đầu seed danh mục Ticket...")

        self.seed_support_categories()
        self.seed_classifications()
        self.seed_organization_units()
        self.seed_priorities()
        self.seed_sources()
        self.seed_statuses()

        self.stdout.write(
            self.style.SUCCESS(
                "Seed dữ liệu danh mục Ticket thành công."
            )
        )

    def seed_support_categories(self):
        self.stdout.write("\nSeed danh mục hỗ trợ...")

        for code, name, sort_order in SUPPORT_CATEGORIES:
            obj, created = (
                TicketSupportCategory.objects.update_or_create(
                    category_code=code,
                    defaults={
                        "category_name": name,
                        "sort_order": sort_order,
                        "is_active": True,
                        "parent": None,
                    },
                )
            )

            self.print_result(
                "Danh mục hỗ trợ",
                obj.category_name,
                created,
            )

    def seed_classifications(self):
        self.stdout.write("\nSeed phân loại ticket...")

        for (
            code,
            name,
            support_category_code,
            sort_order,
        ) in CLASSIFICATIONS:
            support_category = (
                TicketSupportCategory.objects.filter(
                    category_code=support_category_code,
                ).first()
            )

            if support_category is None:
                raise ValueError(
                    "Không tìm thấy danh mục hỗ trợ "
                    f"'{support_category_code}' cho phân loại "
                    f"'{code}'."
                )

            obj, created = (
                TicketClassification.objects.update_or_create(
                    classification_code=code,
                    defaults={
                        "classification_name": name,
                        "support_category": support_category,
                        "sort_order": sort_order,
                        "is_active": True,
                    },
                )
            )

            self.print_result(
                f"Phân loại - {support_category.category_name}",
                obj.classification_name,
                created,
            )

    def seed_organization_units(self):
        self.stdout.write("\nSeed đơn vị xử lý...")

        for code, name in PROCESSING_UNITS:
            obj, created = OrganizationUnit.objects.update_or_create(
                unit_code=code,
                defaults={
                    "unit_name": name,
                    "unit_type": OrganizationUnitType.PROCESSING_UNIT,
                    "is_ticket_assignable": True,
                    "is_active": True,
                },
            )

            self.print_result(
                "Đơn vị xử lý",
                obj.unit_name,
                created,
            )

    def seed_priorities(self):
        self.stdout.write("\nSeed mức ưu tiên...")

        for code, name, level_order in PRIORITIES:
            obj, created = TicketPriority.objects.update_or_create(
                priority_code=code,
                defaults={
                    "priority_name": name,
                    "level_order": level_order,
                    "is_active": True,
                },
            )

            self.print_result(
                "Mức ưu tiên",
                obj.priority_name,
                created,
            )

    def seed_sources(self):
        self.stdout.write("\nSeed nguồn ticket...")

        for code, name in SOURCES:
            obj, created = TicketSource.objects.update_or_create(
                source_code=code,
                defaults={
                    "source_name": name,
                    "is_active": True,
                },
            )

            self.print_result(
                "Nguồn ticket",
                obj.source_name,
                created,
            )

    def seed_statuses(self):
        self.stdout.write("\nSeed tình trạng ticket...")

        for code, name, sort_order, is_final in STATUSES:
            obj, created = TicketStatus.objects.update_or_create(
                status_code=code,
                defaults={
                    "status_name": name,
                    "sort_order": sort_order,
                    "is_final": is_final,
                    "is_active": True,
                },
            )

            self.print_result(
                "Tình trạng",
                obj.status_name,
                created,
            )

    def print_result(self, group, name, created):
        action = "Tạo mới" if created else "Cập nhật"

        self.stdout.write(
            f"[{group}] {action}: {name}"
        )