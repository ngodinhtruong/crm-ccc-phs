from django.db import models

from apps.common.models import TimeStampedModel


class ChatbotChatLog(TimeStampedModel):
    """
    Một lượt chat, gộp từ mọi nền tảng.

    Hai bảng Supabase cùng đổ vào đây — ``xpro_chat_logs`` và
    ``chat_questions`` (Zalo) — để phía sau (tổng hợp phiên, phân loại, sinh
    ticket, dashboard) chỉ có đúng một luồng xử lý. Phân biệt bằng
    ``source_name``.
    """

    # Bảng Supabase đã sinh ra dòng này: "xpro_chat_logs" | "chat_questions".
    # Bắt buộc vì id của hai bảng trùng dải nhau, external_id một mình không
    # đủ làm khóa: id=796 của Zalo sẽ ghi đè id=796 của XPro.
    source_name = models.CharField(max_length=50, default="", db_index=True)

    # external_id dùng để lưu cột id (bigint) từ Supabase kéo về
    external_id = models.CharField(max_length=100)
    session_id = models.CharField(max_length=100)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    question = models.TextField(null=True, blank=True)
    answer = models.TextField(null=True, blank=True)
    questionType = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    # Mã chủ đề của chatbot. Nguồn ghi cột `category` lúc thì là chuỗi thuần,
    # lúc thì là JSON có kèm id; tách sẵn ra đây để phía sau không phải parse
    # lại, và để ánh xạ sang danh mục CRM theo mã thay vì theo tên có dấu.
    category_id = models.IntegerField(null=True, blank=True, db_index=True)

    # ── Cột nguồn mới (xpro_chat_UAT); nguồn cũ để trống ──
    language = models.CharField(max_length=10, null=True, blank=True)
    # Vấn đề của khách, do chatbot tóm tắt lại. Đây là thứ CCC cần đọc đầu
    # tiên, và là tiêu đề ticket khi phiên chuyển CCC.
    issue = models.TextField(null=True, blank=True)
    # Lượt này có phát sinh vấn đề cần người xử lý không.
    is_issue_occurrence = models.BooleanField(null=True, blank=True)
    # Quan hệ với vấn đề của lượt trước: NEW_TOPIC / SAME_ISSUE /
    # FOLLOW_UP_NEW_ISSUE / CONTEXTUAL_REPLY / CUSTOMER_INFO_COLLECTED.
    relation_issue = models.CharField(max_length=50, null=True, blank=True)

    # ── Chỉ nguồn chat_questions (Zalo) điền; xpro_chat_logs để trống ──
    # Ai gửi tin này: customer / bot / sa. Trống nghĩa là dòng xpro, tức là
    # trọn một cặp hỏi - đáp.
    sender_type = models.CharField(max_length=50, null=True, blank=True)
    # Phiên chốt ở chế độ nào sau 30 phút: bot / mod / sa.
    chat_mode = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    # Hai cột dưới lưu sẵn để sau này dùng, nghiệp vụ hiện chưa đụng tới.
    conversation_id = models.CharField(max_length=100, null=True, blank=True)
    message_id = models.CharField(max_length=100, null=True, blank=True)

    # external_created_at dùng để lưu cột created_at từ Supabase
    external_created_at = models.DateTimeField(null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_chat_logs"
        constraints = [
            models.UniqueConstraint(
                fields=["source_name", "external_id"],
                name="uq_chatbot_chat_log_source_external",
            )
        ]
        indexes = [
            models.Index(fields=["session_id"]),
            models.Index(fields=["questionType"]),
            models.Index(fields=["external_created_at"]),
        ]

    def __str__(self):
        return f"Log: {self.session_id}"


class ChatbotState(TimeStampedModel):
    # external_id dùng để lưu cột id (bigint) từ Supabase
    external_id = models.CharField(max_length=100, unique=True)
    session_id = models.CharField(max_length=100)
    user_id = models.CharField(max_length=100, null=True, blank=True) # Trong DB của bạn cột này là NO NULL
    channel = models.CharField(max_length=50, null=True, blank=True)

    step = models.CharField(max_length=100, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)

    # ── Cột nguồn mới (cskh_state_UAT); nguồn cũ để trống ──
    category = models.CharField(max_length=255, null=True, blank=True)
    category_id = models.IntegerField(null=True, blank=True)
    language = models.CharField(max_length=10, null=True, blank=True)
    # Câu chatbot đã trả lời khách khi xin thông tin. Nguồn viết sai chính tả
    # tên cột ("reponse"); đọc theo cả hai cách, lưu về đúng tên.
    response = models.TextField(null=True, blank=True)

    # external_created_at dùng để lưu cột updated_at từ Supabase
    external_created_at = models.DateTimeField(null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_states"
        indexes = [
            models.Index(fields=["session_id"]),
            models.Index(fields=["step"]),
            models.Index(fields=["external_created_at"]),
        ]

    def __str__(self):
        return f"State: {self.session_id}"


class ChatbotCskhRequest(TimeStampedModel):
    # external_id dùng để lưu cột id (bigint) từ Supabase
    external_id = models.CharField(max_length=100, unique=True)
    session_id = models.CharField(max_length=100)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    # Chuỗi hiển thị, đã dàn phẳng từ contact_payload. Giữ kiểu chuỗi vì admin
    # và bộ lọc của dashboard tìm kiếm bằng icontains trên cột này.
    contact_info = models.CharField(max_length=255, null=True, blank=True)
    # Bản đầy đủ khách đã cung cấp: full_name / phone / email / account_number
    # / customer_type. Nguồn mới trả JSON nhiều trường chứ không còn một giá
    # trị duy nhất — dàn phẳng rồi vứt đi thì mất đúng thứ dùng để tra ra
    # khách hàng (số tài khoản), và CCC mất tên người cần gọi.
    contact_payload = models.JSONField(null=True, blank=True)
    # PHONE / EMAIL / ACCOUNT / MULTIPLE
    contact_type = models.CharField(max_length=50, null=True, blank=True)
    # Lý do khách cần CSKH. Nguồn cũ đặt tên cột là `reason`, nguồn mới là
    # `issue`; cả hai cùng đổ vào đây để mọi chỗ đang đọc `reason` (serializer,
    # bộ lọc, dashboard, tiêu đề ticket) không phải sửa theo.
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)

    # Chủ đề chatbot chốt tại thời điểm chuyển CCC — chính xác hơn chủ đề suy
    # ra từ các lượt chat, vì nó là nhãn của chính yêu cầu được bàn giao.
    category = models.CharField(max_length=255, null=True, blank=True)
    category_id = models.IntegerField(null=True, blank=True)

    # external_created_at dùng để lưu cột created_at từ Supabase
    external_created_at = models.DateTimeField(null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_cskh_requests"
        indexes = [
            models.Index(fields=["session_id"]),
            models.Index(fields=["status"]),
            models.Index(fields=["external_created_at"]),
        ]

    def __str__(self):
        return f"Request: {self.session_id}"


class ChatbotSessionSummary(TimeStampedModel):
    """
    Kết quả xử lý của một phiên chat, tính lại sau mỗi lần sync.

    Phân loại theo nghiệp vụ:
      - CCC     : phiên đã xin được thông tin KH (có trong cskh_requests)
      - PENDING : chatbot bí, đã hỏi xin thông tin nhưng KH chưa/không cho
                  (có trong cskh_state, chưa có cskh_requests)
      - BOT_DONE: chatbot tự trả lời xong câu FAQ (có lượt hỏi CUSTOMER_CARE,
                  không nằm trong cskh_state lẫn cskh_requests)
      - RESEARCH: chatbot phân tích cổ phiếu / khuyến nghị thị trường
                  (có lượt hỏi RESEARCH nhưng không có lượt CUSTOMER_CARE)
      - SPAM    : phiên có ít nhất một lượt GREETING/UNRELATED
      - UNCLASSIFIED: phiên mà chatbot chưa gán questionType cho lượt nào.
                  Tách riêng vì đây là LỖ HỔNG DỮ LIỆU chứ không phải kết quả
                  xử lý — gộp vào SPAM là vu cho khách hỏi rác.
    """

    OUTCOME_BOT_DONE = "BOT_DONE"
    OUTCOME_CCC = "CCC"
    OUTCOME_RESEARCH = "RESEARCH"
    OUTCOME_SPAM = "SPAM"
    OUTCOME_PENDING = "PENDING"
    OUTCOME_UNCLASSIFIED = "UNCLASSIFIED"

    OUTCOME_CHOICES = [
        (OUTCOME_BOT_DONE, "Chatbot tự xử lý"),
        (OUTCOME_CCC, "Chuyển CCC xử lý"),
        (OUTCOME_RESEARCH, "Phân tích / khuyến nghị"),
        (OUTCOME_SPAM, "Câu hỏi rác"),
        (OUTCOME_PENDING, "Chờ thông tin khách hàng"),
        (OUTCOME_UNCLASSIFIED, "Chưa xác định loại"),
    ]

    session_id = models.CharField(max_length=100, unique=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    # Chủ đề của phiên, lấy từ cột category của xpro_chat_logs
    dashboard_category = models.CharField(max_length=255, null=True, blank=True)
    dashboard_category_id = models.IntegerField(null=True, blank=True)

    outcome_type = models.CharField(max_length=50, choices=OUTCOME_CHOICES)

    # Số lượt hỏi trong phiên, tách theo cách phiên được xử lý
    msg_count_total = models.IntegerField(default=0)
    msg_count_bot_done = models.IntegerField(default=0)
    msg_count_ccc = models.IntegerField(default=0)
    msg_count_spam = models.IntegerField(default=0)
    msg_count_pending = models.IntegerField(default=0)
    msg_count_research = models.IntegerField(default=0)
    msg_count_unclassified = models.IntegerField(default=0)

    has_cskh_state = models.BooleanField(default=False)
    has_cskh_request = models.BooleanField(default=False)

    state_step = models.CharField(max_length=50, null=True, blank=True)

    contact_info = models.CharField(max_length=255, null=True, blank=True)
    # Nguyên văn khối thông tin khách đã cung cấp, chép từ cskh_request của
    # phiên. Ticket và màn CCC đọc từ đây thay vì cắt chuỗi contact_info.
    contact_payload = models.JSONField(null=True, blank=True)
    contact_name = models.CharField(max_length=255, null=True, blank=True)
    contact_type = models.CharField(max_length=50, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)

    first_question = models.TextField(null=True, blank=True)
    last_question = models.TextField(null=True, blank=True)
    full_conversation = models.TextField(null=True, blank=True)

    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_sessions",
    )

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_session_summaries"
        indexes = [
            models.Index(fields=["dashboard_category"]),
            models.Index(fields=["outcome_type"]),
            models.Index(fields=["started_at"]),
        ]

    def __str__(self):
        return self.session_id


class ChatbotSyncCursor(TimeStampedModel):
    source_name = models.CharField(max_length=100, unique=True)

    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)

    last_row_count = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default="SUCCESS")
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_sync_cursors"

    def __str__(self):
        return self.source_name
