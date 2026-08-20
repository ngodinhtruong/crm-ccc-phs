"""
Khai báo các bảng nguồn trên Supabase.

Hai nhóm, đúng theo nghiệp vụ:

  CHAT_SOURCES    — hội thoại của khách (câu hỏi, câu trả lời, phân loại).
                    Mỗi nền tảng một bảng, tất cả đổ chung vào ChatbotChatLog
                    để phía sau chỉ còn một luồng xử lý duy nhất.

  CONTACT_SOURCES — trạng thái xin thông tin và thông tin khách đã cung cấp.
                    Đây mới là thứ quyết định phiên có chuyển CCC hay không.

Thêm một nền tảng chat mới = thêm một ChatbotSyncSource vào CHAT_SOURCES.
Không phải sửa vòng nhập, không phải sửa tổng hợp phiên, không phải sửa
dashboard.

Trước đây khai báo này là tuple dict nằm lẫn trong management command: không
có kiểu, không biết key nào bắt buộc, thiếu một key thì lỗi chỉ lộ ra lúc
chạy thật. Dùng dataclass để thiếu key là hỏng ngay lúc import.
"""

from dataclasses import dataclass
from typing import Callable

from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotState,
)

# Tên cột khóa phiên / định danh khách mà đa số bảng đang dùng.
DEFAULT_SESSION_KEYS = ("session_id", "sessionID", "sessionId")
DEFAULT_USER_KEYS = ("user_id", "user_ID", "userId")


def get_value(row, *keys):
    """
    Giá trị đầu tiên khác None trong payload.

    Lớp hấp thụ việc Supabase đổi tên cột: đổi ``channel`` thành ``platform``
    thì chỉ cần thêm tên mới vào danh sách, không phải migration bên CRM.
    """
    for key in keys:
        value = row.get(key)

        if value is not None:
            return value

    return None


@dataclass(frozen=True)
class ChatbotSyncSource:
    # Khóa của cursor đồng bộ, và cũng là giá trị ghi vào cột source_name.
    name: str
    # Nhãn in ra khi chạy command.
    label: str
    # Tên setting chứa tên bảng thật trên Supabase.
    table_setting: str
    model: type
    # Cột dùng để order và làm mốc đồng bộ incremental.
    order_column: str
    # Các tên có thể có của cột thời gian trong payload.
    time_keys: tuple
    # Cột riêng của bảng -> cột của model.
    extra_fields: Callable
    session_keys: tuple = DEFAULT_SESSION_KEYS
    user_keys: tuple = DEFAULT_USER_KEYS
    # Dòng không có khóa phiên vẫn nhập, xem như một phiên riêng.
    allow_orphan_session: bool = False
    # Bảng đích có nhiều nguồn đổ chung -> phải ghi source_name lên từng dòng
    # và đưa nó vào khóa duy nhất.
    track_source: bool = False


XPRO_CHAT_LOGS = ChatbotSyncSource(
    name="xpro_chat_logs",
    label="Chat XPro",
    table_setting="SUPABASE_XPRO_CHAT_TABLE",
    model=ChatbotChatLog,
    order_column="created_at",
    time_keys=("created_at", "create_at"),
    # Chat log không có session_id vẫn nhập, xem như một phiên riêng.
    allow_orphan_session=True,
    track_source=True,
    extra_fields=lambda row: {
        "question": get_value(row, "question"),
        "answer": get_value(row, "answer"),
        "questionType": get_value(row, "questionType", "question_type"),
        "category": get_value(row, "category", "categories"),
    },
)

CHAT_QUESTIONS = ChatbotSyncSource(
    name="chat_questions",
    label="Chat Zalo",
    table_setting="SUPABASE_CHAT_QUESTIONS_TABLE",
    model=ChatbotChatLog,
    order_column="created_at",
    time_keys=("created_at",),
    # Khóa gom phiên của bảng này nằm ở cột sender_id, không phải session_id.
    session_keys=("sender_id",),
    # Bảng không có cột user_id; định danh khách nằm ở user_id_by_app.
    user_keys=("user_id_by_app", "user_id"),
    allow_orphan_session=True,
    track_source=True,
    extra_fields=lambda row: {
        "question": get_value(row, "question"),
        "answer": get_value(row, "answer"),
        # Zalo dùng cùng bộ giá trị với XPro, trừ RESEARCH:
        # CUSTOMER_CARE / GREETING / UNRELATED.
        "questionType": get_value(row, "questionType", "question_type"),
        "category": get_value(row, "category", "categories"),
        # Một dòng của bảng này là một tin nhắn của MỘT bên.
        "sender_type": get_value(row, "sender_type"),
        # Phiên chốt ở chế độ nào sau 30 phút: bot / mod / sa. Lưu sẵn cho
        # việc sinh ticket từ Zalo sau này, nghiệp vụ hiện chưa dùng.
        "chat_mode": get_value(row, "chat_mode"),
        "conversation_id": get_value(row, "conversation_id"),
        "message_id": get_value(row, "message_id"),
    },
)

CSKH_STATE = ChatbotSyncSource(
    name="cskh_state",
    label="CSKH states",
    table_setting="SUPABASE_CSKH_STATE_TABLE",
    model=ChatbotState,
    order_column="updated_at",
    time_keys=("updated_at", "updatedAt", "created_at"),
    # State/Request không có session_id thì vô nghĩa: không biết gắn vào phiên
    # nào để tính ra nhóm xử lý.
    allow_orphan_session=False,
    extra_fields=lambda row: {
        "step": get_value(row, "step"),
        "reason": get_value(row, "reason"),
    },
)

CSKH_REQUESTS = ChatbotSyncSource(
    name="cskh_requests",
    label="CSKH requests",
    table_setting="SUPABASE_CSKH_REQUESTS_TABLE",
    model=ChatbotCskhRequest,
    order_column="created_at",
    time_keys=("created_at", "create_at"),
    allow_orphan_session=False,
    extra_fields=lambda row: {
        "contact_info": get_value(row, "contact_info"),
        "contact_type": get_value(row, "contact_type"),
        "reason": get_value(row, "reason"),
        "status": get_value(row, "status"),
    },
)


CHAT_SOURCES = (XPRO_CHAT_LOGS, CHAT_QUESTIONS)
CONTACT_SOURCES = (CSKH_STATE, CSKH_REQUESTS)

SYNC_SOURCES = CHAT_SOURCES + CONTACT_SOURCES
