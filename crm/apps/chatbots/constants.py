"""Giá trị nghiệp vụ dùng chung cho module chatbot."""

# questionType trong bảng xpro_chat_logs
QUESTION_TYPE_GREETING = "GREETING"
QUESTION_TYPE_UNRELATED = "UNRELATED"

QUESTION_TYPE_CUSTOMER_CARE = "CUSTOMER_CARE"

# Các dạng câu hỏi nghiệp vụ / FAQ tự động mà chatbot trả lời bằng kho tri thức.
# Hấp thụ cả các biến thể từ Supabase (CUSTOMER_CARE, CUSTOMER CARE CENTER, RAG, DIRECT, FAQ).
FAQ_QUESTION_KEYWORDS = (
    "CUSTOMER_CARE",
    "CUSTOMER CARE",
    "CUSTOMER_CARE_CENTER",
    "CUSTOMER CARE CENTER",
    "RAG",
    "DIRECT",
    "FAQ",
)

# Câu phân tích cổ phiếu / khuyến nghị thị trường. Chỉ nguồn xpro_chat_logs có;
# chat_questions (Zalo) chỉ dùng CUSTOMER_CARE / GREETING / UNRELATED.
QUESTION_TYPE_RESEARCH = "RESEARCH"

# Câu hỏi rác: CHỈ loại không liên quan.
#
# Chào hỏi không phải rác — "xin chào" là cách mở đầu bình thường của một
# cuộc trò chuyện, gộp vào rác thì tỷ lệ câu rác bị thổi phồng và người đọc
# tưởng khách đang phá.
SPAM_QUESTION_TYPES = [QUESTION_TYPE_UNRELATED]

# Các loại KHÔNG có chủ đề. Rộng hơn nhóm rác: chào hỏi tuy không phải rác
# nhưng cũng chẳng phải chủ đề để xếp hạng.
#
# Nguồn chỉ gán chủ đề nghiệp vụ cho CUSTOMER_CARE. Với ba loại này, cột
# `category` được ghi bằng chính tên loại viết thường ("research", "greeting",
# "unrelated") — đó là nhãn loại, không phải chủ đề. Đọc nguyên si thì
# "research" leo lên hạng 1 biểu đồ chủ đề và bảng FAQ, át hết chủ đề thật.
NON_TOPIC_QUESTION_TYPES = [
    QUESTION_TYPE_GREETING,
    QUESTION_TYPE_UNRELATED,
    QUESTION_TYPE_RESEARCH,
]

# Tên cũ, giữ lại cho code đang import. Cùng một danh sách.
NON_FAQ_QUESTION_TYPES = NON_TOPIC_QUESTION_TYPES

# Giá trị `category` là echo của chính questionType chứ không phải chủ đề.
# Lọc theo questionType là chốt chặn chính; đây là chốt thứ hai cho dòng lệch
# (đã gặp dòng CUSTOMER_CARE mà category="research").
ECHO_CATEGORY_VALUES = {
    "research",
    "greeting",
    "unrelated",
    "customer_care",
    "customer care",
}

# sender_type trong bảng chat_questions. xpro_chat_logs không có cột này.
SENDER_TYPE_CUSTOMER = "customer"
SENDER_TYPE_ANONYMOUS = "anonymous"
SENDER_TYPE_BOT = "bot"
SENDER_TYPE_SA = "sa"

# Khách nhắn, dù đã đăng nhập hay chưa. "anonymous" là khách chưa đăng nhập:
# các dòng đó đều có `question` và không có `answer`, tức là khách đang hỏi.
# Bỏ sót nó thì phiên toàn khách vãng lai bị đếm 0 lượt và rơi hết vào SPAM.
CUSTOMER_SENDER_TYPES = {SENDER_TYPE_CUSTOMER, SENDER_TYPE_ANONYMOUS}

# Nhãn người nói khi dựng lại hội thoại.
SENDER_LABELS = {
    SENDER_TYPE_CUSTOMER: "KH",
    SENDER_TYPE_ANONYMOUS: "KH",
    SENDER_TYPE_BOT: "Bot",
    SENDER_TYPE_SA: "NV",
}

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
    """
    Trả về category đã trim, hoặc chuỗi rỗng nếu chatbot chưa phân loại.

    Giá trị chỉ là echo của questionType ("research", "greeting"...) cũng trả
    về rỗng: đó là nhãn loại câu hỏi, không phải chủ đề nghiệp vụ.
    """
    text = str(value or "").strip()

    return "" if text.lower() in ECHO_CATEGORY_VALUES else text


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
    normalized = normalize_question_type(question_type)
    return any(keyword in normalized for keyword in FAQ_QUESTION_KEYWORDS)


def is_research_question(question_type):
    """Câu phân tích cổ phiếu / khuyến nghị thị trường."""
    return normalize_question_type(question_type) == QUESTION_TYPE_RESEARCH


def has_topic(question_type):
    """
    Lượt hỏi này có mang chủ đề nghiệp vụ không.

    Chỉ CUSTOMER_CARE mới được nguồn gán chủ đề. Viết theo hướng loại trừ chứ
    không phải "chỉ nhận CUSTOMER_CARE": thêm một loại nghiệp vụ mới thì không
    phải sửa lại, và dòng chưa gán questionType nhưng đã có chủ đề thật (đang
    có ở nguồn Zalo) vẫn được giữ.
    """
    return normalize_question_type(question_type) not in NON_TOPIC_QUESTION_TYPES


def normalize_sender_type(value):
    return str(value or "").strip().lower()


def is_customer_sender(sender):
    """sender_type (đã chuẩn hóa) có phải là khách không."""
    return sender in CUSTOMER_SENDER_TYPES


def is_customer_turn(log):
    """
    Dòng này có phải một lượt hỏi của khách không.

    Hai nguồn chat ghi khác nhau:
      - xpro_chat_logs  : mỗi dòng là trọn một cặp hỏi - đáp, không có
                          sender_type, nên dòng nào cũng là một lượt của khách.
      - chat_questions  : mỗi dòng là một tin nhắn của MỘT bên (customer / bot
                          / sa), nên chỉ dòng của khách mới tính là một lượt.

    Không lọc thì msg_count_total của phiên Zalo bị đếm gấp hai, gấp ba.
    """
    sender = normalize_sender_type(getattr(log, "sender_type", None))

    return not sender or is_customer_sender(sender)
