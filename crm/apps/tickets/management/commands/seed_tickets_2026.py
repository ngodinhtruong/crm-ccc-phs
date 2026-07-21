from __future__ import annotations

import calendar
import random
from collections import Counter
from datetime import date, datetime, time, timedelta
from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.branches.models import Branch, Employee, ProcessingUnit
from apps.customers.models import Company, Customer, CustomerAccount
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
    TicketTag,
    TicketUpdateLog,
)


TICKET_CODE_PREFIX = "CCC-DEMO-2026-"
SOURCE_REF_PREFIX = "CCC-DEMO-REF-2026-"

SYSTEM_OPTIONS = [
    "BASE",
    "FLEX",
    "APP",
    "WEB",
    "CRM",
    "API",
    "CHATBOT",
    "PORTAL",
    "OTHER",
]

EXTERNAL_STATUS_OPTIONS = [
    "SYNCED",
    "PENDING",
    "RETRY",
    "FAILED",
]

COMMENT_OPTIONS = [
    "Đã liên hệ khách hàng để xác minh thêm thông tin.",
    "Đã kiểm tra dữ liệu trên hệ thống và chuyển bộ phận liên quan xử lý.",
    "Khách hàng đã bổ sung ảnh chụp màn hình và thời điểm phát sinh.",
    "Đã đối chiếu số tài khoản, số điện thoại và lịch sử giao dịch.",
    "Đang theo dõi kết quả xử lý từ hệ thống nghiệp vụ.",
    "Đã cập nhật tiến độ cho khách hàng qua kênh tiếp nhận ban đầu.",
]

TRANSFER_REASON_OPTIONS = [
    "Phân công theo ca trực CCC.",
    "Phân công theo khối lượng ticket hiện tại.",
    "Nhân viên phụ trách tiếp nhận yêu cầu từ khách hàng.",
    "Điều phối nội bộ để bảo đảm thời gian xử lý.",
]

CANCEL_REASON_OPTIONS = [
    "Khách hàng xác nhận không còn nhu cầu hỗ trợ.",
    "Ticket được tạo trùng với yêu cầu đã tồn tại.",
    "Không đủ thông tin để xác minh sau nhiều lần liên hệ.",
    "Khách hàng yêu cầu hủy nội dung hỗ trợ.",
]

SCENARIOS = [
    {
        "keywords": ("GIAO_DICH", "LENH", "CHUNG_KHOAN"),
        "titles": [
            "Kiểm tra trạng thái lệnh đặt",
            "Lệnh giao dịch chưa cập nhật kết quả",
            "Không thể sửa hoặc hủy lệnh",
            "Cần hỗ trợ tra soát lệnh chứng khoán",
        ],
        "requests": [
            "Khách hàng phản ánh lệnh đã gửi nhưng chưa hiển thị trạng thái khớp trên ứng dụng.",
            "Khách hàng không sửa được giá lệnh và cần kiểm tra trạng thái xử lý.",
            "Khách hàng yêu cầu tra soát thời điểm ghi nhận lệnh trên hệ thống giao dịch.",
            "Khách hàng thấy sức mua đã thay đổi nhưng danh sách lệnh chưa cập nhật.",
        ],
        "solutions": [
            "Đối chiếu lịch sử lệnh trên FLEX và kiểm tra trạng thái trả về từ hệ thống giao dịch.",
            "Xác minh mã chứng khoán, thời gian đặt lệnh và hướng dẫn khách hàng tải lại dữ liệu.",
            "Chuyển thông tin cho bộ phận nghiệp vụ kiểm tra luồng xử lý lệnh.",
        ],
        "responses": [
            "Đã kiểm tra và cập nhật lại trạng thái lệnh cho khách hàng.",
            "Đã hướng dẫn khách hàng thao tác lại sau khi hệ thống đồng bộ.",
            "Kết quả tra soát đã được phản hồi đến khách hàng.",
        ],
        "system": "FLEX",
    },
    {
        "keywords": ("DANG_NHAP", "UNG_DUNG", "APP", "MAT_KHAU"),
        "titles": [
            "Không đăng nhập được ứng dụng",
            "Tài khoản bị khóa khi đăng nhập",
            "Không nhận được mã OTP đăng nhập",
            "Ứng dụng báo sai thông tin xác thực",
        ],
        "requests": [
            "Khách hàng nhập đúng thông tin nhưng ứng dụng báo không thể đăng nhập.",
            "Khách hàng không nhận được OTP sau nhiều lần thực hiện.",
            "Tài khoản bị khóa và khách hàng cần hỗ trợ mở lại quyền truy cập.",
            "Khách hàng đổi thiết bị và không thể xác thực đăng nhập.",
        ],
        "solutions": [
            "Kiểm tra trạng thái tài khoản, lịch sử OTP và hướng dẫn khách hàng xác thực lại.",
            "Đồng bộ lại trạng thái đăng nhập và yêu cầu khách hàng thử lại trên phiên bản mới.",
            "Chuyển bộ phận kỹ thuật kiểm tra nhật ký đăng nhập trên ứng dụng.",
        ],
        "responses": [
            "Khách hàng đã đăng nhập lại thành công.",
            "Đã mở khóa tài khoản và hướng dẫn khách hàng đổi mật khẩu.",
            "OTP đã được gửi lại và khách hàng xác nhận nhận thành công.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("HIEN_THI", "GIAO_DIEN", "DU_LIEU"),
        "titles": [
            "Dữ liệu tài sản hiển thị chưa chính xác",
            "Danh mục chứng khoán không cập nhật",
            "Màn hình ứng dụng hiển thị thiếu thông tin",
            "Số dư hiển thị chậm so với giao dịch",
        ],
        "requests": [
            "Khách hàng phản ánh dữ liệu tài sản trên màn hình chưa cập nhật.",
            "Danh mục chứng khoán hiển thị thiếu mã sau khi giao dịch.",
            "Số dư tiền và sức mua hiển thị không đồng nhất giữa các màn hình.",
            "Khách hàng gặp lỗi trắng màn hình khi mở phần thông tin tài khoản.",
        ],
        "solutions": [
            "Kiểm tra dữ liệu đồng bộ giữa APP, API và FLEX.",
            "Yêu cầu khách hàng làm mới dữ liệu và thu thập phiên bản ứng dụng.",
            "Chuyển kỹ thuật kiểm tra cache và luồng lấy dữ liệu.",
        ],
        "responses": [
            "Dữ liệu đã được đồng bộ và hiển thị lại bình thường.",
            "Đã khắc phục lỗi hiển thị trên tài khoản khách hàng.",
            "Khách hàng xác nhận số liệu đã cập nhật chính xác.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("EKYC", "DINH_DANH", "TAI_KHOAN", "MO_TAI_KHOAN"),
        "titles": [
            "eKYC không nhận diện giấy tờ",
            "Thông tin tài khoản cần cập nhật",
            "Không hoàn tất bước xác thực khuôn mặt",
            "Yêu cầu kiểm tra hồ sơ mở tài khoản",
        ],
        "requests": [
            "Khách hàng không hoàn tất eKYC do ảnh giấy tờ không được nhận diện.",
            "Thông tin cá nhân trên tài khoản chưa khớp với giấy tờ mới.",
            "Khách hàng bị dừng tại bước xác thực khuôn mặt.",
            "Hồ sơ mở tài khoản đã gửi nhưng chưa có kết quả.",
        ],
        "solutions": [
            "Kiểm tra trạng thái eKYC và hướng dẫn chụp lại giấy tờ đúng tiêu chuẩn.",
            "Đối chiếu hồ sơ khách hàng và chuyển yêu cầu cập nhật thông tin.",
            "Kiểm tra nhật ký xác thực và trạng thái duyệt hồ sơ.",
        ],
        "responses": [
            "Khách hàng đã hoàn tất xác thực eKYC.",
            "Thông tin tài khoản đã được cập nhật theo hồ sơ hợp lệ.",
            "Hồ sơ đã được duyệt và phản hồi đến khách hàng.",
        ],
        "system": "APP",
    },
    {
        "keywords": ("NAP_TIEN", "RUT_TIEN", "CHUYEN_KHOAN", "THANH_TOAN"),
        "titles": [
            "Nạp tiền chưa ghi nhận vào tài khoản",
            "Yêu cầu kiểm tra giao dịch rút tiền",
            "Chuyển khoản chưa cập nhật trạng thái",
            "Tra soát giao dịch thanh toán",
        ],
        "requests": [
            "Khách hàng đã chuyển tiền nhưng số dư chưa được ghi nhận.",
            "Lệnh rút tiền đang chờ xử lý lâu hơn dự kiến.",
            "Khách hàng cần tra soát nội dung chuyển khoản vào tài khoản chứng khoán.",
            "Trạng thái thanh toán hiển thị chưa hoàn tất dù ngân hàng đã trừ tiền.",
        ],
        "solutions": [
            "Đối chiếu sao kê, nội dung chuyển khoản và trạng thái hạch toán.",
            "Kiểm tra giao dịch trên FLEX và phối hợp bộ phận kế toán xử lý.",
            "Xác minh thời gian giao dịch và cập nhật trạng thái cho khách hàng.",
        ],
        "responses": [
            "Khoản tiền đã được ghi nhận vào tài khoản khách hàng.",
            "Giao dịch rút tiền đã hoàn tất.",
            "Kết quả tra soát đã được thông báo cho khách hàng.",
        ],
        "system": "FLEX",
    },
    {
        "keywords": ("PORTAL", "HE_THONG", "API", "CRM"),
        "titles": [
            "Portal không tải được dữ liệu",
            "Lỗi đồng bộ dữ liệu hệ thống",
            "API trả về trạng thái không thành công",
            "Yêu cầu kiểm tra kết nối hệ thống",
        ],
        "requests": [
            "Người dùng phản ánh portal không hiển thị dữ liệu sau khi đăng nhập.",
            "Dữ liệu giữa CRM và hệ thống nghiệp vụ chưa đồng bộ.",
            "API phát sinh lỗi trong quá trình tiếp nhận yêu cầu.",
            "Hệ thống phản hồi chậm và có lúc mất kết nối.",
        ],
        "solutions": [
            "Kiểm tra log API, trạng thái dịch vụ và luồng đồng bộ dữ liệu.",
            "Thực hiện đồng bộ lại bản ghi và theo dõi kết quả.",
            "Chuyển kỹ thuật kiểm tra kết nối giữa các hệ thống.",
        ],
        "responses": [
            "Dữ liệu đã được đồng bộ lại thành công.",
            "Kết nối hệ thống đã ổn định.",
            "API đã hoạt động bình thường và yêu cầu được xử lý.",
        ],
        "system": "API",
    },
    {
        "keywords": ("KHIEU_NAI", "GOP_Y", "PHAN_ANH"),
        "titles": [
            "Khách hàng khiếu nại thời gian xử lý",
            "Góp ý về chất lượng hỗ trợ",
            "Phản ánh kết quả xử lý chưa phù hợp",
            "Yêu cầu xem xét lại nội dung phản hồi",
        ],
        "requests": [
            "Khách hàng phản ánh thời gian xử lý yêu cầu kéo dài.",
            "Khách hàng chưa đồng ý với kết quả phản hồi trước đó.",
            "Khách hàng góp ý về quy trình tiếp nhận và cập nhật tiến độ.",
            "Khách hàng yêu cầu kiểm tra lại lịch sử trao đổi.",
        ],
        "solutions": [
            "Rà soát toàn bộ lịch sử xử lý và trao đổi lại với đơn vị liên quan.",
            "Xác minh nội dung phản ánh và cập nhật kết quả cho khách hàng.",
            "Ghi nhận góp ý để cải thiện quy trình phục vụ.",
        ],
        "responses": [
            "Đã giải thích kết quả xử lý và khách hàng đồng ý.",
            "Nội dung khiếu nại đã được rà soát và phản hồi chính thức.",
            "Góp ý của khách hàng đã được ghi nhận.",
        ],
        "system": "CRM",
    },
    {
        "keywords": ("CHAM_SOC", "HO_TRO", "SAN_PHAM", "KIEN_THUC"),
        "titles": [
            "Tư vấn thông tin sản phẩm",
            "Hỗ trợ sử dụng dịch vụ",
            "Khách hàng cần hướng dẫn thao tác",
            "Yêu cầu cung cấp thông tin tài khoản",
        ],
        "requests": [
            "Khách hàng cần được hướng dẫn sử dụng chức năng trên hệ thống.",
            "Khách hàng yêu cầu tư vấn thông tin sản phẩm và dịch vụ.",
            "Khách hàng cần giải thích quy trình thực hiện giao dịch.",
            "Khách hàng cần hỗ trợ kiểm tra thông tin liên quan đến tài khoản.",
        ],
        "solutions": [
            "Tư vấn quy trình và gửi hướng dẫn chi tiết cho khách hàng.",
            "Giải thích thông tin sản phẩm theo tài liệu hiện hành.",
            "Hướng dẫn khách hàng thực hiện từng bước trên ứng dụng.",
        ],
        "responses": [
            "Khách hàng đã nhận đủ thông tin cần thiết.",
            "Đã hướng dẫn và khách hàng thao tác thành công.",
            "Nội dung tư vấn đã được gửi đến khách hàng.",
        ],
        "system": "CRM",
    },
]

DEFAULT_SCENARIO = {
    "titles": [
        "Yêu cầu hỗ trợ từ khách hàng",
        "Kiểm tra thông tin dịch vụ",
        "Hỗ trợ xử lý yêu cầu phát sinh",
        "Tra soát nội dung khách hàng phản ánh",
    ],
    "requests": [
        "Khách hàng liên hệ CCC và cần hỗ trợ kiểm tra thông tin.",
        "Khách hàng phản ánh một nội dung phát sinh trong quá trình sử dụng dịch vụ.",
        "Khách hàng yêu cầu tra soát và cập nhật kết quả xử lý.",
        "Khách hàng cần được hướng dẫn thêm về quy trình thực hiện.",
    ],
    "solutions": [
        "Tiếp nhận thông tin, xác minh dữ liệu và chuyển đơn vị liên quan xử lý.",
        "Đối chiếu thông tin trên hệ thống và cập nhật tiến độ cho khách hàng.",
        "Hướng dẫn khách hàng bổ sung dữ liệu cần thiết.",
    ],
    "responses": [
        "Yêu cầu đã được xử lý và phản hồi đến khách hàng.",
        "Khách hàng đã xác nhận kết quả hỗ trợ.",
        "Đã hoàn tất nội dung tra soát.",
    ],
    "system": "CRM",
}


class Command(BaseCommand):
    help = (
        "Tạo dữ liệu ticket CCC mẫu từ đầu năm 2026 đến thời điểm chỉ định. "
        "Chỉ sử dụng các danh mục, khách hàng và nhân viên đang có trong DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--branch-code",
            default="HO_Q7",
            help="Mã Hội sở chứa nhân viên CCC. Mặc định: HO_Q7.",
        )
        parser.add_argument(
            "--per-month",
            type=int,
            default=24,
            help="Số ticket tạo cho mỗi tháng. Mặc định: 24.",
        )
        parser.add_argument(
            "--start-date",
            default="2026-01-01",
            help="Ngày bắt đầu dạng YYYY-MM-DD. Mặc định: 2026-01-01.",
        )
        parser.add_argument(
            "--end-date",
            default=None,
            help=(
                "Ngày kết thúc dạng YYYY-MM-DD. "
                "Mặc định là ngày hiện tại nhưng không vượt quá 2026-07-31."
            ),
        )
        parser.add_argument(
            "--random-seed",
            type=int,
            default=20260721,
            help="Seed cho bộ sinh số ngẫu nhiên để kết quả ổn định.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa toàn bộ ticket có mã bắt đầu bằng CCC-DEMO-2026- trước khi tạo lại.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        per_month = options["per_month"]
        if per_month <= 0:
            raise CommandError("--per-month phải lớn hơn 0.")

        start_date = self._parse_date(options["start_date"], "--start-date")

        if options["end_date"]:
            end_date = self._parse_date(options["end_date"], "--end-date")
        else:
            end_date = min(timezone.localdate(), date(2026, 7, 31))

        if start_date > end_date:
            raise CommandError("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.")

        if start_date.year != 2026 or end_date.year != 2026:
            raise CommandError("Command này chỉ tạo dữ liệu trong năm 2026.")

        rng = random.Random(options["random_seed"])

        if options["reset"]:
            deleted_count, _ = Ticket.objects.filter(
                ticket_code__startswith=TICKET_CODE_PREFIX
            ).delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Đã xóa {deleted_count} bản ghi ticket và dữ liệu liên quan của seed cũ."
                )
            )

        branch = self._find_branch(options["branch_code"])
        employees, users = self._load_ccc_people(branch)

        categories = list(
            TicketSupportCategory.objects.filter(is_active=True).order_by(
                "sort_order", "id"
            )
        )
        statuses = list(
            TicketStatus.objects.filter(is_active=True).order_by("sort_order", "id")
        )
        priorities = list(
            TicketPriority.objects.filter(is_active=True).order_by(
                "level_order", "id"
            )
        )
        sources = list(TicketSource.objects.filter(is_active=True).order_by("id"))

        if not categories:
            raise CommandError(
                "Chưa có TicketSupportCategory đang hoạt động. Hãy chạy seed ticket master trước."
            )
        if not statuses:
            raise CommandError(
                "Chưa có TicketStatus đang hoạt động. Hãy chạy seed ticket master trước."
            )
        if not priorities:
            raise CommandError(
                "Chưa có TicketPriority đang hoạt động. Hãy chạy seed ticket master trước."
            )
        if not sources:
            raise CommandError(
                "Chưa có TicketSource đang hoạt động. Hãy chạy seed ticket master trước."
            )

        classifications = list(
            TicketClassification.objects.filter(is_active=True).select_related(
                "support_category"
            )
        )
        error_groups = list(
            TicketErrorGroup.objects.filter(is_active=True).order_by(
                "sort_order", "id"
            )
        )
        error_types = list(
            TicketErrorType.objects.filter(is_active=True)
            .select_related("group")
            .order_by("group__sort_order", "sort_order", "id")
        )
        customers = list(
            Customer.objects.filter(status="ACTIVE")
            .select_related("company", "membership_tier", "branch")
            .order_by("id")
        )
        customer_accounts = list(
            CustomerAccount.objects.select_related(
                "customer",
                "customer__company",
                "customer__membership_tier",
            ).order_by("id")
        )
        companies = list(Company.objects.filter(status="ACTIVE").order_by("id"))
        tags = list(Tag.objects.filter(is_active=True).order_by("id"))
        units = self._load_processing_units(branch, employees)
        sla_policies = self._load_sla_policies()

        ticket_datetimes = self._build_ticket_datetimes(
            start_date=start_date,
            end_date=end_date,
            per_month=per_month,
            rng=rng,
        )

        if not ticket_datetimes:
            raise CommandError("Không tạo được mốc thời gian ticket trong khoảng đã chọn.")

        forced_status_by_index = self._build_forced_status_positions(
            total=len(ticket_datetimes),
            statuses=statuses,
        )

        created_count = 0
        updated_count = 0
        status_counter: Counter[str] = Counter()
        month_counter: Counter[str] = Counter()

        supervisor_user = self._find_supervisor_user(users)
        execution_cap = self._execution_cap(end_date)

        for index, created_at in enumerate(ticket_datetimes, start=1):
            assigned_employee = employees[(index - 1) % len(employees)]
            assigned_user = assigned_employee.user_account
            created_by_user = supervisor_user or assigned_user

            category = rng.choice(categories)
            classification = self._choose_classification(
                category=category,
                classifications=classifications,
                rng=rng,
            )
            priority = rng.choice(priorities)
            source = rng.choice(sources)

            if (index - 1) in forced_status_by_index:
                status = forced_status_by_index[index - 1]
            else:
                status = self._choose_status(
                    statuses=statuses,
                    created_at=created_at,
                    end_date=end_date,
                    rng=rng,
                )

            error_group, error_type = self._choose_error(
                error_groups=error_groups,
                error_types=error_types,
                rng=rng,
            )

            scenario = self._choose_scenario(
                category=category,
                classification=classification,
            )

            (
                customer,
                customer_account,
                company,
                account_link_status,
                raw_account_number,
            ) = self._choose_customer_data(
                customers=customers,
                customer_accounts=customer_accounts,
                companies=companies,
                rng=rng,
            )

            assigned_unit = self._choose_unit(
                units=units,
                employee=assigned_employee,
                rng=rng,
            )

            sla_policy = self._choose_sla_policy(
                policies=sla_policies,
                category=category,
                priority=priority,
                rng=rng,
            )

            related_system = (
                getattr(error_type, "related_system", None)
                or getattr(error_group, "related_system", None)
                or scenario["system"]
                or rng.choice(SYSTEM_OPTIONS)
            )

            source_code = (source.source_code or "").upper()
            classification_method = (
                "AUTO"
                if any(
                    token in source_code
                    for token in ("API", "CHATBOT", "BOT", "WEBHOOK", "SYSTEM")
                )
                or rng.random() < 0.25
                else "MANUAL"
            )

            timeline_times = self._build_timeline_times(
                created_at=created_at,
                current_status=status,
                cap=execution_cap,
                rng=rng,
            )
            stage = self._status_stage(status)

            title = rng.choice(scenario["titles"])
            if error_type and rng.random() < 0.45:
                title = f"{title} - {error_type.type_name}"

            customer_text = customer.full_name if customer else "khách hàng chưa định danh"
            request_content = (
                f"{rng.choice(scenario['requests'])} "
                f"Người liên hệ: {customer_text}. "
                f"Mã tham chiếu seed: {index:04d}."
            )
            handling_solution = (
                rng.choice(scenario["solutions"])
                if stage in {"processing", "done", "pending_close", "closed"}
                else None
            )
            final_response = (
                rng.choice(scenario["responses"])
                if stage in {"done", "pending_close", "closed"}
                else None
            )
            cancelled_reason = (
                rng.choice(CANCEL_REASON_OPTIONS) if stage == "cancelled" else None
            )

            external_status = None
            last_synced_at = None
            if classification_method == "AUTO" or rng.random() < 0.35:
                external_status = rng.choice(EXTERNAL_STATUS_OPTIONS)
                last_synced_at = min(
                    timeline_times.get("updated") or created_at,
                    execution_cap,
                )

            ticket_code = f"{TICKET_CODE_PREFIX}{index:04d}"
            source_ref_id = f"{SOURCE_REF_PREFIX}{index:04d}"

            defaults = {
                "title": title[:255],
                "customer": customer,
                "company": company,
                "customer_account": customer_account,
                "account_link_status": account_link_status,
                "raw_account_number": raw_account_number,
                "handling_branch": branch,
                "assigned_unit": assigned_unit,
                "assigned_employee": assigned_employee,
                "owner_user": assigned_user,
                "owner_employee": assigned_employee,
                "support_category": category,
                "classification": classification,
                "current_status": status,
                "priority": priority,
                "source": source,
                "sla_policy": sla_policy,
                "classification_method": classification_method,
                "source_ref_id": source_ref_id,
                "error_group": error_group,
                "error_type": error_type,
                "error_note": (
                    f"Ghi nhận lỗi: {error_type.type_name}."
                    if error_type
                    else None
                ),
                "related_system": related_system,
                "external_status": external_status,
                "last_synced_at": last_synced_at,
                "request_content": request_content,
                "handling_solution": handling_solution,
                "final_response": final_response,
                "assigned_at": timeline_times["assigned"],
                "accepted_at": timeline_times.get("accepted"),
                "processing_started_at": timeline_times.get("processing"),
                "done_at": timeline_times.get("done"),
                "closed_at": timeline_times.get("closed"),
                "cancelled_at": timeline_times.get("cancelled"),
                "accepted_by_user": (
                    assigned_user
                    if timeline_times.get("accepted")
                    else None
                ),
                "done_by_user": (
                    assigned_user
                    if timeline_times.get("done")
                    else None
                ),
                "closed_by_user": (
                    supervisor_user or assigned_user
                    if timeline_times.get("closed")
                    else None
                ),
                "cancelled_by_user": (
                    supervisor_user or assigned_user
                    if timeline_times.get("cancelled")
                    else None
                ),
                "cancelled_reason": cancelled_reason,
                "is_locked_for_amend": stage in {"closed", "cancelled"},
                "created_by_user": created_by_user,
                "updated_by_user": assigned_user,
            }

            ticket, was_created = Ticket.objects.update_or_create(
                ticket_code=ticket_code,
                defaults=defaults,
            )

            if was_created:
                created_count += 1
            else:
                updated_count += 1

            updated_at = timeline_times.get("updated") or created_at
            self._set_timestamp_fields(
                model=Ticket,
                object_id=ticket.pk,
                created_at=created_at,
                updated_at=updated_at,
            )

            self._rebuild_related_data(
                ticket=ticket,
                status=status,
                statuses=statuses,
                timeline_times=timeline_times,
                assigned_employee=assigned_employee,
                assigned_user=assigned_user,
                created_by_user=created_by_user,
                supervisor_user=supervisor_user,
                branch=branch,
                unit=assigned_unit,
                priority=priority,
                sla_policy=sla_policy,
                customer=customer,
                scenario=scenario,
                tags=tags,
                all_users=users,
                rng=rng,
            )

            status_counter[status.status_code] += 1
            month_counter[created_at.strftime("%Y-%m")] += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed ticket CCC hoàn tất."))
        self.stdout.write(f"- Hội sở xử lý: {branch.branch_code} - {branch.branch_name}")
        self.stdout.write(f"- Nhân viên CCC: {len(employees)}")
        self.stdout.write(f"- Ticket tạo mới: {created_count}")
        self.stdout.write(f"- Ticket cập nhật: {updated_count}")
        self.stdout.write(f"- Tổng ticket seed: {len(ticket_datetimes)}")
        self.stdout.write(
            f"- Khoảng thời gian: {start_date.isoformat()} đến {end_date.isoformat()}"
        )

        self.stdout.write("\nTheo tháng:")
        for key in sorted(month_counter):
            self.stdout.write(f"  {key}: {month_counter[key]}")

        self.stdout.write("\nTheo trạng thái:")
        for status in statuses:
            self.stdout.write(
                f"  {status.status_code}: {status_counter[status.status_code]}"
            )

        if not customers:
            self.stdout.write(
                self.style.WARNING(
                    "\nKhông có Customer ACTIVE nên một số ticket không gắn khách hàng."
                )
            )
        if not customer_accounts:
            self.stdout.write(
                self.style.WARNING(
                    "Không có CustomerAccount nên ticket đều ở trạng thái chưa liên kết."
                )
            )
        if not classifications:
            self.stdout.write(
                self.style.WARNING(
                    "Không có TicketClassification ACTIVE nên classification để trống."
                )
            )
        if not sla_policies:
            self.stdout.write(
                self.style.WARNING(
                    "Không tìm thấy SlaPolicy phù hợp nên sla_policy để trống."
                )
            )

    def _parse_date(self, raw_value: str, option_name: str) -> date:
        try:
            return date.fromisoformat(raw_value)
        except ValueError as exc:
            raise CommandError(
                f"{option_name} phải có định dạng YYYY-MM-DD."
            ) from exc

    def _find_branch(self, branch_code: str) -> Branch:
        branch = Branch.objects.filter(
            branch_code=branch_code,
            status="ACTIVE",
        ).first()

        if branch:
            return branch

        branch = (
            Branch.objects.filter(status="ACTIVE")
            .filter(
                Q(branch_name__icontains="hội sở")
                | Q(branch_name__icontains="hoi so")
            )
            .filter(
                Q(branch_name__icontains="7")
                | Q(address__icontains="Quận 7")
                | Q(address__icontains="Quan 7")
            )
            .first()
        )

        if not branch:
            raise CommandError(
                f"Không tìm thấy Hội sở với branch_code={branch_code}. "
                "Có thể truyền mã khác bằng --branch-code."
            )

        self.stdout.write(
            self.style.WARNING(
                f"Không tìm thấy mã {branch_code}; sử dụng {branch.branch_code}."
            )
        )
        return branch

    def _load_ccc_people(
        self,
        branch: Branch,
    ) -> tuple[list[Employee], list[User]]:
        employees = list(
            Employee.objects.filter(
                branch=branch,
                status="ACTIVE",
                user_account__isnull=False,
            )
            .filter(
                Q(department__iexact="CCC")
                | Q(
                    user_account__user_roles__role__group_code=Role.GROUP_CCC
                )
            )
            .select_related("user_account")
            .distinct()
            .order_by("employee_code")
        )

        if not employees:
            raise CommandError(
                f"Không tìm thấy nhân viên CCC có tài khoản tại {branch.branch_code}. "
                "Hãy chạy seed nhân viên và account trước."
            )

        users = [employee.user_account for employee in employees]

        self.stdout.write(
            f"Sử dụng nhân viên CCC: "
            f"{', '.join(employee.employee_code for employee in employees)}"
        )

        return employees, users

    def _find_supervisor_user(self, users: list[User]) -> User | None:
        user_ids = [user.pk for user in users]
        return (
            User.objects.filter(
                pk__in=user_ids,
                user_roles__role__role_code="CS_SUPERVISOR",
            )
            .distinct()
            .first()
        )

    def _load_processing_units(
        self,
        branch: Branch,
        employees: list[Employee],
    ) -> list[ProcessingUnit]:
        employee_ids = [employee.pk for employee in employees]

        return list(
            ProcessingUnit.objects.filter(is_active=True)
            .filter(
                Q(default_branch=branch)
                | Q(
                    members__employee_id__in=employee_ids,
                    members__is_active=True,
                )
            )
            .distinct()
            .order_by("id")
        )

    def _load_sla_policies(self) -> list[Any]:
        try:
            model = apps.get_model("sla", "SlaPolicy")
        except LookupError:
            return []

        queryset = model.objects.all()
        field_names = {
            field.name
            for field in model._meta.get_fields()
        }

        if "is_active" in field_names:
            queryset = queryset.filter(is_active=True)
        elif "status" in field_names:
            queryset = queryset.filter(status="ACTIVE")

        return list(queryset.order_by("id"))

    def _choose_sla_policy(
        self,
        policies: list[Any],
        category: TicketSupportCategory,
        priority: TicketPriority,
        rng: random.Random,
    ) -> Any | None:
        if not policies:
            return None

        model = policies[0].__class__
        field_names = {
            field.name
            for field in model._meta.get_fields()
        }

        matched = policies

        if "support_category" in field_names:
            category_matched = [
                policy
                for policy in matched
                if getattr(policy, "support_category_id", None) == category.pk
            ]
            if category_matched:
                matched = category_matched

        if "priority" in field_names:
            priority_matched = [
                policy
                for policy in matched
                if getattr(policy, "priority_id", None) == priority.pk
            ]
            if priority_matched:
                matched = priority_matched

        return rng.choice(matched or policies)

    def _build_ticket_datetimes(
        self,
        start_date: date,
        end_date: date,
        per_month: int,
        rng: random.Random,
    ) -> list[datetime]:
        result: list[datetime] = []

        year = start_date.year
        month = start_date.month

        while (year, month) <= (end_date.year, end_date.month):
            month_start = max(start_date, date(year, month, 1))
            last_day = calendar.monthrange(year, month)[1]
            month_end = min(end_date, date(year, month, last_day))

            total_days = (month_end - month_start).days

            for _ in range(per_month):
                selected_date = month_start + timedelta(
                    days=rng.randint(0, total_days)
                )

                max_hour = 20
                if selected_date == timezone.localdate():
                    max_hour = max(0, min(20, timezone.localtime().hour - 1))

                selected_time = time(
                    hour=rng.randint(8, max(8, max_hour)),
                    minute=rng.randint(0, 59),
                    second=rng.randint(0, 59),
                )

                value = timezone.make_aware(
                    datetime.combine(selected_date, selected_time),
                    timezone.get_current_timezone(),
                )

                if value > timezone.now():
                    value = timezone.now() - timedelta(minutes=rng.randint(5, 120))

                result.append(value)

            if month == 12:
                year += 1
                month = 1
            else:
                month += 1

        result.sort()
        return result

    def _build_forced_status_positions(
        self,
        total: int,
        statuses: list[TicketStatus],
    ) -> dict[int, TicketStatus]:
        if total < len(statuses):
            raise CommandError(
                "Tổng số ticket nhỏ hơn số trạng thái đang có. "
                "Hãy tăng --per-month để mỗi trạng thái xuất hiện ít nhất một lần."
            )

        if len(statuses) == 1:
            return {0: statuses[0]}

        positions: dict[int, TicketStatus] = {}
        last_position = total - 1

        for index, status in enumerate(statuses):
            position = round(index * last_position / (len(statuses) - 1))
            while position in positions and position < last_position:
                position += 1
            positions[position] = status

        return positions

    def _choose_status(
        self,
        statuses: list[TicketStatus],
        created_at: datetime,
        end_date: date,
        rng: random.Random,
    ) -> TicketStatus:
        age_days = max(0, (end_date - created_at.date()).days)
        weights = [
            self._status_weight(status, age_days)
            for status in statuses
        ]
        return rng.choices(statuses, weights=weights, k=1)[0]

    def _status_weight(self, status: TicketStatus, age_days: int) -> int:
        stage = self._status_stage(status)

        if age_days >= 90:
            return {
                "created": 1,
                "accepted": 2,
                "processing": 5,
                "done": 12,
                "pending_close": 12,
                "closed": 50,
                "cancelled": 10,
                "other": 4,
            }.get(stage, 4)

        if age_days >= 30:
            return {
                "created": 3,
                "accepted": 5,
                "processing": 15,
                "done": 20,
                "pending_close": 18,
                "closed": 30,
                "cancelled": 8,
                "other": 5,
            }.get(stage, 5)

        return {
            "created": 18,
            "accepted": 18,
            "processing": 30,
            "done": 16,
            "pending_close": 12,
            "closed": 5,
            "cancelled": 6,
            "other": 6,
        }.get(stage, 6)

    def _status_stage(self, status: TicketStatus) -> str:
        value = f"{status.status_code} {status.status_name}".upper()

        if any(token in value for token in ("CANCEL", "CANCELED", "CANCELLED", "HỦY", "HUY")):
            return "cancelled"
        if any(token in value for token in ("CLOSED", "ĐÃ ĐÓNG", "DA DONG")):
            return "closed"
        if any(token in value for token in ("PENDING_CLOSE", "CHỜ ĐÓNG", "CHO DONG")):
            return "pending_close"
        if any(token in value for token in ("DONE_WAIT_CLOSE", "DONE", "ĐÃ XONG", "DA XONG", "HOÀN TẤT", "HOAN TAT")):
            return "done"
        if any(token in value for token in ("PROCESSING", "ĐANG XỬ LÝ", "DANG XU LY")):
            return "processing"
        if any(token in value for token in ("ACCEPTED", "RECEIVED", "TIẾP NHẬN", "TIEP NHAN")):
            return "accepted"
        if any(token in value for token in ("CREATED", "OPEN", "MỞ", "MO")):
            return "created"

        return "other"

    def _choose_classification(
        self,
        category: TicketSupportCategory,
        classifications: list[TicketClassification],
        rng: random.Random,
    ) -> TicketClassification | None:
        matched = [
            item
            for item in classifications
            if item.support_category_id in (None, category.pk)
        ]
        if not matched:
            return None
        return rng.choice(matched) if rng.random() < 0.88 else None

    def _choose_error(
        self,
        error_groups: list[TicketErrorGroup],
        error_types: list[TicketErrorType],
        rng: random.Random,
    ) -> tuple[TicketErrorGroup | None, TicketErrorType | None]:
        if error_types and rng.random() < 0.62:
            error_type = rng.choice(error_types)
            return error_type.group, error_type

        if error_groups and rng.random() < 0.18:
            return rng.choice(error_groups), None

        return None, None

    def _choose_scenario(
        self,
        category: TicketSupportCategory,
        classification: TicketClassification | None,
    ) -> dict[str, Any]:
        search_text = " ".join(
            [
                category.category_code or "",
                category.category_name or "",
                classification.classification_code if classification else "",
                classification.classification_name if classification else "",
            ]
        ).upper()

        for scenario in SCENARIOS:
            if any(keyword in search_text for keyword in scenario["keywords"]):
                return scenario

        return DEFAULT_SCENARIO

    def _choose_customer_data(
        self,
        customers: list[Customer],
        customer_accounts: list[CustomerAccount],
        companies: list[Company],
        rng: random.Random,
    ) -> tuple[
        Customer | None,
        CustomerAccount | None,
        Company | None,
        str,
        str | None,
    ]:
        if customer_accounts and rng.random() < 0.58:
            customer_account = rng.choice(customer_accounts)
            customer = customer_account.customer
            company = customer.company
            return (
                customer,
                customer_account,
                company,
                TicketAccountLinkStatus.LINKED,
                None,
            )

        customer = (
            rng.choice(customers)
            if customers and rng.random() < 0.82
            else None
        )

        company = customer.company if customer else None
        if company is None and companies and rng.random() < 0.18:
            company = rng.choice(companies)

        raw_account_number = None
        if rng.random() < 0.72:
            raw_account_number = "".join(
                str(rng.randint(0, 9))
                for _ in range(10)
            )

        return (
            customer,
            None,
            company,
            TicketAccountLinkStatus.UNLINKED,
            raw_account_number,
        )

    def _choose_unit(
        self,
        units: list[ProcessingUnit],
        employee: Employee,
        rng: random.Random,
    ) -> ProcessingUnit | None:
        if not units:
            return None

        employee_units = [
            unit
            for unit in units
            if unit.members.filter(
                employee=employee,
                is_active=True,
            ).exists()
        ]

        if employee_units:
            return rng.choice(employee_units)

        return rng.choice(units)

    def _execution_cap(self, end_date: date) -> datetime:
        if end_date == timezone.localdate():
            return timezone.now()

        return timezone.make_aware(
            datetime.combine(end_date, time(23, 59, 59)),
            timezone.get_current_timezone(),
        )

    def _build_timeline_times(
        self,
        created_at: datetime,
        current_status: TicketStatus,
        cap: datetime,
        rng: random.Random,
    ) -> dict[str, datetime | None]:
        stage = self._status_stage(current_status)

        minimum_hours = {
            "created": 1,
            "accepted": 2,
            "processing": 4,
            "done": 8,
            "pending_close": 12,
            "closed": 24,
            "cancelled": 4,
            "other": 2,
        }.get(stage, 2)

        if cap - created_at < timedelta(hours=minimum_hours):
            created_at = cap - timedelta(hours=minimum_hours)

        values: dict[str, datetime | None] = {
            "created": created_at,
            "assigned": self._advance(
                created_at,
                rng.randint(5, 90),
                cap,
            ),
            "accepted": None,
            "processing": None,
            "done": None,
            "pending_close": None,
            "closed": None,
            "cancelled": None,
            "updated": created_at,
        }

        if stage == "cancelled":
            if rng.random() < 0.55:
                values["accepted"] = self._advance(
                    values["assigned"],
                    rng.randint(5, 60),
                    cap,
                )
            base = values["accepted"] or values["assigned"]
            values["cancelled"] = self._advance(
                base,
                rng.randint(20, 720),
                cap,
            )
            values["updated"] = values["cancelled"]
            return values

        stage_order = {
            "created": 0,
            "accepted": 1,
            "processing": 2,
            "done": 3,
            "pending_close": 4,
            "closed": 5,
            "other": 1,
        }
        current_order = stage_order.get(stage, 1)

        if current_order >= 1:
            values["accepted"] = self._advance(
                values["assigned"],
                rng.randint(5, 90),
                cap,
            )
            values["updated"] = values["accepted"]

        if current_order >= 2:
            values["processing"] = self._advance(
                values["accepted"],
                rng.randint(10, 240),
                cap,
            )
            values["updated"] = values["processing"]

        if current_order >= 3:
            values["done"] = self._advance(
                values["processing"],
                rng.randint(30, 2880),
                cap,
            )
            values["updated"] = values["done"]

        if current_order >= 4:
            values["pending_close"] = self._advance(
                values["done"],
                rng.randint(15, 720),
                cap,
            )
            values["updated"] = values["pending_close"]

        if current_order >= 5:
            close_base = values["pending_close"] or values["done"]
            values["closed"] = self._advance(
                close_base,
                rng.randint(30, 4320),
                cap,
            )
            values["updated"] = values["closed"]

        return values

    def _advance(
        self,
        value: datetime | None,
        minutes: int,
        cap: datetime,
    ) -> datetime:
        if value is None:
            return cap

        result = value + timedelta(minutes=max(1, minutes))
        return min(result, cap)

    def _build_status_timeline(
        self,
        current_status: TicketStatus,
        statuses: list[TicketStatus],
        times: dict[str, datetime | None],
    ) -> list[tuple[TicketStatus, datetime]]:
        by_stage: dict[str, TicketStatus] = {}

        for status in statuses:
            stage = self._status_stage(status)
            by_stage.setdefault(stage, status)

        current_stage = self._status_stage(current_status)
        result: list[tuple[TicketStatus, datetime]] = []

        def append_status(
            status: TicketStatus | None,
            at: datetime | None,
        ) -> None:
            if status is None or at is None:
                return
            if result and result[-1][0].pk == status.pk:
                return
            result.append((status, at))

        append_status(by_stage.get("created"), times.get("created"))

        if current_stage == "cancelled":
            append_status(by_stage.get("accepted"), times.get("accepted"))
            append_status(current_status, times.get("cancelled"))
            return result

        order = {
            "created": 0,
            "accepted": 1,
            "processing": 2,
            "done": 3,
            "pending_close": 4,
            "closed": 5,
            "other": 1,
        }
        current_order = order.get(current_stage, 1)

        if current_order >= 1:
            append_status(by_stage.get("accepted"), times.get("accepted"))
        if current_order >= 2:
            append_status(by_stage.get("processing"), times.get("processing"))
        if current_order >= 3:
            done_status = (
                current_status
                if current_stage == "done"
                else by_stage.get("done")
            )
            append_status(done_status, times.get("done"))
        if current_order >= 4:
            pending_status = (
                current_status
                if current_stage == "pending_close"
                else by_stage.get("pending_close")
            )
            append_status(
                pending_status,
                times.get("pending_close") or times.get("done"),
            )
        if current_order >= 5:
            append_status(current_status, times.get("closed"))

        if not result or result[-1][0].pk != current_status.pk:
            append_status(
                current_status,
                times.get(current_stage)
                or times.get("updated")
                or times["created"],
            )

        return result

    def _rebuild_related_data(
        self,
        *,
        ticket: Ticket,
        status: TicketStatus,
        statuses: list[TicketStatus],
        timeline_times: dict[str, datetime | None],
        assigned_employee: Employee,
        assigned_user: User,
        created_by_user: User,
        supervisor_user: User | None,
        branch: Branch,
        unit: ProcessingUnit | None,
        priority: TicketPriority,
        sla_policy: Any | None,
        customer: Customer | None,
        scenario: dict[str, Any],
        tags: list[Tag],
        all_users: list[User],
        rng: random.Random,
    ) -> None:
        TicketProcessLog.objects.filter(ticket=ticket).delete()
        TicketAssignment.objects.filter(ticket=ticket).delete()
        TicketUpdateLog.objects.filter(ticket=ticket).delete()
        TicketResponse.objects.filter(ticket=ticket).delete()
        TicketComment.objects.filter(ticket=ticket).delete()
        TicketActivityLog.objects.filter(ticket=ticket).delete()
        TicketAttachment.objects.filter(ticket=ticket).delete()
        TicketFeedback.objects.filter(ticket=ticket).delete()
        TicketTag.objects.filter(ticket=ticket).delete()
        TicketFollower.objects.filter(ticket=ticket).delete()

        assignment = TicketAssignment.objects.create(
            ticket=ticket,
            from_branch=branch,
            to_branch=branch,
            from_unit=None,
            to_unit=unit,
            from_employee=None,
            to_employee=assigned_employee,
            assigned_by_user=created_by_user,
            assigned_at=timeline_times["assigned"],
            unassigned_at=None,
            is_current=True,
            transfer_reason=rng.choice(TRANSFER_REASON_OPTIONS),
            note="Dữ liệu phân công được tạo bởi seed ticket CCC.",
            created_at=timeline_times["assigned"],
        )

        TicketUpdateLog.objects.create(
            ticket=ticket,
            action_type="ASSIGN_EMPLOYEE",
            from_status=None,
            to_status=None,
            from_unit=None,
            to_unit=unit,
            from_branch=branch,
            to_branch=branch,
            from_employee=None,
            to_employee=assigned_employee,
            old_priority=None,
            new_priority=priority,
            old_sla_policy=None,
            new_sla_policy=sla_policy,
            note="Phân công ticket cho nhân viên CCC.",
            created_by_user=created_by_user,
            created_at=timeline_times["assigned"],
        )

        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type="CREATE",
            action_name="Tạo ticket",
            old_value=None,
            new_value=status.status_code,
            created_by_user=created_by_user,
            created_at=timeline_times["created"],
            note="Ticket mẫu được tạo từ management command.",
        )

        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type="ASSIGN_EMPLOYEE",
            action_name="Phân công nhân viên",
            old_value=None,
            new_value=assigned_employee.employee_code,
            created_by_user=created_by_user,
            created_at=timeline_times["assigned"],
            note=assignment.transfer_reason,
        )

        timeline = self._build_status_timeline(
            current_status=status,
            statuses=statuses,
            times=timeline_times,
        )

        for item_index, (timeline_status, start_at) in enumerate(timeline):
            end_at = (
                timeline[item_index + 1][1]
                if item_index + 1 < len(timeline)
                else None
            )
            duration_minutes = None

            if end_at:
                duration_minutes = max(
                    0,
                    int((end_at - start_at).total_seconds() // 60),
                )

            TicketProcessLog.objects.create(
                ticket=ticket,
                status=timeline_status,
                employee=assigned_employee,
                user=assigned_user,
                start_at=start_at,
                end_at=end_at,
                duration_minutes=duration_minutes,
                note=f"Xử lý ticket ở trạng thái {timeline_status.status_name}.",
                created_at=start_at,
            )

            if item_index == 0:
                continue

            previous_status = timeline[item_index - 1][0]
            action_type = "UPDATE_STATUS"

            if self._status_stage(timeline_status) == "closed":
                action_type = "CLOSE"
            elif self._status_stage(timeline_status) == "cancelled":
                action_type = "CANCEL"

            TicketUpdateLog.objects.create(
                ticket=ticket,
                action_type=action_type,
                from_status=previous_status,
                to_status=timeline_status,
                from_unit=unit,
                to_unit=unit,
                from_branch=branch,
                to_branch=branch,
                from_employee=assigned_employee,
                to_employee=assigned_employee,
                old_priority=priority,
                new_priority=priority,
                old_sla_policy=sla_policy,
                new_sla_policy=sla_policy,
                handling_solution=ticket.handling_solution,
                send_survey=(
                    self._status_stage(timeline_status) == "closed"
                    and rng.random() < 0.7
                ),
                note=f"Chuyển trạng thái sang {timeline_status.status_name}.",
                created_by_user=(
                    supervisor_user or assigned_user
                    if action_type in {"CLOSE", "CANCEL"}
                    else assigned_user
                ),
                created_at=start_at,
            )

            TicketActivityLog.objects.create(
                ticket=ticket,
                action_type=action_type,
                action_name=f"Cập nhật trạng thái: {timeline_status.status_name}",
                old_value=previous_status.status_code,
                new_value=timeline_status.status_code,
                created_by_user=assigned_user,
                created_at=start_at,
                note="Dữ liệu lịch sử trạng thái được tạo bởi seed.",
            )

        comment_count = 1 if rng.random() < 0.65 else 2

        for comment_index in range(comment_count):
            comment_at = self._advance(
                timeline_times["assigned"],
                rng.randint(10, 600) + comment_index,
                timeline_times.get("updated") or timeline_times["assigned"],
            )
            TicketComment.objects.create(
                ticket=ticket,
                comment_content=rng.choice(COMMENT_OPTIONS),
                is_internal=rng.random() < 0.82,
                created_by_user=assigned_user,
                created_at=comment_at,
            )

        stage = self._status_stage(status)

        if stage in {"done", "pending_close", "closed"}:
            response_at = (
                timeline_times.get("done")
                or timeline_times.get("updated")
                or timeline_times["assigned"]
            )
            TicketResponse.objects.create(
                ticket=ticket,
                response_content=(
                    ticket.final_response
                    or rng.choice(scenario["responses"])
                ),
                response_content_html=None,
                responded_by_user=assigned_user,
                responded_at=response_at,
                created_at=response_at,
            )

        if rng.random() < 0.24:
            uploaded_at = self._advance(
                timeline_times["assigned"],
                rng.randint(5, 180),
                timeline_times.get("updated") or timeline_times["assigned"],
            )
            extension = rng.choice(["png", "jpg", "pdf"])
            TicketAttachment.objects.create(
                ticket=ticket,
                file_name=f"ticket_{ticket.ticket_code.lower()}.{extension}",
                file_url=(
                    f"https://example.invalid/seed-attachments/"
                    f"{ticket.ticket_code.lower()}.{extension}"
                ),
                file_type=(
                    "application/pdf"
                    if extension == "pdf"
                    else f"image/{'jpeg' if extension == 'jpg' else 'png'}"
                ),
                file_size=rng.randint(25_000, 1_800_000),
                uploaded_by_user=created_by_user,
                uploaded_at=uploaded_at,
            )

        if stage == "closed" and rng.random() < 0.68:
            sent_at = timeline_times.get("closed")
            responded = rng.random() < 0.78
            responded_at = (
                self._advance(
                    sent_at,
                    rng.randint(30, 1440),
                    self._execution_cap(sent_at.date()),
                )
                if responded and sent_at
                else None
            )
            rating_score = rng.choices(
                [1, 2, 3, 4, 5],
                weights=[2, 4, 14, 36, 44],
                k=1,
            )[0] if responded else None

            feedback = TicketFeedback.objects.create(
                ticket=ticket,
                customer=customer,
                survey_sent=True,
                survey_status="RESPONDED" if responded else "SENT",
                rating_score=rating_score,
                rating_note=(
                    rng.choice(
                        [
                            "Hỗ trợ nhanh và rõ ràng.",
                            "Khách hàng hài lòng với kết quả xử lý.",
                            "Cần cập nhật tiến độ thường xuyên hơn.",
                            "Thông tin phản hồi đầy đủ.",
                        ]
                    )
                    if responded
                    else None
                ),
                sent_at=sent_at,
                responded_at=responded_at,
            )
            self._set_timestamp_fields(
                model=TicketFeedback,
                object_id=feedback.pk,
                created_at=sent_at or timeline_times["created"],
                updated_at=responded_at or sent_at or timeline_times["created"],
            )

        if tags and rng.random() < 0.35:
            selected_tags = rng.sample(
                tags,
                k=min(len(tags), rng.randint(1, 2)),
            )
            for tag in selected_tags:
                TicketTag.objects.get_or_create(
                    ticket=ticket,
                    tag=tag,
                    defaults={
                        "created_by_user": assigned_user,
                        "created_at": timeline_times["assigned"],
                    },
                )

        follower_candidates = [
            user
            for user in all_users
            if user.pk != assigned_user.pk
        ]
        if follower_candidates and rng.random() < 0.32:
            follower = rng.choice(follower_candidates)
            TicketFollower.objects.get_or_create(
                ticket=ticket,
                user=follower,
                defaults={
                    "followed_at": timeline_times["assigned"],
                },
            )

    def _set_timestamp_fields(
        self,
        *,
        model,
        object_id: int,
        created_at: datetime,
        updated_at: datetime,
    ) -> None:
        field_names = {
            field.name
            for field in model._meta.get_fields()
        }
        updates = {}

        if "created_at" in field_names:
            updates["created_at"] = created_at
        if "updated_at" in field_names:
            updates["updated_at"] = updated_at

        if updates:
            model.objects.filter(pk=object_id).update(**updates)