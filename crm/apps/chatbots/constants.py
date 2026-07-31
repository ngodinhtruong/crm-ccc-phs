"""Giá trị nghiệp vụ dùng chung cho module chatbot."""

# questionType trong bảng xpro_chat_logs
QUESTION_TYPE_GREETING = "GREETING"
QUESTION_TYPE_UNRELATED = "UNRELATED"

# Câu hỏi nghiệp vụ (FAQ). Đây là loại questionType duy nhất được chatbot gán
# category, nên cũng là loại duy nhất so sánh được bot với CCC theo chủ đề.
QUESTION_TYPE_CUSTOMER_CARE = "CUSTOMER_CARE"

# Câu hỏi rác: chào hỏi + không liên quan
SPAM_QUESTION_TYPES = [QUESTION_TYPE_GREETING, QUESTION_TYPE_UNRELATED]

# step trong bảng cskh_state
STATE_STEP_WAITING_INFO = "waiting_info"
STATE_STEP_COLLECTED = "collected"
STATE_STEP_CLOSED = "closed"

# Nhãn hiển thị khi câu hỏi chưa được chatbot gán category
UNCATEGORIZED_LABEL = "Chưa phân loại"

# Nhãn hiển thị khi phiên không xác định được kênh
UNKNOWN_CHANNEL_LABEL = "KHÁC"


def normalize_question_type(value):
    return str(value or "").strip().upper()


def normalize_step(value):
    return str(value or "").strip().lower()


def normalize_category(value):
    """Trả về category đã trim, hoặc chuỗi rỗng nếu chatbot chưa phân loại."""
    return str(value or "").strip()


def category_label(value):
    return normalize_category(value) or UNCATEGORIZED_LABEL


def channel_label(value):
    """
    Nhãn kênh chat, viết hoa.

    Chuẩn hóa để "zalo", "Zalo" và " ZALO " gộp về cùng một nhóm trên biểu đồ
    thay vì thành ba cột riêng.
    """
    return str(value or "").strip().upper() or UNKNOWN_CHANNEL_LABEL


def is_spam_question(question_type):
    return normalize_question_type(question_type) in SPAM_QUESTION_TYPES


def is_faq_question(question_type):
    """Câu hỏi nghiệp vụ mà chatbot trả lời bằng kho tri thức."""
    return normalize_question_type(question_type) == QUESTION_TYPE_CUSTOMER_CARE
