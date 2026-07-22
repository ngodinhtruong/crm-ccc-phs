from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class TicketSupportCategory(TimeStampedModel):
    category_code = models.CharField(max_length=50, unique=True)
    category_name = models.CharField(max_length=255)

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "ticket_support_categories"

    def __str__(self):
        return self.category_name


class TicketClassification(TimeStampedModel):
    classification_code = models.CharField(max_length=50, unique=True)
    classification_name = models.CharField(max_length=255)

    support_category = models.ForeignKey(
        TicketSupportCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="classifications",
    )

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "ticket_classifications"

    def __str__(self):
        return self.classification_name


class TicketStatus(models.Model):
    status_code = models.CharField(max_length=50, unique=True)
    status_name = models.CharField(max_length=255)

    sort_order = models.IntegerField(null=True, blank=True)
    is_final = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ticket_statuses"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.status_name


class TicketPriority(TimeStampedModel):
    priority_code = models.CharField(max_length=50, unique=True)
    priority_name = models.CharField(max_length=255)

    level_order = models.IntegerField(null=True, blank=True)
    default_sla_minutes = models.IntegerField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ticket_priorities"
        ordering = ["level_order", "id"]

    def __str__(self):
        return self.priority_name


class TicketSource(models.Model):
    source_code = models.CharField(max_length=50, unique=True)
    source_name = models.CharField(max_length=255)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ticket_sources"

    def __str__(self):
        return self.source_name




class TicketErrorGroup(TimeStampedModel):
    group_code = models.CharField(max_length=50, unique=True)
    group_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    related_system = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "ticket_error_groups"
        ordering = ["sort_order", "id"]
        indexes = [
            models.Index(fields=["group_code"]),
            models.Index(fields=["group_name"]),
            models.Index(fields=["related_system"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.group_name


class TicketErrorType(TimeStampedModel):
    group = models.ForeignKey(
        TicketErrorGroup,
        on_delete=models.PROTECT,
        related_name="error_types",
    )
    type_code = models.CharField(max_length=50, unique=True)
    type_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    related_system = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "ticket_error_types"
        ordering = ["group__sort_order", "sort_order", "id"]
        indexes = [
            models.Index(fields=["group"]),
            models.Index(fields=["type_code"]),
            models.Index(fields=["type_name"]),
            models.Index(fields=["related_system"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.type_name


class TicketAccountLinkStatus:
    LINKED = "LINKED"
    UNLINKED = "UNLINKED"

    CHOICES = [
        (LINKED, "Có TK liên kết"),
        (UNLINKED, "Chưa có TK liên kết"),
    ]


class TicketContactType:
    """
    Loại thông tin định danh khách hàng cung cấp cho ticket.

    Dùng chung cho ticket tạo tay lẫn ticket sinh từ chatbot: khách đưa gì thì
    lưu nguyên vào contact_value, contact_type cho biết đó là gì để tra đúng cột
    (số TK → customer_accounts.account_number, SĐT → customers.phone,
    email → customers.email).
    """

    PHONE = "PHONE"
    EMAIL = "EMAIL"
    ACCOUNT = "ACCOUNT"

    CHOICES = [
        (PHONE, "Số điện thoại"),
        (EMAIL, "Email"),
        (ACCOUNT, "Số tài khoản"),
    ]


class Ticket(TimeStampedModel):
    ticket_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255, null=True, blank=True)

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )

    company = models.ForeignKey(
        "customers.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )

    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )

    account_link_status = models.CharField(
        max_length=20,
        choices=TicketAccountLinkStatus.CHOICES,
        default=TicketAccountLinkStatus.UNLINKED,
        db_index=True,
    )

    # Thông tin khách cung cấp, lưu nguyên văn kể cả khi đã tra ra khách hàng —
    # giữ lại để đối chiếu khi nghi ngờ khớp nhầm.
    contact_type = models.CharField(
        max_length=20,
        choices=TicketContactType.CHOICES,
        null=True,
        blank=True,
        db_index=True,
    )
    contact_value = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
    )

    handling_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="handled_tickets",
    )

    assigned_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )

    assigned_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )

    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_tickets",
    )

    owner_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_tickets",
    )

    support_category = models.ForeignKey(
        TicketSupportCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )

    classification = models.ForeignKey(
        TicketClassification,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )

    current_status = models.ForeignKey(
        TicketStatus,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )

    priority = models.ForeignKey(
        TicketPriority,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )

    source = models.ForeignKey(
        TicketSource,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )
    sla_policy = models.ForeignKey(
        "sla.SlaPolicy",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )

    # AUTO / MANUAL
    classification_method = models.CharField(max_length=20, null=True, blank=True)

    source_ref_id = models.CharField(max_length=100, null=True, blank=True)

    error_group = models.ForeignKey(
        TicketErrorGroup,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )

    error_type = models.ForeignKey(
        TicketErrorType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
    )


    error_note = models.TextField(null=True, blank=True)

    # Hệ thống liên quan: BASE / FLEX / APP / CRM / API / CHATBOT / OTHER...
    related_system = models.CharField(max_length=100, null=True, blank=True)

    # Trạng thái ở hệ thống ngoài khi cần đồng bộ Base/API hai chiều.
    external_status = models.CharField(max_length=50, null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)


    request_content = models.TextField(null=True, blank=True)
    handling_solution = models.TextField(null=True, blank=True)
    final_response = models.TextField(null=True, blank=True)

    assigned_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    accepted_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_tickets",
    )

    done_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="done_tickets",
    )

    closed_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_tickets",
    )

    cancelled_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_tickets",
    )

    cancelled_reason = models.TextField(null=True, blank=True)

    is_locked_for_amend = models.BooleanField(default=False)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tickets",
    )

    updated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_tickets",
    )

    class Meta:
        db_table = "tickets"
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_ref_id"],
                condition=(
                    Q(source__isnull=False)
                    & Q(source_ref_id__isnull=False)
                    & ~Q(source_ref_id="")
                ),
                name="uq_ticket_source_source_ref_id",
            )
        ]
        indexes = [
            models.Index(fields=["ticket_code"]),
            models.Index(fields=["customer"]),
            models.Index(fields=["customer_account"]),
            models.Index(fields=["handling_branch"]),
            models.Index(fields=["assigned_employee"]),
            models.Index(fields=["owner_user"]),
            models.Index(fields=["current_status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["source"]),
            models.Index(fields=["error_group"]),
            models.Index(fields=["error_type"]),
            models.Index(fields=["related_system"]),
            models.Index(fields=["external_status"]),
            models.Index(fields=["sla_policy"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.ticket_code


class TicketProcessLog(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="process_logs",
    )

    status = models.ForeignKey(
        TicketStatus,
        on_delete=models.PROTECT,
        related_name="process_logs",
    )

    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_process_logs",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_process_logs",
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_process_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["status"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["start_at"]),
        ]


class TicketAssignment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="assignments",
    )

    from_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_from",
    )

    to_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_to",
    )

    from_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_from",
    )

    to_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_to",
    )

    from_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_from",
    )

    to_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_to",
    )

    assigned_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_assignments_created",
    )

    assigned_at = models.DateTimeField()
    unassigned_at = models.DateTimeField(null=True, blank=True)

    is_current = models.BooleanField(default=True)

    transfer_reason = models.TextField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_assignments"
        constraints = [
            models.UniqueConstraint(
                fields=["ticket"],
                condition=Q(is_current=True),
                name="uq_current_ticket_assignment",
            )
        ]
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["to_branch"]),
            models.Index(fields=["to_unit"]),
            models.Index(fields=["to_employee"]),
            models.Index(fields=["is_current"]),
        ]


class TicketUpdateLog(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="update_logs",
    )

    # UPDATE_STATUS / TRANSFER_UNIT / TRANSFER_BRANCH / ASSIGN_EMPLOYEE / CLOSE / CANCEL
    action_type = models.CharField(max_length=50)

    from_status = models.ForeignKey(
        TicketStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="update_logs_from",
    )

    to_status = models.ForeignKey(
        TicketStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="update_logs_to",
    )

    from_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_from",
    )

    to_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_to",
    )

    from_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_from",
    )

    to_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_to",
    )

    from_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_from",
    )

    to_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_to",
    )

    old_priority = models.ForeignKey(
        TicketPriority,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="update_logs_old",
    )

    new_priority = models.ForeignKey(
        TicketPriority,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="update_logs_new",
    )
    old_sla_policy = models.ForeignKey(
        "sla.SlaPolicy",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_old",
    )

    new_sla_policy = models.ForeignKey(
        "sla.SlaPolicy",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs_new",
    )

    handling_solution = models.TextField(null=True, blank=True)
    send_survey = models.BooleanField(default=False)

    note = models.TextField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_update_logs",
    )

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_update_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["created_at"]),
        ]


class TicketResponse(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    response_content = models.TextField()
    response_content_html = models.TextField(null=True, blank=True)

    responded_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_responses",
    )

    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_responses"


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    comment_content = models.TextField()
    is_internal = models.BooleanField(default=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_comments",
    )

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_comments"


class TicketActivityLog(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )

    action_type = models.CharField(max_length=100)
    action_name = models.CharField(max_length=255, null=True, blank=True)

    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_activity_logs",
    )

    created_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "ticket_activity_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["created_at"]),
        ]


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    file_name = models.CharField(max_length=255, null=True, blank=True)
    file_url = models.TextField(null=True, blank=True)
    file_type = models.CharField(max_length=100, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)

    uploaded_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_attachments",
    )

    uploaded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_attachments"


class TicketFeedback(TimeStampedModel):
    ticket = models.OneToOneField(
        Ticket,
        on_delete=models.CASCADE,
        related_name="feedback",
    )

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_feedbacks",
    )

    survey_sent = models.BooleanField(default=False)

    # NOT_SENT / SENT / RESPONDED
    survey_status = models.CharField(max_length=50, null=True, blank=True)

    rating_score = models.IntegerField(null=True, blank=True)
    rating_note = models.TextField(null=True, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_feedbacks"


class Tag(models.Model):
    tag_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    tag_name = models.CharField(max_length=255)
    color = models.CharField(max_length=50, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tags"

    def __str__(self):
        return self.tag_name


class TicketTag(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="ticket_tags",
    )

    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name="ticket_tags",
    )

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ticket_tags",
    )

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_tags"
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "tag"],
                name="uq_ticket_tag",
            )
        ]


class TicketFollower(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="followers",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followed_tickets",
    )

    followed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_followers"
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "user"],
                name="uq_ticket_follower",
            )
        ]