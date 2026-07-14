from django.db import models
from apps.common.models import TimeStampedModel

class ChatbotChatLog(TimeStampedModel):
    # external_id dùng để lưu cột id (bigint) từ Supabase kéo về
    external_id = models.CharField(max_length=100, unique=True)
    session_id = models.CharField(max_length=100, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    question = models.TextField(null=True, blank=True)
    answer = models.TextField(null=True, blank=True)
    questionType = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)

    # external_created_at dùng để lưu cột created_at từ Supabase
    external_created_at = models.DateTimeField(null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "chatbot_chat_logs"
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
    session_id = models.CharField(max_length=100, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True) # Trong DB của bạn cột này là NO NULL
    channel = models.CharField(max_length=50, null=True, blank=True)

    step = models.CharField(max_length=100, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)

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
    session_id = models.CharField(max_length=100, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    contact_info = models.CharField(max_length=255, null=True, blank=True)
    contact_type = models.CharField(max_length=50, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)

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
      - BOT_DONE: chatbot tự trả lời xong (không nằm trong cskh_state)
      - SPAM    : phiên chỉ toàn câu hỏi GREETING/UNRELATED
    """

    OUTCOME_BOT_DONE = "BOT_DONE"
    OUTCOME_CCC = "CCC"
    OUTCOME_SPAM = "SPAM"
    OUTCOME_PENDING = "PENDING"

    OUTCOME_CHOICES = [
        (OUTCOME_BOT_DONE, "Chatbot tự xử lý"),
        (OUTCOME_CCC, "Chuyển CCC xử lý"),
        (OUTCOME_SPAM, "Câu hỏi rác"),
        (OUTCOME_PENDING, "Chờ thông tin khách hàng"),
    ]

    session_id = models.CharField(max_length=100, unique=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    channel = models.CharField(max_length=50, null=True, blank=True)

    # Chủ đề của phiên, lấy từ cột category của xpro_chat_logs
    dashboard_category = models.CharField(max_length=255, null=True, blank=True)

    outcome_type = models.CharField(
        max_length=50,
        choices=OUTCOME_CHOICES,
        db_index=True,
    )

    # Số lượt hỏi trong phiên, tách theo cách phiên được xử lý
    msg_count_total = models.IntegerField(default=0)
    msg_count_bot_done = models.IntegerField(default=0)
    msg_count_ccc = models.IntegerField(default=0)
    msg_count_spam = models.IntegerField(default=0)
    msg_count_pending = models.IntegerField(default=0)

    has_cskh_state = models.BooleanField(default=False)
    has_cskh_request = models.BooleanField(default=False)

    state_step = models.CharField(max_length=50, null=True, blank=True)

    contact_info = models.CharField(max_length=255, null=True, blank=True)
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
            models.Index(fields=["session_id"]),
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