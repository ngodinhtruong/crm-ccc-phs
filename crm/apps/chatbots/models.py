from django.conf import settings
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

    # Ticket sinh ra ở bảng TicketChatbot riêng (luồng mới). Giữ song song với
    # ticket cũ để không phá dữ liệu/luồng đã có.
    ticket_chatbot = models.ForeignKey(
        "chatbots.TicketChatbot",
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


class TicketChatbot(TimeStampedModel):
    """
    Ticket sinh ra từ phiên chatbot (luồng chuyển CCC).

    Tách riêng khỏi bảng Ticket chung vì dữ liệu từ chatbot rất thiếu:
    khách chỉ cho số điện thoại HOẶC số tài khoản, có khi không tra ra
    khách hàng, chưa có người xử lý. Nên gần như mọi cột đều cho phép null.
    """

    # --- Trạng thái xử lý (dùng CHUNG mã với ticket thường) ---
    STATUS_CHO_TIEP_NHAN = "CREATED"        # Mở (ban đầu, chưa ai nhận)
    STATUS_TIEP_NHAN = "ACCEPTED"           # Tiếp nhận
    STATUS_DANG_XU_LY = "PROCESSING"        # Đang xử lý
    STATUS_DA_XONG = "DONE_WAIT_CLOSE"      # Đã xong (đếm 1h trước khi tự đóng)
    STATUS_CHO_DONG = "PENDING_CLOSE"       # Chờ đóng
    STATUS_DA_DONG = "CLOSED"               # Đã đóng (khóa)

    # Giữ tên cũ trỏ tới mã mới để code cũ không vỡ
    STATUS_CHUYEN_PHONG_BAN = STATUS_DANG_XU_LY
    STATUS_CHO_HUY = STATUS_CHO_DONG

    STATUS_CHOICES = [
        (STATUS_CHO_TIEP_NHAN, "Mở"),
        (STATUS_TIEP_NHAN, "Tiếp nhận"),
        (STATUS_DANG_XU_LY, "Đang xử lý"),
        (STATUS_DA_XONG, "Đã xong"),
        (STATUS_CHO_DONG, "Chờ đóng"),
        (STATUS_DA_DONG, "Đã đóng"),
    ]

    # --- Trạng thái liên kết khách hàng ---
    LINK_LINKED = "LINKED"
    LINK_UNLINKED = "UNLINKED"

    LINK_STATUS_CHOICES = [
        (LINK_LINKED, "Đã liên kết KH"),
        (LINK_UNLINKED, "Chưa có TK liên kết"),
    ]

    # --- Định danh ---
    ticket_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255, null=True, blank=True)

    # Nối về phiên chat gốc; source_ref_id = session_id để chống tạo trùng
    source_ref_id = models.CharField(max_length=100, null=True, blank=True)

    # --- Thông tin liên hệ (lưu thô) ---
    contact_info = models.CharField(max_length=255, null=True, blank=True)
    contact_type = models.CharField(max_length=50, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    account_number = models.CharField(max_length=50, null=True, blank=True)

    # --- Nối mềm khách hàng (có thì gắn, không thì để trống) ---
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )
    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )
    link_status = models.CharField(
        max_length=20,
        choices=LINK_STATUS_CHOICES,
        default=LINK_UNLINKED,
    )

    # --- Nội dung ---
    dashboard_category = models.CharField(max_length=255, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    request_content = models.TextField(null=True, blank=True)
    full_conversation = models.TextField(null=True, blank=True)
    handling_solution = models.TextField(null=True, blank=True)

    # --- Xử lý / phân công ---
    # Tình trạng ticket → khóa ngoại tới danh mục chung ticket_statuses
    current_status = models.ForeignKey(
        "tickets.TicketStatus",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )
    channel = models.CharField(max_length=50, null=True, blank=True)

    # Người nhận xử lý (SA) — null = chưa ai nhận, nằm hàng chờ chung
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_chatbot_tickets",
    )
    # Hồ sơ nhân viên tương ứng (tùy chọn, cho báo cáo)
    assigned_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_chatbot_tickets",
    )
    handling_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_chatbot_tickets",
    )
    # Đơn vị/tổ xử lý (Phân công xử lý)
    assigned_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_chatbot_tickets",
    )

    # --- SLA & ưu tiên (dùng chung bảng gốc với ticket thường) ---
    sla_policy = models.ForeignKey(
        "sla.SlaPolicy",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )
    priority = models.ForeignKey(
        "tickets.TicketPriority",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )

    # Có gửi khảo sát cho khách không
    send_survey = models.BooleanField(default=False)

    # --- Đồng hồ SLA ---
    # TicketSlaTracking khóa ngoại cứng tới tickets.Ticket nên không dùng lại được.
    # Bảng chatbot tách riêng → lưu deadline ngay tại đây cho gọn.
    SLA_ON_TIME = "ON_TIME"
    SLA_OVERDUE = "OVERDUE"
    SLA_PROCESSING = "PROCESSING"

    SLA_STATUS_CHOICES = [
        (SLA_ON_TIME, "Đúng hạn"),
        (SLA_OVERDUE, "Quá hạn"),
        (SLA_PROCESSING, "Đang xử lý"),
    ]

    sla_status = models.CharField(
        max_length=30,
        choices=SLA_STATUS_CHOICES,
        null=True,
        blank=True,
        db_index=True,
    )

    response_due_at = models.DateTimeField(null=True, blank=True)
    assignment_due_at = models.DateTimeField(null=True, blank=True)
    processing_due_at = models.DateTimeField(null=True, blank=True)
    resolution_due_at = models.DateTimeField(null=True, blank=True)

    breached_at = models.DateTimeField(null=True, blank=True)
    breach_reason = models.ForeignKey(
        "sla.SlaBreachReason",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_tickets",
    )
    breach_note = models.TextField(null=True, blank=True)
    breach_reason_submitted = models.BooleanField(default=False)

    # --- Mốc thời gian ---
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_chatbot_tickets",
    )
    done_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "ticket_chatbots"
        constraints = [
            models.UniqueConstraint(
                fields=["source_ref_id"],
                condition=(
                    models.Q(source_ref_id__isnull=False)
                    & ~models.Q(source_ref_id="")
                ),
                name="uq_ticket_chatbot_source_ref_id",
            )
        ]
        indexes = [
            models.Index(fields=["ticket_code"]),
            models.Index(fields=["current_status"]),
            models.Index(fields=["owner_user"]),
            models.Index(fields=["link_status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.ticket_code

    @property
    def status_code(self):
        """Mã trạng thái (CHO_TIEP_NHAN...) — tiện dùng lại như status text cũ."""
        return self.current_status.status_code if self.current_status else ""

    @property
    def status_label(self):
        return self.current_status.status_name if self.current_status else ""

    @classmethod
    def get_status(cls, code):
        """Lấy TicketStatus theo mã (đã seed sẵn 6 trạng thái workflow CCC)."""
        from apps.tickets.models import TicketStatus

        return TicketStatus.objects.filter(status_code=code).first()

    def apply_sla_policy(self, policy=None, save=True):
        """
        Tính lại deadline 4 mốc từ chính sách SLA. Gọi khi tạo ticket hoặc đổi policy.
        Mốc tính từ thời điểm áp policy (giống TicketSlaTracking của ticket thường).
        """
        from datetime import timedelta
        from django.utils import timezone

        policy = policy or self.sla_policy

        if not policy:
            return

        now = timezone.now()
        minutes = lambda m: now + timedelta(minutes=m) if m is not None else None

        self.sla_policy = policy
        self.response_due_at = minutes(policy.response_time_minutes)
        self.assignment_due_at = minutes(policy.assignment_time_minutes)
        self.processing_due_at = minutes(policy.processing_time_minutes)
        self.resolution_due_at = minutes(policy.resolution_time_minutes)
        self.sla_status = self.SLA_PROCESSING
        self.breached_at = None
        self.updated_at = now

        if save:
            self.save(
                update_fields=[
                    "sla_policy",
                    "response_due_at",
                    "assignment_due_at",
                    "processing_due_at",
                    "resolution_due_at",
                    "sla_status",
                    "breached_at",
                    "updated_at",
                ]
            )

    @property
    def is_sla_overdue(self):
        """Quá hạn = đã đánh dấu OVERDUE, hoặc đã qua hạn hoàn tất."""
        from django.utils import timezone

        if self.sla_status == self.SLA_OVERDUE or self.breached_at:
            return True

        if self.resolution_due_at and timezone.now() > self.resolution_due_at:
            return True

        return False

class TicketChatbotActivityLog(models.Model):
    """
    Lịch sử thay đổi của ticket chatbot: đổi field gì, từ → đến, ai đổi, khi nào.
    Song song với TicketActivityLog của ticket thường.
    """

    ticket = models.ForeignKey(
        TicketChatbot,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )

    # CREATE / AMEND / UPDATE_STATUS / ASSIGN / CLAIM
    action_type = models.CharField(max_length=50)
    action_name = models.CharField(max_length=255, null=True, blank=True)

    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chatbot_ticket_activity_logs",
    )

    created_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "ticket_chatbot_activity_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["created_at"]),
        ]
