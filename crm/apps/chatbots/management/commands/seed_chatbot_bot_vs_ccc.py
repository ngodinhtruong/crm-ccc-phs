"""
Cách chạy:
    python manage.py seed_chatbot_bot_vs_ccc
    python manage.py seed_chatbot_bot_vs_ccc --months 6 --per-month 20
    python manage.py seed_chatbot_bot_vs_ccc --reset

Sinh dữ liệu khớp nhau cho đúng ba bảng nguồn, để kiểm tra biểu đồ
"Bot Tự xử lý vs Chuyển CCC theo Chủ đề":

    chatbot_chat_logs      (xpro_chat_logs) — câu hỏi, category, questionType
    chatbot_states         (cskh_state)     — chatbot bí, đang xin thông tin KH
    chatbot_cskh_requests  (cskh_request)   — đã lấy được liên hệ -> chuyển CCC

Vì sao cần command riêng thay vì dùng seed_chatbot_demo_data: bên đó mỗi chủ
đề chỉ rơi vào một vài tháng cố định và không tháng nào có đồng thời cả
BOT_DONE lẫn CCC trên cùng một chủ đề, nên biểu đồ so sánh luôn ra 0% hoặc
100% và không kiểm chứng được gì. Command này cố tình cho MỌI chủ đề đều có
cả hai phía trong MỌI tháng, mỗi chủ đề một tỷ lệ chuyển CCC mục tiêu khác
nhau, để đọc được cả phổ tỷ lệ trên biểu đồ.

Phiên bot tự xử lý ở đây là phiên hỏi FAQ: `questionType = CUSTOMER_CARE` và
có `category` — đúng loại câu hỏi chatbot trả lời được bằng kho tri thức, và
cũng là loại duy nhất vừa nằm trong bảng Top FAQ vừa có chủ đề để so sánh.

Mỗi chủ đề còn kèm vài phiên PENDING (chỉ có cskh_state, chưa có
cskh_request) để kiểm tra biểu đồ loại đúng nhóm này ra khỏi mẫu số.

Command đi qua đúng luồng nghiệp vụ:
    ChatbotChatLog/ChatbotState/ChatbotCskhRequest
        -> rebuild_chatbot_session_summaries()
        -> ChatbotSessionSummary (outcome_type, dashboard_category)

Dữ liệu thật không bị đụng tới. --reset chỉ xóa bản ghi có tiền tố
DEMO-BOTVSCCC-.
"""

from __future__ import annotations

import random
from calendar import monthrange
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)
from apps.chatbots.services import rebuild_chatbot_session_summaries


DEMO_PREFIX = "DEMO-BOTVSCCC-"
SOURCE_TAG = "seed_chatbot_bot_vs_ccc"

CHANNELS = ["xpro", "zalo", "facebook", "web", "app", "chatbot"]

# Câu hỏi FAQ mà chatbot trả lời được bằng kho tri thức. Đây là loại
# questionType duy nhất vừa được gán category vừa không bị tính là câu rác,
# nên phiên BOT_DONE phải dùng loại này thì mới có chủ đề để so sánh.
QUESTION_TYPE_FAQ = "CUSTOMER_CARE"

# Câu chào không được gán category và bị is_spam_question() bỏ qua khi chọn
# chủ đề phiên — thêm vào để dữ liệu giống hội thoại thật.
QUESTION_TYPE_GREETING = "GREETING"

GREETING_QUESTION = "Xin chào, cho mình hỏi chút."
GREETING_ANSWER = "Dạ em chào anh/chị, em có thể hỗ trợ gì cho mình ạ?"

CONTACT_TYPES = ["PHONE", "EMAIL", "ACCOUNT"]

# Mỗi chủ đề một tỷ lệ chuyển CCC mục tiêu khác nhau, trải từ 90% xuống 5%,
# để biểu đồ ra một dải liên tục thay vì chỉ có 0% và 100%. `code` chỉ dùng
# để dựng external_id/session_id cho ngắn và ổn định giữa các lần chạy.
TOPICS = [
    {
        "code": "T1",
        "category": "Định danh",
        "ccc_rate": 0.90,
        "reason": "Khách hàng không hoàn tất được bước xác thực eKYC.",
        "faq_question": "Định danh eKYC cần chuẩn bị giấy tờ gì?",
        "faq_answer": (
            "Anh/chị chuẩn bị CCCD gắn chip còn hạn, chụp đủ hai mặt trong "
            "khung và giữ máy cố định khi quét khuôn mặt ạ."
        ),
        "escalate_question": "Em chụp CCCD nhiều lần mà app vẫn báo định danh thất bại.",
        "escalate_answer": (
            "Trường hợp này em cần chuyển bộ phận hỗ trợ kiểm tra hồ sơ giúp "
            "mình. Anh/chị để lại thông tin liên hệ giúp em ạ."
        ),
    },
    {
        "code": "T2",
        "category": "Rút tiền",
        "ccc_rate": 0.75,
        "reason": "Khách hàng chưa nhận được tiền sau khi tạo yêu cầu rút.",
        "faq_question": "Lệnh rút tiền bao lâu thì về tài khoản?",
        "faq_answer": (
            "Lệnh rút trước 15h30 ngày làm việc sẽ về trong ngày, sau khung "
            "giờ này sẽ về vào ngày làm việc kế tiếp ạ."
        ),
        "escalate_question": "Em rút tiền từ hôm qua mà tới giờ chưa thấy tiền về.",
        "escalate_answer": (
            "Em cần tra soát lệnh rút với bộ phận nghiệp vụ. Anh/chị để lại "
            "thông tin liên hệ để bên em kiểm tra và phản hồi ạ."
        ),
    },
    {
        "code": "T3",
        "category": "Nạp tiền",
        "ccc_rate": 0.60,
        "reason": "Khách hàng đã chuyển tiền nhưng tài khoản chưa ghi nhận số dư.",
        "faq_question": "Nạp tiền vào tài khoản chứng khoán bằng cách nào?",
        "faq_answer": (
            "Anh/chị chuyển khoản tới tài khoản định danh của mình, nội dung "
            "ghi số tài khoản chứng khoán là hệ thống ghi nhận tự động ạ."
        ),
        "escalate_question": "Em chuyển khoản xong rồi mà số dư vẫn chưa tăng.",
        "escalate_answer": (
            "Em cần đối soát giao dịch với ngân hàng. Anh/chị để lại thông "
            "tin liên hệ giúp em ạ."
        ),
    },
    {
        "code": "T4",
        "category": "Giao dịch chứng khoán",
        "ccc_rate": 0.50,
        "reason": "Khách hàng cần tra soát trạng thái lệnh giao dịch.",
        "faq_question": "Thời gian khớp lệnh trong phiên ATC là khi nào?",
        "faq_answer": (
            "Phiên ATC diễn ra từ 14h30 đến 14h45, lệnh được khớp tại mức giá "
            "đóng cửa xác định cuối phiên ạ."
        ),
        "escalate_question": "Lệnh mua của em báo chờ khớp cả phiên mà không thấy kết quả.",
        "escalate_answer": (
            "Em cần tra soát trạng thái lệnh trên hệ thống. Anh/chị để lại "
            "thông tin liên hệ để bên em kiểm tra ạ."
        ),
    },
    {
        "code": "T5",
        "category": "Tài khoản khách hàng",
        "ccc_rate": 0.35,
        "reason": "Khách hàng cần cập nhật số điện thoại hoặc thông tin cá nhân.",
        "faq_question": "Muốn đổi số điện thoại nhận OTP thì làm thế nào?",
        "faq_answer": (
            "Anh/chị vào mục Tài khoản > Thông tin cá nhân để gửi yêu cầu đổi "
            "số, hệ thống sẽ xác thực bằng eKYC ạ."
        ),
        "escalate_question": "Em đổi số điện thoại nhưng hệ thống báo trùng với tài khoản khác.",
        "escalate_answer": (
            "Trường hợp trùng thông tin cần nhân viên xử lý thủ công. "
            "Anh/chị để lại thông tin liên hệ giúp em ạ."
        ),
    },
    {
        "code": "T6",
        "category": "Ứng dụng chứng khoán",
        "ccc_rate": 0.20,
        "reason": "Khách hàng không đăng nhập được ứng dụng và cần CCC hỗ trợ.",
        "faq_question": "Quên mật khẩu đăng nhập thì lấy lại bằng cách nào?",
        "faq_answer": (
            "Anh/chị bấm Quên mật khẩu ngay màn hình đăng nhập, hệ thống gửi "
            "mã xác thực về số điện thoại đã đăng ký ạ."
        ),
        "escalate_question": "Em nhập đúng mật khẩu mà app vẫn báo tài khoản bị khóa.",
        "escalate_answer": (
            "Tài khoản bị khóa cần bộ phận hỗ trợ mở lại. Anh/chị để lại "
            "thông tin liên hệ giúp em ạ."
        ),
    },
    {
        "code": "T7",
        "category": "Statement",
        "ccc_rate": 0.10,
        "reason": "Khách hàng cần trích xuất sao kê giao dịch theo kỳ.",
        "faq_question": "Lấy sao kê giao dịch của tháng trước ở đâu?",
        "faq_answer": (
            "Anh/chị vào mục Sao kê, chọn khoảng thời gian cần xem rồi bấm "
            "xuất file PDF hoặc Excel ạ."
        ),
        "escalate_question": "Em cần sao kê có đóng dấu của công ty để nộp ngân hàng.",
        "escalate_answer": (
            "Bản sao kê có dấu cần bộ phận nghiệp vụ phát hành. Anh/chị để "
            "lại thông tin liên hệ giúp em ạ."
        ),
    },
    {
        "code": "T8",
        "category": "PHS App/Web Platform",
        "ccc_rate": 0.05,
        "reason": "Khách hàng cần hỗ trợ thao tác trên nền tảng PHS App/Web.",
        "faq_question": "Trên web PHS xem danh mục đầu tư ở đâu?",
        "faq_answer": (
            "Anh/chị đăng nhập rồi vào mục Tài sản > Danh mục là thấy toàn bộ "
            "mã đang nắm giữ cùng lãi lỗ ạ."
        ),
        "escalate_question": "Web của bên mình load mãi không lên bảng giá, em thử nhiều máy rồi.",
        "escalate_answer": (
            "Em ghi nhận lỗi hiển thị để đội kỹ thuật kiểm tra. Anh/chị để "
            "lại thông tin liên hệ giúp em ạ."
        ),
    },
]

KIND_BOT = "BOT"
KIND_CCC = "CCC"
KIND_PENDING = "PEND"


class Command(BaseCommand):
    help = (
        "Sinh dữ liệu khớp nhau cho chat_logs / cskh_state / cskh_request "
        "để kiểm tra biểu đồ Bot tự xử lý vs Chuyển CCC theo chủ đề."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--months",
            type=int,
            default=6,
            help="Số tháng gần nhất cần sinh dữ liệu, tính cả tháng hiện tại.",
        )
        parser.add_argument(
            "--per-month",
            type=int,
            default=20,
            help="Số phiên BOT_DONE + CCC của mỗi chủ đề trong mỗi tháng.",
        )
        parser.add_argument(
            "--pending-per-month",
            type=int,
            default=2,
            help="Số phiên PENDING thêm vào mỗi chủ đề mỗi tháng.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260730,
            help="Seed random để dữ liệu lặp lại ổn định giữa các lần chạy.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa dữ liệu demo cũ của command này trước khi tạo lại.",
        )

    def handle(self, *args, **options):
        months = options["months"]
        per_month = options["per_month"]
        pending_per_month = options["pending_per_month"]

        if months < 1:
            raise CommandError("--months phải >= 1.")

        if per_month < 2:
            raise CommandError("--per-month phải >= 2 thì mới chia được hai phía.")

        if pending_per_month < 0:
            raise CommandError("--pending-per-month không được âm.")

        random.seed(options["seed"])

        if options["reset"]:
            removed = self._reset()
            self.stdout.write(f"Đã xóa {removed} bản ghi demo cũ.")

        session_ids = []

        with transaction.atomic():
            for month_index in range(months):
                period = self._month_start(month_index)

                for topic in TOPICS:
                    session_ids.extend(
                        self._seed_topic_month(
                            topic=topic,
                            period=period,
                            per_month=per_month,
                            pending_per_month=pending_per_month,
                        )
                    )

        rebuild_chatbot_session_summaries(session_ids)

        self.stdout.write(
            f"Đã tạo {len(session_ids)} phiên cho {len(TOPICS)} chủ đề "
            f"trong {months} tháng."
        )
        self._report()

    # ------------------------------------------------------------------
    # Sinh dữ liệu
    # ------------------------------------------------------------------
    def _seed_topic_month(self, *, topic, period, per_month, pending_per_month):
        """Một chủ đề trong một tháng: đủ cả hai phía theo tỷ lệ mục tiêu."""
        ccc_count = round(per_month * topic["ccc_rate"])

        # Ép mỗi phía có ít nhất một phiên, nếu không chủ đề ở hai đầu dải
        # (5% và 90%) lại rơi về đúng 0%/100% — chính thứ command này sinh ra
        # để tránh.
        ccc_count = max(1, min(per_month - 1, ccc_count))
        bot_count = per_month - ccc_count

        session_ids = []

        for kind, count in (
            (KIND_BOT, bot_count),
            (KIND_CCC, ccc_count),
            (KIND_PENDING, pending_per_month),
        ):
            for index in range(1, count + 1):
                session_ids.append(
                    self._seed_session(
                        topic=topic,
                        period=period,
                        kind=kind,
                        index=index,
                    )
                )

        return session_ids

    def _seed_session(self, *, topic, period, kind, index):
        stamp = period.strftime("%Y%m")
        suffix = f"{topic['code']}-{stamp}-{kind}-{index:03d}"
        session_id = f"{DEMO_PREFIX}{suffix}"
        started_at = self._moment(period=period, index=index, kind=kind)
        channel = CHANNELS[(index + period.month) % len(CHANNELS)]
        user_id = f"{DEMO_PREFIX}USER-{topic['code']}-{index:03d}"

        resolved = kind == KIND_BOT

        rows = [
            (GREETING_QUESTION, GREETING_ANSWER, QUESTION_TYPE_GREETING, ""),
            (
                topic["faq_question"] if resolved else topic["escalate_question"],
                topic["faq_answer"] if resolved else topic["escalate_answer"],
                QUESTION_TYPE_FAQ,
                topic["category"],
            ),
        ]

        for message_index, (question, answer, question_type, category) in enumerate(
            rows, start=1
        ):
            message_at = started_at + timedelta(minutes=message_index * 2)
            ChatbotChatLog.objects.update_or_create(
                external_id=f"{DEMO_PREFIX}LOG-{suffix}-{message_index:02d}",
                defaults={
                    "session_id": session_id,
                    "user_id": user_id,
                    "channel": channel,
                    "question": question,
                    "answer": answer,
                    "questionType": question_type,
                    "category": category,
                    "external_created_at": message_at,
                    "raw_payload": {
                        "demo": True,
                        "source": SOURCE_TAG,
                        "category": category,
                        "questionType": question_type,
                    },
                    "created_at": message_at,
                    "updated_at": message_at,
                },
            )

        if resolved:
            # Không state, không request -> detect_outcome() trả BOT_DONE.
            return session_id

        # Cả CCC lẫn PENDING đều bắt đầu bằng bước chatbot xin thông tin, nên
        # đều có một dòng cskh_state; khác nhau ở chỗ CCC lấy được liên hệ.
        state_at = started_at + timedelta(minutes=6)
        ChatbotState.objects.update_or_create(
            external_id=f"{DEMO_PREFIX}STATE-{suffix}",
            defaults={
                "session_id": session_id,
                "user_id": user_id,
                "channel": channel,
                "step": "collected" if kind == KIND_CCC else "waiting_info",
                "reason": topic["reason"],
                "external_created_at": state_at,
                "raw_payload": {"demo": True, "source": SOURCE_TAG},
                "created_at": state_at,
                "updated_at": state_at,
            },
        )

        if kind == KIND_PENDING:
            # Dừng ở đây: có state mà không có request -> PENDING.
            return session_id

        contact_type = CONTACT_TYPES[index % len(CONTACT_TYPES)]
        request_at = started_at + timedelta(minutes=9)
        ChatbotCskhRequest.objects.update_or_create(
            external_id=f"{DEMO_PREFIX}REQ-{suffix}",
            defaults={
                "session_id": session_id,
                "user_id": user_id,
                "channel": channel,
                "contact_info": self._contact_info(contact_type, index),
                "contact_type": contact_type,
                "reason": topic["reason"],
                "status": "collected",
                "external_created_at": request_at,
                "raw_payload": {"demo": True, "source": SOURCE_TAG},
                "created_at": request_at,
                "updated_at": request_at,
            },
        )

        return session_id

    # ------------------------------------------------------------------
    # Tiện ích
    # ------------------------------------------------------------------
    def _reset(self):
        """
        Xóa bản ghi của riêng command này.

        Phải xóa cả ChatbotSessionSummary thủ công: rebuild chỉ
        update_or_create theo session_id, không dọn phiên đã mất nguồn.
        """
        removed = 0

        for model in (ChatbotChatLog, ChatbotState, ChatbotCskhRequest):
            deleted, _ = model.objects.filter(
                external_id__startswith=DEMO_PREFIX
            ).delete()
            removed += deleted

        deleted, _ = ChatbotSessionSummary.objects.filter(
            session_id__startswith=DEMO_PREFIX
        ).delete()

        return removed + deleted

    @staticmethod
    def _month_start(month_index):
        """Ngày đầu tháng, lùi `month_index` tháng so với hiện tại."""
        now = timezone.localtime()

        year = now.year
        month = now.month - month_index

        while month <= 0:
            month += 12
            year -= 1

        return datetime(year, month, 1)

    @staticmethod
    def _moment(*, period, index, kind):
        """Thời điểm bắt đầu phiên, rải đều trong tháng và không ở tương lai."""
        now = timezone.localtime()
        max_day = monthrange(period.year, period.month)[1]

        if period.year == now.year and period.month == now.month:
            # Tháng hiện tại chỉ rải tới hôm nay, tránh sinh phiên tương lai
            # rồi bị mọi bộ lọc "tới hiện tại" cắt mất.
            max_day = min(max_day, now.day)

        offset = index * 3 + len(kind)
        day = (offset % max_day) + 1
        hour = 8 + (offset % 11)
        minute = (offset * 7) % 60

        naive = datetime(period.year, period.month, day, hour, minute, 0)

        return timezone.make_aware(naive, timezone.get_current_timezone())

    @staticmethod
    def _contact_info(contact_type, index):
        if contact_type == "EMAIL":
            return f"khach{index:05d}@example.com"

        if contact_type == "ACCOUNT":
            return f"068C{index:06d}"

        return f"09{index:08d}"

    def _report(self):
        """In lại đúng con số biểu đồ sẽ vẽ, để đối chiếu ngay sau khi seed."""
        rows = (
            ChatbotSessionSummary.objects.filter(session_id__startswith=DEMO_PREFIX)
            .values("dashboard_category")
            .annotate(
                bot_done=Count("id", filter=Q(outcome_type="BOT_DONE")),
                ccc=Count("id", filter=Q(outcome_type="CCC")),
                pending=Count("id", filter=Q(outcome_type="PENDING")),
            )
            .order_by("dashboard_category")
        )

        self.stdout.write("")
        self.stdout.write(
            f"{'Chủ đề':30}{'Bot':>6}{'CCC':>6}{'Pending':>9}{'% CCC':>8}"
        )

        for row in rows:
            total = row["bot_done"] + row["ccc"]
            rate = round(row["ccc"] / total * 100, 1) if total else 0.0
            self.stdout.write(
                f"{(row['dashboard_category'] or '(chưa gán)')[:30]:30}"
                f"{row['bot_done']:6}{row['ccc']:6}{row['pending']:9}{rate:7}%"
            )
