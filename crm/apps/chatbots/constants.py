"""Giá trị nghiệp vụ dùng chung cho module chatbot."""

# questionType trong bảng xpro_chat_logs
QUESTION_TYPE_GREETING = "GREETING"
QUESTION_TYPE_UNRELATED = "UNRELATED"

# Câu hỏi rác: chào hỏi + không liên quan
SPAM_QUESTION_TYPES = [QUESTION_TYPE_GREETING, QUESTION_TYPE_UNRELATED]

# step trong bảng cskh_state
STATE_STEP_WAITING_INFO = "waiting_info"
STATE_STEP_COLLECTED = "collected"
STATE_STEP_CLOSED = "closed"

# Nhãn hiển thị khi câu hỏi chưa được chatbot gán category
UNCATEGORIZED_LABEL = "Chưa phân loại"


def normalize_question_type(value):
    return str(value or "").strip().upper()


def normalize_step(value):
    return str(value or "").strip().lower()


def normalize_category(value):
    """Trả về category đã trim, hoặc chuỗi rỗng nếu chatbot chưa phân loại."""
    return str(value or "").strip()


def category_label(value):
    return normalize_category(value) or UNCATEGORIZED_LABEL


def is_spam_question(question_type):
    return normalize_question_type(question_type) in SPAM_QUESTION_TYPES
