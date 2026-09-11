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

import json
from dataclasses import dataclass
from typing import Callable

from apps.chatbots.constants import (
    CONTACT_FIELD_KEYS,
    CONTACT_FIELD_LABELS,
    parse_category,
)
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

    Lớp hấp thụ việc Supabase đổi tên cột hoặc khác biệt viết hoa/viết thường:
    thử lần lượt các tên chính xác, sau đó thử tìm kiếm không phân biệt hoa thường.
    """
    for key in keys:
        value = row.get(key)
        if value is not None:
            return value

    # Case-insensitive fallback (nếu Supabase dùng questiontype, QuestionType, Category, etc.)
    row_keys_lower = {str(k).lower(): k for k in row.keys()}
    for key in keys:
        k_lower = key.lower()
        if k_lower in row_keys_lower:
            value = row.get(row_keys_lower[k_lower])
            if value is not None:
                return value

    return None


TRUE_TEXTS = {"true", "t", "1", "yes", "y"}
FALSE_TEXTS = {"false", "f", "0", "no", "n"}


def get_bool(row, *keys):
    """
    Cờ boolean từ payload, chịu được việc nguồn ghi bằng chuỗi.

    ``is_issue_occurrence`` về dưới dạng chuỗi "true"/"false" chứ không phải
    boolean JSON. ``bool("false")`` là True, nên đọc thẳng là lật ngược ý
    nghĩa của cột. Giá trị lạ trả None — "không biết" khác với "không".
    """
    value = get_value(row, *keys)

    if value is None or isinstance(value, bool):
        return value

    text = str(value).strip().lower()

    if text in TRUE_TEXTS:
        return True

    if text in FALSE_TEXTS:
        return False

    return None


CATEGORY_KEYS = (
    "category",
    "categories",
    "Category",
    "CATEGORIES",
    "topic",
    "subject",
    "category_name",
)


def get_category_fields(row, keys=CATEGORY_KEYS):
    """
    Cột ``category`` -> hai cột model: tên chủ đề và mã chủ đề.

    Tách ngay tại lớp nhập thay vì lúc đọc: cột ``category`` của nguồn có hai
    dạng (chuỗi thuần và chuỗi JSON kèm ``category_id``), và mỗi nơi đọc lại
    tự parse là mỗi nơi một kiểu sai.
    """
    category_id, name = parse_category(get_value(row, *keys))

    return {
        "category": name or None,
        "category_id": category_id,
    }


def parse_contact_payload(value):
    """
    Cột ``contact_info`` thô -> dict chuẩn, hoặc ``{}`` nếu nguồn chỉ đưa một
    giá trị đơn.

    Nguồn cũ ghi cột này là MỘT chuỗi ("0912345678"). Nguồn mới ghi jsonb
    nhiều trường::

        {"email": "an@gmail.com", "phone": "0377929765", "full_name": "vivi",
         "customer_type": null, "account_number": null}

    Trả ``{}`` cho dạng cũ là có chủ đích: phía tra khách hàng phân biệt được
    "nguồn có khai cấu trúc" với "nguồn chỉ đưa một giá trị, phải suy từ
    contact_type" — gói đại chuỗi cũ vào một key nào đó là đoán mò, và đoán sai
    thì ticket nối nhầm sang khách hàng khác.
    """
    data = value

    if isinstance(data, str):
        text = data.strip()

        if not text.startswith("{"):
            return {}

        try:
            data = json.loads(text)
        except (TypeError, ValueError):
            return {}

    if not isinstance(data, dict):
        return {}

    payload = {}

    for key in CONTACT_FIELD_KEYS:
        field = str(data.get(key) or "").strip()

        if field:
            payload[key] = field

    # Giữ lại các key lạ nguồn thêm sau này, để không âm thầm mất dữ liệu.
    for key, field in data.items():
        if key not in CONTACT_FIELD_KEYS and field not in (None, ""):
            payload[key] = field

    return payload


def format_contact_info(payload, fallback=None):
    """
    Chuỗi hiển thị của khối thông tin liên hệ.

    Có nhãn đi kèm chứ không nối trần các giá trị: khách để lại cả số điện
    thoại lẫn số tài khoản thì nhìn dãy số trần không biết đâu là gì.
    """
    if not payload:
        text = str(fallback or "").strip()

        return text[:255] or None

    parts = [
        f"{label}: {payload[key]}"
        for key, label in CONTACT_FIELD_LABELS
        if payload.get(key)
    ]

    return " | ".join(parts)[:255] or None


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
        "question": get_value(row, "question", "Question", "QUESTION"),
        "answer": get_value(row, "answer", "Answer", "ANSWER"),
        "questionType": get_value(row, "questionType", "question_type", "questiontype", "QuestionType", "QUESTION_TYPE", "type"),
        **get_category_fields(row),
        # Bốn cột dưới chỉ có ở bảng UAT; bảng cũ thiếu thì về None.
        "language": get_value(row, "language", "lang"),
        # Vấn đề chatbot tóm tắt cho lượt này — nguồn thông tin tốt nhất để
        # đặt tiêu đề ticket, sát hơn nhiều so với cắt câu hỏi cuối.
        "issue": get_value(row, "issue"),
        "is_issue_occurrence": get_bool(row, "is_issue_occurrence"),
        "relation_issue": get_value(row, "relation_issue"),
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
        "question": get_value(row, "question", "Question", "QUESTION"),
        "answer": get_value(row, "answer", "Answer", "ANSWER"),
        # Zalo dùng cùng bộ giá trị với XPro, trừ RESEARCH:
        # CUSTOMER_CARE / GREETING / UNRELATED.
        "questionType": get_value(row, "questionType", "question_type", "questiontype", "QuestionType", "QUESTION_TYPE", "type"),
        **get_category_fields(row),
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
        "reason": get_value(row, "reason", "issue"),
        # Ba cột dưới chỉ có ở bảng UAT; bảng cũ thiếu thì về None.
        **get_category_fields(row),
        "language": get_value(row, "language", "lang"),
        # Nguồn đặt sai chính tả tên cột ("reponse"). Đọc cả hai cách để đổi
        # lại tên ở nguồn không phải sửa code, và ngược lại.
        "response": get_value(row, "reponse", "response"),
    },
)


def cskh_request_fields(row):
    """
    Một dòng ``cskh_requests`` -> các cột của ChatbotCskhRequest.

    Viết thành hàm thay vì lambda vì bảng này là chỗ hai thế hệ schema lệch
    nhau nhiều nhất, và nó nuôi thẳng luồng sinh ticket:

      - ``contact_info`` : nguồn cũ là một chuỗi, nguồn mới là jsonb nhiều
        trường. Giữ cả hai — dict đầy đủ vào ``contact_payload`` để tra ra
        khách hàng, chuỗi có nhãn vào ``contact_info`` để hiển thị và tìm kiếm.
      - ``reason`` -> ``issue`` : nguồn mới đổi tên cột. Vẫn đổ về ``reason``
        để tiêu đề ticket và mọi bộ lọc đang đọc cột đó không phải sửa theo.
      - ``category`` : nguồn mới ghi kèm ``category_id`` dưới dạng JSON.
    """
    payload = parse_contact_payload(get_value(row, "contact_info"))

    return {
        "contact_payload": payload or None,
        "contact_info": format_contact_info(
            payload,
            fallback=get_value(row, "contact_info"),
        ),
        "contact_type": get_value(row, "contact_type"),
        "reason": get_value(row, "reason", "issue"),
        "status": get_value(row, "status"),
        **get_category_fields(row),
    }


CSKH_REQUESTS = ChatbotSyncSource(
    name="cskh_requests",
    label="CSKH requests",
    table_setting="SUPABASE_CSKH_REQUESTS_TABLE",
    model=ChatbotCskhRequest,
    order_column="created_at",
    time_keys=("created_at", "create_at"),
    allow_orphan_session=False,
    extra_fields=cskh_request_fields,
)


CHAT_SOURCES = (XPRO_CHAT_LOGS, CHAT_QUESTIONS)
CONTACT_SOURCES = (CSKH_STATE, CSKH_REQUESTS)

SYNC_SOURCES = CHAT_SOURCES + CONTACT_SOURCES
