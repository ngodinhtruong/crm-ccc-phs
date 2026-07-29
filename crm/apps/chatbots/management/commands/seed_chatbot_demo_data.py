"""
Cách chạy:
    python manage.py seed_chatbot_demo_data
    python manage.py seed_chatbot_demo_data --count 120 --months 12
    python manage.py seed_chatbot_demo_data --reset
    python manage.py seed_chatbot_demo_data --reset --count 120 --months 12

Ý nghĩa:
- --count: số phiên CCC, khách hàng và ticket chatbot cần tạo.
- --extra-sessions: số phiên không tạo ticket (BOT_DONE/PENDING/SPAM).
- --months: phân bổ ticket trong N tháng gần nhất, tính cả tháng hiện tại.
- --seed: seed cho random để dữ liệu sinh ra lặp lại ổn định.
- --branch-code: chi nhánh dùng cho customer và ticket demo.
- --reset: xóa dữ liệu demo cũ trước khi tạo lại.

Command đi qua đúng luồng nghiệp vụ hiện tại:
    ChatbotChatLog/ChatbotState/ChatbotCskhRequest
        -> rebuild_chatbot_session_summaries()
        -> ChatbotSessionSummary
        -> build_chatbot_ticket_kwargs() + TicketService.create_ticket()
        -> Ticket

Dữ liệu thật không bị xóa. --reset chỉ xóa bản ghi có tiền tố DEMO-CHATBOT-.
"""

from __future__ import annotations

import random
from calendar import monthrange
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.branches.models import Branch
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)
from apps.chatbots.services import (
    build_chatbot_ticket_kwargs,
    rebuild_chatbot_session_summaries,
)
from apps.common.constants import (
    ClassificationMethod,
    TicketActionType,
    TicketStatusCode,
)
from apps.customers.models import (
    Customer,
    CustomerAccount,
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)
from apps.tickets.models import (
    Ticket,
    TicketActivityLog,
    TicketClassification,
    TicketPriority,
    TicketProcessLog,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)
from apps.tickets.services import TicketService


DEMO_PREFIX = "DEMO-CHATBOT-"
CUSTOMER_PREFIX = "DEMO-CHATBOT-CUST-"
EXTERNAL_PREFIX = "DEMO-CHATBOT-EXT-"
DEMO_SOURCE_SYSTEM = "CHATBOT_DEMO"

CHANNELS = ["xpro", "zalo", "facebook", "web", "app", "chatbot"]

STATUS_DEFINITIONS = [
    (TicketStatusCode.CREATED, "Mở", 1, False),
    (TicketStatusCode.ACCEPTED, "Tiếp nhận", 2, False),
    (TicketStatusCode.PROCESSING, "Đang xử lý", 3, False),
    (TicketStatusCode.DONE_WAIT_CLOSE, "Đã xong (chờ đóng)", 4, False),
    (TicketStatusCode.CLOSED, "Đã đóng", 5, True),
    (TicketStatusCode.CANCELLED, "Đã hủy", 6, True),
]

TICKET_SOURCES = [
    ("CHATBOT", "Chatbot"),
    ("XPRO", "XPro"),
    ("ZALO", "Zalo"),
    ("FACEBOOK", "Facebook"),
    ("WEB", "Website"),
    ("APP", "Ứng dụng"),
]

SCENARIOS = [
    {
        "category": "Ứng dụng chứng khoán",
        "support_code": "UNG_DUNG_CHUNG_KHOAN",
        "support_name": "Ứng dụng chứng khoán",
        "classification_code": "UDCK_DANG_NHAP",
        "classification_name": "Lỗi đăng nhập",
        "title": "Không đăng nhập được ứng dụng",
        "reason": "Khách hàng không đăng nhập được ứng dụng và cần CCC hỗ trợ.",
        "questions": [
            "Tôi không đăng nhập được ứng dụng.",
            "Ứng dụng báo tài khoản hoặc mật khẩu không đúng.",
            "Tôi đã thử đổi mật khẩu nhưng vẫn chưa vào được.",
        ],
        "answers": [
            "Anh/chị vui lòng kiểm tra kết nối mạng và phiên bản ứng dụng.",
            "Anh/chị thử đặt lại mật khẩu và đăng nhập lại giúp em.",
            "Em chưa thể xử lý hoàn toàn. Anh/chị vui lòng để lại thông tin để CCC hỗ trợ.",
        ],
        "solution": "Kiểm tra trạng thái tài khoản, mở khóa và hướng dẫn khách hàng đặt lại mật khẩu.",
        "response": "Khách hàng đã đăng nhập lại ứng dụng thành công.",
        "related_system": "APP",
    },
    {
        "category": "Giao dịch chứng khoán",
        "support_code": "GIAO_DICH_CHUNG_KHOAN",
        "support_name": "Giao dịch CK",
        "classification_code": "GDCK_DAT_LENH",
        "classification_name": "Đặt lệnh",
        "title": "Lệnh giao dịch chưa cập nhật",
        "reason": "Khách hàng cần tra soát trạng thái lệnh giao dịch.",
        "questions": [
            "Tôi đặt lệnh rồi nhưng chưa thấy trạng thái.",
            "Sức mua đã thay đổi nhưng danh sách lệnh không cập nhật.",
            "Nhờ kiểm tra giúp lệnh của tôi.",
        ],
        "answers": [
            "Anh/chị vui lòng tải lại danh sách lệnh.",
            "Trạng thái có thể đang chờ đồng bộ từ hệ thống giao dịch.",
            "Em xin thông tin liên hệ để CCC tra soát chi tiết.",
        ],
        "solution": "Đối chiếu lịch sử lệnh trên FLEX và kiểm tra trạng thái trả về.",
        "response": "Trạng thái lệnh đã được cập nhật và phản hồi cho khách hàng.",
        "related_system": "FLEX",
    },
    {
        "category": "Nạp tiền",
        "support_code": "NAP_TIEN",
        "support_name": "Nạp tiền",
        "classification_code": "NAP_TIEN_CHUA_GHI_NHAN",
        "classification_name": "Nạp tiền chưa được ghi nhận",
        "title": "Nạp tiền chưa ghi nhận",
        "reason": "Khách hàng đã chuyển tiền nhưng tài khoản chưa ghi nhận số dư.",
        "questions": [
            "Tôi chuyển tiền rồi nhưng chưa thấy số dư.",
            "Ngân hàng đã trừ tiền khoảng 20 phút trước.",
            "Tôi cần tra soát giao dịch nạp tiền.",
        ],
        "answers": [
            "Anh/chị kiểm tra giúp nội dung chuyển khoản đã đúng chưa.",
            "Một số giao dịch cần thêm thời gian để hạch toán.",
            "Anh/chị vui lòng để lại thông tin để CCC kiểm tra.",
        ],
        "solution": "Đối chiếu sao kê và trạng thái hạch toán giao dịch nạp tiền.",
        "response": "Khoản tiền đã được ghi nhận vào tài khoản khách hàng.",
        "related_system": "FLEX",
    },
    {
        "category": "Rút tiền",
        "support_code": "RUT_TIEN",
        "support_name": "Rút tiền",
        "classification_code": "RUT_TIEN_CHUA_NHAN",
        "classification_name": "Rút tiền chưa nhận được",
        "title": "Yêu cầu rút tiền đang chờ xử lý",
        "reason": "Khách hàng chưa nhận được tiền sau khi tạo yêu cầu rút.",
        "questions": [
            "Yêu cầu rút tiền của tôi vẫn đang xử lý.",
            "Tôi tạo yêu cầu từ sáng nhưng chưa nhận được tiền.",
            "Nhờ CCC kiểm tra trạng thái giúp tôi.",
        ],
        "answers": [
            "Anh/chị vui lòng kiểm tra thời gian tạo yêu cầu.",
            "Yêu cầu có thể đang chờ bước duyệt hoặc hạch toán.",
            "Em xin thông tin liên hệ để chuyển CCC kiểm tra.",
        ],
        "solution": "Kiểm tra trạng thái yêu cầu rút tiền và phối hợp bộ phận kế toán.",
        "response": "Giao dịch rút tiền đã hoàn tất.",
        "related_system": "FLEX",
    },
    {
        "category": "Tài khoản khách hàng",
        "support_code": "TAI_KHOAN_KHACH_HANG",
        "support_name": "Tài khoản khách hàng",
        "classification_code": "TKKH_CAP_NHAT",
        "classification_name": "Cập nhật thông tin tài khoản",
        "title": "Cập nhật thông tin tài khoản",
        "reason": "Khách hàng cần cập nhật số điện thoại hoặc thông tin cá nhân.",
        "questions": [
            "Tôi muốn cập nhật số điện thoại tài khoản.",
            "Số cũ của tôi hiện không còn sử dụng.",
            "Tôi cần hỗ trợ quy trình thay đổi thông tin.",
        ],
        "answers": [
            "Anh/chị cần chuẩn bị giấy tờ định danh còn hiệu lực.",
            "Việc thay đổi thông tin cần được xác minh theo quy định.",
            "Em xin thông tin để CCC hướng dẫn chi tiết.",
        ],
        "solution": "Xác minh khách hàng và hướng dẫn bổ sung hồ sơ cập nhật thông tin.",
        "response": "Thông tin tài khoản đã được cập nhật thành công.",
        "related_system": "CRM",
    },
    {
        "category": "Định danh",
        "support_code": "DINH_DANH",
        "support_name": "Định danh",
        "classification_code": "DINH_DANH_EKYC",
        "classification_name": "Định danh eKYC",
        "title": "eKYC không nhận diện giấy tờ",
        "reason": "Khách hàng không hoàn tất được bước xác thực eKYC.",
        "questions": [
            "Tôi chụp CCCD nhưng ứng dụng không nhận diện.",
            "Tôi đã thử nhiều lần vẫn báo ảnh không hợp lệ.",
            "Nhờ hỗ trợ kiểm tra hồ sơ eKYC.",
        ],
        "answers": [
            "Anh/chị vui lòng chụp giấy tờ tại nơi đủ sáng.",
            "Ảnh cần rõ bốn góc và không bị lóa.",
            "Em xin thông tin để CCC kiểm tra trạng thái hồ sơ.",
        ],
        "solution": "Kiểm tra trạng thái eKYC và hướng dẫn khách hàng chụp lại giấy tờ.",
        "response": "Khách hàng đã hoàn tất xác thực eKYC.",
        "related_system": "APP",
    },
]

CUSTOMER_NAMES = [
    "Nguyễn Minh Anh",
    "Trần Thu Hà",
    "Lê Hoàng Nam",
    "Phạm Ngọc Lan",
    "Võ Thanh Bình",
    "Đặng Hải Yến",
    "Bùi Anh Khoa",
    "Đỗ Khánh Linh",
    "Huỳnh Gia Bảo",
    "Phan Mỹ Trang",
    "Nguyễn Đức Anh",
    "Trần Quỳnh Như",
    "Lê Quốc Bảo",
    "Phạm Thảo Nguyên",
    "Võ Minh Khang",
    "Đặng Ngọc Mai",
    "Bùi Tuấn Kiệt",
    "Đỗ Thanh Trúc",
    "Huỳnh Nhật Minh",
    "Phan Kim Chi",
    "Nguyễn Thành Đạt",
    "Trần Bích Ngọc",
    "Lê Anh Tuấn",
    "Phạm Khánh Vy",
    "Võ Quốc Huy",
    "Đặng Minh Thư",
    "Bùi Gia Hưng",
    "Đỗ Ngọc Hân",
    "Huỳnh Thanh Tùng",
    "Phan Diệu Linh",
    "Nguyễn Quang Vinh",
    "Trần Mỹ Duyên",
    "Lê Minh Triết",
    "Phạm Ngọc Ánh",
    "Võ Đức Thịnh",
    "Đặng Thu Hương",
    "Bùi Hoàng Phúc",
    "Đỗ Khánh An",
    "Huỳnh Gia Hân",
    "Phan Thanh Thảo",
    "Nguyễn Hải Đăng",
    "Trần Ngọc Diệp",
    "Lê Quốc Trung",
    "Phạm Minh Châu",
    "Võ Anh Dũng",
    "Đặng Bảo Ngọc",
    "Bùi Thanh Sơn",
    "Đỗ Thùy Dương",
    "Huỳnh Minh Quân",
    "Phan Ngọc Trâm",
    "Nguyễn Tuấn Anh",
    "Trần Khánh Hòa",
    "Lê Gia Khánh",
    "Phạm Thu Trang",
    "Võ Hoàng Long",
    "Đặng Minh Nguyệt",
    "Bùi Quốc Cường",
    "Đỗ Ngọc Phương",
    "Huỳnh Anh Thư",
    "Phan Thành Công",
]


PROVINCES = [
    "TP. Hồ Chí Minh",
    "Hà Nội",
    "Đà Nẵng",
    "Quảng Ngãi",
    "Bình Dương",
    "Đồng Nai",
]


class Command(BaseCommand):
    help = "Sinh dữ liệu demo chatbot, khách hàng và ticket CRM liên kết tự động."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=60,
            help="Số customer + phiên CCC + ticket chatbot cần tạo (mặc định: 60).",
        )
        parser.add_argument(
            "--extra-sessions",
            type=int,
            default=18,
            help="Số phiên BOT_DONE/PENDING/SPAM bổ sung (mặc định: 18).",
        )
        parser.add_argument(
            "--months",
            type=int,
            default=6,
            help="Phân bổ dữ liệu trong N tháng gần nhất (mặc định: 6).",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260723,
            help="Random seed để dữ liệu ổn định giữa các lần chạy.",
        )
        parser.add_argument(
            "--branch-code",
            default="HS_Q7",
            help="Mã chi nhánh dùng cho dữ liệu demo.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa dữ liệu demo cũ trước khi tạo lại.",
        )

    def handle(self, *args, **options):
        count = options["count"]
        extra_sessions = options["extra_sessions"]
        months = options["months"]
        seed = options["seed"]
        branch_code = str(options["branch_code"] or "HS_Q7").strip()

        if count < 0:
            raise CommandError("--count phải lớn hơn hoặc bằng 0.")
        if extra_sessions < 0:
            raise CommandError("--extra-sessions phải lớn hơn hoặc bằng 0.")
        if not 1 <= months <= 60:
            raise CommandError("--months phải nằm trong khoảng 1 đến 60.")
        if not branch_code:
            raise CommandError("--branch-code không được để trống.")

        random.seed(seed)

        if options["reset"]:
            self._reset_demo_data()

        with transaction.atomic():
            master = self._ensure_master_data(branch_code)
            customer_count, ticket_count = self._seed_ccc_sessions(
                count=count,
                months=months,
                master=master,
            )
            extra_count = self._seed_extra_sessions(
                count=extra_sessions,
                months=months,
            )

        self.stdout.write(self.style.SUCCESS("Seed chatbot demo hoàn tất."))
        self.stdout.write(f"  Khách hàng demo: {customer_count}")
        self.stdout.write(f"  Ticket chatbot: {ticket_count}")
        self.stdout.write(f"  Phiên không tạo ticket: {extra_count}")
        self.stdout.write(
            "  Mở dashboard: http://localhost:3000/chatbots/dashboard"
        )

    def _reset_demo_data(self):
        summaries = ChatbotSessionSummary.objects.filter(
            session_id__startswith=DEMO_PREFIX
        )
        ticket_ids = list(
            summaries.exclude(ticket_id__isnull=True).values_list("ticket_id", flat=True)
        )

        # Xóa summary trước để gỡ liên kết mềm tới ticket.
        summary_deleted = summaries.delete()[0]
        request_deleted = ChatbotCskhRequest.objects.filter(
            session_id__startswith=DEMO_PREFIX
        ).delete()[0]
        state_deleted = ChatbotState.objects.filter(
            session_id__startswith=DEMO_PREFIX
        ).delete()[0]
        log_deleted = ChatbotChatLog.objects.filter(
            session_id__startswith=DEMO_PREFIX
        ).delete()[0]

        tickets = Ticket.objects.filter(source_ref_id__startswith=DEMO_PREFIX)
        if ticket_ids:
            tickets = tickets | Ticket.objects.filter(id__in=ticket_ids)
        ticket_deleted = tickets.distinct().delete()[0]

        account_deleted = CustomerAccount.objects.filter(
            source_system=DEMO_SOURCE_SYSTEM
        ).delete()[0]
        customer_deleted = Customer.objects.filter(
            customer_code__startswith=CUSTOMER_PREFIX
        ).delete()[0]

        self.stdout.write(
            self.style.WARNING(
                "Đã xóa dữ liệu demo cũ: "
                f"summary={summary_deleted}, request={request_deleted}, "
                f"state={state_deleted}, log={log_deleted}, "
                f"ticket={ticket_deleted}, account={account_deleted}, "
                f"customer={customer_deleted}."
            )
        )

    def _ensure_master_data(self, branch_code):
        now = timezone.now()

        branch = Branch.objects.filter(branch_code=branch_code).first()
        if not branch:
            branch = Branch.objects.filter(status="ACTIVE").first()
        if not branch:
            branch, _ = Branch.objects.get_or_create(
                branch_code="HS_Q7",
                defaults={
                    "branch_name": "Hội sở Quận 7",
                    "address": "Quận 7, TP.HCM",
                    "status": "ACTIVE",
                    "updated_at": now,
                },
            )

        customer_type, _ = CustomerType.objects.update_or_create(
            type_code="INDIVIDUAL",
            defaults={"type_name": "Khách hàng cá nhân", "is_active": True},
        )
        customer_source, _ = CustomerSource.objects.update_or_create(
            source_code="CHATBOT",
            defaults={"source_name": "Chatbot", "is_active": True},
        )
        rating, _ = CustomerRating.objects.update_or_create(
            rating_code="STANDARD",
            defaults={
                "rating_name": "Tiêu chuẩn",
                "score": 3,
                "is_active": True,
            },
        )
        membership_tier, _ = MembershipTier.objects.update_or_create(
            tier_code="BASIC",
            defaults={
                "tier_name": "Cơ bản",
                "description": "Hạng thành viên dùng cho dữ liệu demo chatbot.",
                "is_active": True,
            },
        )

        statuses = {}
        for code, name, sort_order, is_final in STATUS_DEFINITIONS:
            statuses[code], _ = TicketStatus.objects.update_or_create(
                status_code=code,
                defaults={
                    "status_name": name,
                    "sort_order": sort_order,
                    "is_final": is_final,
                    "is_active": True,
                },
            )

        for code, name in TICKET_SOURCES:
            TicketSource.objects.update_or_create(
                source_code=code,
                defaults={"source_name": name, "is_active": True},
            )

        priority, _ = TicketPriority.objects.update_or_create(
            priority_code="NORMAL",
            defaults={
                "priority_name": "Bình thường",
                "level_order": 2,
                "default_sla_minutes": 480,
                "is_active": True,
                "updated_at": now,
            },
        )
        if priority.created_at is None:
            priority.created_at = now
            priority.save(update_fields=["created_at"])

        scenario_masters = {}
        for index, scenario in enumerate(SCENARIOS, start=1):
            category, _ = TicketSupportCategory.objects.update_or_create(
                category_code=scenario["support_code"],
                defaults={
                    "category_name": scenario["support_name"],
                    "is_active": True,
                    "sort_order": index,
                    "updated_at": now,
                },
            )
            if category.created_at is None:
                category.created_at = now
                category.save(update_fields=["created_at"])

            classification, _ = TicketClassification.objects.update_or_create(
                classification_code=scenario["classification_code"],
                defaults={
                    "classification_name": scenario["classification_name"],
                    "support_category": category,
                    "is_active": True,
                    "sort_order": 1,
                    "updated_at": now,
                },
            )
            if classification.created_at is None:
                classification.created_at = now
                classification.save(update_fields=["created_at"])

            scenario_masters[scenario["classification_code"]] = (
                category,
                classification,
            )

        return {
            "branch": branch,
            "customer_type": customer_type,
            "customer_source": customer_source,
            "rating": rating,
            "membership_tier": membership_tier,
            "statuses": statuses,
            "priority": priority,
            "scenario_masters": scenario_masters,
        }

    def _seed_ccc_sessions(self, *, count, months, master):
        customer_count = 0
        ticket_count = 0

        for index in range(1, count + 1):
            scenario = SCENARIOS[(index - 1) % len(SCENARIOS)]
            channel = CHANNELS[(index - 1) % len(CHANNELS)]
            session_id = f"{DEMO_PREFIX}CCC-{index:05d}"
            session_started_at = self._fake_datetime(index=index, months=months)

            customer, account, contact_type, contact_info = self._upsert_customer(
                index=index,
                branch=master["branch"],
                customer_type=master["customer_type"],
                customer_source=master["customer_source"],
                rating=master["rating"],
                membership_tier=master["membership_tier"],
                created_at=session_started_at - timedelta(days=random.randint(5, 500)),
            )
            customer_count += 1

            self._upsert_real_chat_logs(
                session_id=session_id,
                user_id=customer.customer_code,
                channel=channel,
                scenario=scenario,
                started_at=session_started_at,
            )

            request_at = session_started_at + timedelta(minutes=8)
            ChatbotState.objects.update_or_create(
                external_id=f"{EXTERNAL_PREFIX}STATE-{index:05d}",
                defaults={
                    "session_id": session_id,
                    "user_id": customer.customer_code,
                    "channel": channel,
                    "step": "waiting_info",
                    "reason": scenario["reason"],
                    "external_created_at": session_started_at + timedelta(minutes=6),
                    "raw_payload": {
                        "demo": True,
                        "step": "waiting_info",
                        "source": "seed_chatbot_demo_data",
                    },
                    "created_at": session_started_at + timedelta(minutes=6),
                    "updated_at": session_started_at + timedelta(minutes=6),
                },
            )
            ChatbotCskhRequest.objects.update_or_create(
                external_id=f"{EXTERNAL_PREFIX}REQUEST-{index:05d}",
                defaults={
                    "session_id": session_id,
                    "user_id": customer.customer_code,
                    "channel": channel,
                    "contact_info": contact_info,
                    "contact_type": contact_type,
                    "reason": scenario["reason"],
                    "status": "collected",
                    "external_created_at": request_at,
                    "raw_payload": {
                        "demo": True,
                        "contact_type": contact_type,
                        "source": "seed_chatbot_demo_data",
                    },
                    "created_at": request_at,
                    "updated_at": request_at,
                },
            )

            rebuild_chatbot_session_summaries([session_id])
            summary = ChatbotSessionSummary.objects.get(session_id=session_id)
            summary.created_at = session_started_at
            summary.updated_at = request_at
            summary.save(update_fields=["created_at", "updated_at"])

            ticket, created = self._create_or_update_ticket(
                summary=summary,
                customer=customer,
                account=account,
                scenario=scenario,
                master=master,
                created_at=request_at + timedelta(minutes=2),
                index=index,
            )
            if created:
                ticket_count += 1

            if summary.ticket_id != ticket.id:
                summary.ticket = ticket
                summary.save(update_fields=["ticket"])

        return customer_count, ticket_count

    def _seed_extra_sessions(self, *, count, months):
        for index in range(1, count + 1):
            scenario = SCENARIOS[(index - 1) % len(SCENARIOS)]
            kind = ("BOT_DONE", "PENDING", "SPAM")[(index - 1) % 3]
            session_id = f"{DEMO_PREFIX}{kind}-{index:05d}"
            started_at = self._fake_datetime(index=10000 + index, months=months)
            user_id = f"DEMO-VISITOR-{index:05d}"
            channel = CHANNELS[index % len(CHANNELS)]

            if kind == "SPAM":
                rows = [
                    ("Xin chào", "Xin chào anh/chị. Em có thể hỗ trợ gì ạ?", "GREETING"),
                    ("Hôm nay thời tiết thế nào?", "Nội dung này chưa thuộc phạm vi hỗ trợ.", "UNRELATED"),
                ]
                for message_index, (question, answer, question_type) in enumerate(
                    rows, start=1
                ):
                    message_at = started_at + timedelta(minutes=message_index * 2)
                    ChatbotChatLog.objects.update_or_create(
                        external_id=(
                            f"{EXTERNAL_PREFIX}{kind}-LOG-{index:05d}-{message_index:02d}"
                        ),
                        defaults={
                            "session_id": session_id,
                            "user_id": user_id,
                            "channel": channel,
                            "question": question,
                            "answer": answer,
                            "questionType": question_type,
                            "category": "",
                            "external_created_at": message_at,
                            "raw_payload": {"demo": True, "kind": kind},
                            "created_at": message_at,
                            "updated_at": message_at,
                        },
                    )
            else:
                self._upsert_real_chat_logs(
                    session_id=session_id,
                    user_id=user_id,
                    channel=channel,
                    scenario=scenario,
                    started_at=started_at,
                    external_group=kind,
                )

                if kind == "PENDING":
                    state_at = started_at + timedelta(minutes=8)
                    ChatbotState.objects.update_or_create(
                        external_id=f"{EXTERNAL_PREFIX}{kind}-STATE-{index:05d}",
                        defaults={
                            "session_id": session_id,
                            "user_id": user_id,
                            "channel": channel,
                            "step": "waiting_info",
                            "reason": scenario["reason"],
                            "external_created_at": state_at,
                            "raw_payload": {"demo": True, "kind": kind},
                            "created_at": state_at,
                            "updated_at": state_at,
                        },
                    )

            rebuild_chatbot_session_summaries([session_id])
            ChatbotSessionSummary.objects.filter(session_id=session_id).update(
                created_at=started_at,
                updated_at=started_at + timedelta(minutes=10),
            )

        return count

    def _upsert_customer(
        self,
        *,
        index,
        branch,
        customer_type,
        customer_source,
        rating,
        membership_tier,
        created_at,
    ):
        customer_code = f"{CUSTOMER_PREFIX}{index:05d}"
        phone = f"09{(10000000 + index):08d}"[-10:]
        email = f"chatbot.demo.{index:05d}@example.com"
        # Có tiền tố CB để không đụng số tài khoản thật trong môi trường dev.
        account_number = f"CB{index:08d}"[-10:]
        # 60 khách hàng mặc định sử dụng 60 họ tên hoàn toàn khác nhau.
        # Khi --count lớn hơn 60, thêm hậu tố số để vẫn bảo đảm không trùng tên.
        base_name = CUSTOMER_NAMES[(index - 1) % len(CUSTOMER_NAMES)]
        name_round = (index - 1) // len(CUSTOMER_NAMES)
        full_name = base_name if name_round == 0 else f"{base_name} {name_round + 1}"

        customer, _ = Customer.objects.update_or_create(
            customer_code=customer_code,
            defaults={
                "external_customer_id": f"CHATBOT-DEMO-{index:05d}",
                "customer_type": customer_type,
                "salutation": "Anh/Chị",
                "full_name": full_name,
                "identity_number": f"0792{index:08d}"[-12:],
                "date_of_birth": datetime(
                    1980 + (index % 25),
                    ((index - 1) % 12) + 1,
                    ((index - 1) % 28) + 1,
                ).date(),
                "gender": "MALE" if index % 2 else "FEMALE",
                "phone": phone,
                "email": email,
                "branch": branch,
                "source": customer_source,
                "rating": rating,
                "membership_tier": membership_tier,
                "address": f"Số {index}, đường Demo Chatbot",
                "country": "Việt Nam",
                "province": PROVINCES[(index - 1) % len(PROVINCES)],
                "district": f"Quận/Huyện {(index % 12) + 1}",
                "ward": f"Phường/Xã {(index % 20) + 1}",
                "description": "Khách hàng giả lập được tạo từ seed chatbot.",
                "status": "ACTIVE",
                "created_at": created_at,
                "updated_at": created_at,
            },
        )

        account, _ = CustomerAccount.objects.update_or_create(
            account_number=account_number,
            defaults={
                "customer": customer,
                "opened_at": created_at.date(),
                "account_status": "ACTIVE",
                "source_system": DEMO_SOURCE_SYSTEM,
                "created_at": created_at,
                "updated_at": created_at,
            },
        )

        # Luân phiên loại thông tin để kiểm thử cả 3 nhánh tra customer.
        contact_mode = (index - 1) % 3
        if contact_mode == 0:
            return customer, account, "PHONE", phone
        if contact_mode == 1:
            return customer, account, "EMAIL", email
        return customer, account, "ACCOUNT", account_number

    def _upsert_real_chat_logs(
        self,
        *,
        session_id,
        user_id,
        channel,
        scenario,
        started_at,
        external_group="CCC",
    ):
        for message_index, (question, answer) in enumerate(
            zip(scenario["questions"], scenario["answers"]), start=1
        ):
            message_at = started_at + timedelta(minutes=message_index * 2)
            ChatbotChatLog.objects.update_or_create(
                external_id=(
                    f"{EXTERNAL_PREFIX}{external_group}-LOG-"
                    f"{session_id.split('-')[-1]}-{message_index:02d}"
                ),
                defaults={
                    "session_id": session_id,
                    "user_id": user_id,
                    "channel": channel,
                    "question": question,
                    "answer": answer,
                    "questionType": "QUESTION",
                    "category": scenario["category"],
                    "external_created_at": message_at,
                    "raw_payload": {
                        "demo": True,
                        "category": scenario["category"],
                        "source": "seed_chatbot_demo_data",
                    },
                    "created_at": message_at,
                    "updated_at": message_at,
                },
            )

    def _create_or_update_ticket(
        self,
        *,
        summary,
        customer,
        account,
        scenario,
        master,
        created_at,
        index,
    ):
        existing = Ticket.objects.filter(
            source_ref_id=summary.session_id,
            classification_method=ClassificationMethod.AUTO,
        ).first()
        created = existing is None

        if existing is None:
            kwargs = build_chatbot_ticket_kwargs(
                summary=summary,
                default_branch=master["branch"],
                created_status=master["statuses"][TicketStatusCode.CREATED],
                policy=None,
            )
            ticket = TicketService.create_ticket(**kwargs)
        else:
            ticket = existing

        category, classification = master["scenario_masters"][
            scenario["classification_code"]
        ]

        status_code = self._status_code_for_index(index)
        status = master["statuses"][status_code]
        accepted_at = None
        processing_started_at = None
        done_at = None
        closed_at = None
        cancelled_at = None
        cancelled_reason = None
        handling_solution = None
        final_response = None

        if status_code in {
            TicketStatusCode.ACCEPTED,
            TicketStatusCode.PROCESSING,
            TicketStatusCode.DONE_WAIT_CLOSE,
            TicketStatusCode.CLOSED,
            TicketStatusCode.CANCELLED,
        }:
            accepted_at = created_at + timedelta(minutes=10 + index % 30)

        if status_code in {
            TicketStatusCode.PROCESSING,
            TicketStatusCode.DONE_WAIT_CLOSE,
            TicketStatusCode.CLOSED,
            TicketStatusCode.CANCELLED,
        }:
            processing_started_at = accepted_at + timedelta(minutes=5)

        if status_code in {
            TicketStatusCode.DONE_WAIT_CLOSE,
            TicketStatusCode.CLOSED,
        }:
            done_at = processing_started_at + timedelta(minutes=30 + index % 240)
            handling_solution = scenario["solution"]
            final_response = scenario["response"]

        if status_code == TicketStatusCode.CLOSED:
            closed_at = done_at + timedelta(minutes=60)

        if status_code == TicketStatusCode.CANCELLED:
            cancelled_at = processing_started_at + timedelta(minutes=20 + index % 60)
            cancelled_reason = (
                "Khách hàng xác nhận không còn nhu cầu hỗ trợ hoặc ticket bị trùng."
            )
            handling_solution = "Đã xác minh và thực hiện hủy ticket theo yêu cầu."
            final_response = "Ticket đã được hủy sau khi xác nhận với khách hàng."

        updated_at = (
            closed_at
            or done_at
            or cancelled_at
            or processing_started_at
            or accepted_at
            or created_at
        )

        Ticket.objects.filter(pk=ticket.pk).update(
            customer=customer,
            customer_account=account if summary.contact_type == "ACCOUNT" else None,
            support_category=category,
            classification=classification,
            current_status=status,
            priority=master["priority"],
            related_system=scenario["related_system"],
            title=scenario["title"],
            handling_solution=handling_solution,
            final_response=final_response,
            accepted_at=accepted_at,
            processing_started_at=processing_started_at,
            done_at=done_at,
            closed_at=closed_at,
            cancelled_at=cancelled_at,
            cancelled_reason=cancelled_reason,
            created_at=created_at,
            updated_at=updated_at,
        )
        ticket.refresh_from_db()

        # Giữ log tạo ticket ở trạng thái CREATED, sau đó thêm một log trạng thái
        # demo riêng để trang chi tiết có lịch sử hợp lý.
        created_status = master["statuses"][TicketStatusCode.CREATED]
        initial_log = TicketProcessLog.objects.filter(ticket=ticket).order_by("id").first()
        if initial_log is not None:
            initial_log.status = created_status
            initial_log.start_at = created_at
            initial_log.end_at = accepted_at if accepted_at else None
            initial_log.duration_minutes = (
                int((accepted_at - created_at).total_seconds() // 60)
                if accepted_at
                else None
            )
            initial_log.note = "Ticket chatbot được tạo tự động từ dữ liệu demo"
            initial_log.created_at = created_at
            initial_log.save(
                update_fields=[
                    "status",
                    "start_at",
                    "end_at",
                    "duration_minutes",
                    "note",
                    "created_at",
                ]
            )

        TicketProcessLog.objects.filter(
            ticket=ticket,
            note__startswith="Demo chuyển trạng thái chatbot:",
        ).delete()

        if status_code != TicketStatusCode.CREATED:
            status_started_at = (
                processing_started_at
                or accepted_at
                or created_at
            )
            status_finished_at = (
                closed_at
                or done_at
                or cancelled_at
                or None
            )
            TicketProcessLog.objects.create(
                ticket=ticket,
                status=status,
                employee=None,
                user=None,
                start_at=status_started_at,
                end_at=status_finished_at,
                duration_minutes=(
                    int((status_finished_at - status_started_at).total_seconds() // 60)
                    if status_finished_at
                    else None
                ),
                note=f"Demo chuyển trạng thái chatbot: {status.status_name}",
                created_at=status_started_at,
            )

        create_activity = TicketActivityLog.objects.filter(ticket=ticket).order_by("id").first()
        if create_activity is not None:
            create_activity.created_at = created_at
            create_activity.note = "Ticket chatbot được tạo tự động từ dữ liệu demo"
            create_activity.save(update_fields=["created_at", "note"])

        TicketActivityLog.objects.filter(
            ticket=ticket,
            note__startswith="Demo cập nhật trạng thái chatbot:",
        ).delete()

        if status_code != TicketStatusCode.CREATED:
            TicketActivityLog.objects.create(
                ticket=ticket,
                action_type=TicketActionType.UPDATE_STATUS,
                action_name="Cập nhật trạng thái ticket chatbot demo",
                old_value=TicketStatusCode.CREATED,
                new_value=status_code,
                created_by_user=None,
                created_at=updated_at,
                note=f"Demo cập nhật trạng thái chatbot: {status.status_name}",
            )

        return ticket, created

    @staticmethod
    def _status_code_for_index(index):
        # Phân bố có chủ đích để dashboard có đủ cột mở, xử lý, đóng và hủy.
        bucket = index % 10
        if bucket in {0, 1, 2}:
            return TicketStatusCode.CLOSED
        if bucket in {3, 4}:
            return TicketStatusCode.DONE_WAIT_CLOSE
        if bucket in {5, 6}:
            return TicketStatusCode.PROCESSING
        if bucket == 7:
            return TicketStatusCode.ACCEPTED
        if bucket == 8:
            return TicketStatusCode.CREATED
        return TicketStatusCode.CANCELLED

    @staticmethod
    def _fake_datetime(*, index, months):
        """Sinh datetime trong N tháng gần nhất, không tạo ngày ở tương lai."""
        now = timezone.localtime()
        month_offset = (index - 1) % months

        year = now.year
        month = now.month - month_offset
        while month <= 0:
            month += 12
            year -= 1

        max_day = monthrange(year, month)[1]
        if year == now.year and month == now.month:
            max_day = min(max_day, now.day)

        day = ((index * 7) % max_day) + 1
        hour = 8 + ((index * 3) % 12)
        minute = (index * 11) % 60

        naive = datetime(year, month, day, hour, minute, 0)
        return timezone.make_aware(naive, timezone.get_current_timezone())
