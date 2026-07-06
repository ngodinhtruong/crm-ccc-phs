from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class SlaPolicy(TimeStampedModel):
    sla_code = models.CharField(max_length=50, unique=True)
    sla_name = models.CharField(max_length=255)

    support_category = models.ForeignKey(
        "tickets.TicketSupportCategory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    classification = models.ForeignKey(
        "tickets.TicketClassification",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    priority = models.ForeignKey(
        "tickets.TicketPriority",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    processing_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    customer_type = models.ForeignKey(
        "customers.CustomerType",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policies",
    )

    response_time_minutes = models.IntegerField(null=True, blank=True)
    assignment_time_minutes = models.IntegerField(null=True, blank=True)
    processing_time_minutes = models.IntegerField(null=True, blank=True)
    resolution_time_minutes = models.IntegerField(null=True, blank=True)

    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # DRAFT / PENDING_APPROVAL / ACTIVE / INACTIVE / REJECTED
    status = models.CharField(max_length=50, default="DRAFT")

    version = models.IntegerField(default=1)

    parent_sla_policy = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="versions",
    )

    effective_from = models.DateTimeField(null=True, blank=True)
    effective_to = models.DateTimeField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sla_policies",
    )

    activated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activated_sla_policies",
    )

    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sla_policies"
        indexes = [
            models.Index(fields=["support_category"]),
            models.Index(fields=["classification"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["processing_unit"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["customer_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.sla_name


class SlaPolicyTask(TimeStampedModel):
    sla_policy = models.ForeignKey(
        SlaPolicy,
        on_delete=models.CASCADE,
        related_name="policy_tasks",
    )

    task_name = models.CharField(max_length=255)
    task_description = models.TextField(null=True, blank=True)

    processing_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policy_tasks",
    )

    default_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sla_policy_tasks",
    )

    # FIXED_BRANCH / TICKET_BRANCH / CUSTOMER_BRANCH / MANUAL_SELECT
    branch_resolve_type = models.CharField(max_length=50, null=True, blank=True)

    standard_minutes = models.IntegerField(null=True, blank=True)

    is_sla_counted = models.BooleanField(default=True)
    is_required = models.BooleanField(default=True)

    sort_order = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sla_policy_tasks"
        indexes = [
            models.Index(fields=["sla_policy"]),
            models.Index(fields=["processing_unit"]),
            models.Index(fields=["default_branch"]),
            models.Index(fields=["sort_order"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.task_name


class SlaPolicyTaskDependency(models.Model):
    sla_policy = models.ForeignKey(
        SlaPolicy,
        on_delete=models.CASCADE,
        related_name="task_dependencies",
    )

    task = models.ForeignKey(
        SlaPolicyTask,
        on_delete=models.CASCADE,
        related_name="dependency_targets",
    )

    depends_on_task = models.ForeignKey(
        SlaPolicyTask,
        on_delete=models.CASCADE,
        related_name="dependency_sources",
    )

    # FINISH_TO_START / START_TO_START
    dependency_type = models.CharField(max_length=50, default="FINISH_TO_START")

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sla_policy_task_dependencies"
        constraints = [
            models.UniqueConstraint(
                fields=["sla_policy", "task", "depends_on_task"],
                name="uq_sla_policy_task_dependency",
            ),
            models.CheckConstraint(
                condition=~Q(task=models.F("depends_on_task")),
                name="ck_sla_policy_task_not_self_dependent",
            ),
        ]
        indexes = [
            models.Index(fields=["sla_policy"]),
            models.Index(fields=["task"]),
            models.Index(fields=["depends_on_task"]),
        ]


class SlaBreachReason(TimeStampedModel):
    reason_code = models.CharField(max_length=50, unique=True)
    reason_name = models.CharField(max_length=255)

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "sla_breach_reasons"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.reason_name


class TicketSlaTracking(TimeStampedModel):
    ticket = models.OneToOneField(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="sla_tracking",
    )

    sla_policy = models.ForeignKey(
        SlaPolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_trackings",
    )

    assigned_at = models.DateTimeField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    response_due_at = models.DateTimeField(null=True, blank=True)
    assignment_due_at = models.DateTimeField(null=True, blank=True)
    processing_due_at = models.DateTimeField(null=True, blank=True)
    resolution_due_at = models.DateTimeField(null=True, blank=True)

    breached_at = models.DateTimeField(null=True, blank=True)

    standard_response_minutes = models.IntegerField(null=True, blank=True)
    standard_assignment_minutes = models.IntegerField(null=True, blank=True)
    standard_processing_minutes = models.IntegerField(null=True, blank=True)
    standard_resolution_minutes = models.IntegerField(null=True, blank=True)

    waiting_assignment_minutes = models.IntegerField(null=True, blank=True)
    waiting_processing_minutes = models.IntegerField(null=True, blank=True)
    processing_minutes = models.IntegerField(null=True, blank=True)
    total_minutes = models.IntegerField(null=True, blank=True)

    # ON_TIME / OVERDUE / PROCESSING
    sla_status = models.CharField(max_length=30, null=True, blank=True)

    breach_reason = models.ForeignKey(
        SlaBreachReason,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_sla_trackings",
    )

    breach_note = models.TextField(null=True, blank=True)
    breach_reason_submitted = models.BooleanField(default=False)

    class Meta:
        db_table = "ticket_sla_tracking"
        indexes = [
            models.Index(fields=["sla_policy"]),
            models.Index(fields=["sla_status"]),
            models.Index(fields=["resolution_due_at"]),
            models.Index(fields=["breached_at"]),
        ]

    def __str__(self):
        return f"SLA tracking - {self.ticket}"


class SlaEscalationRule(TimeStampedModel):
    rule_code = models.CharField(max_length=50, unique=True)
    rule_name = models.CharField(max_length=255)

    sla_policy = models.ForeignKey(
        SlaPolicy,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="escalation_rules",
    )

    # OVERDUE_IMMEDIATE / OVERDUE_AFTER_MINUTES / DAILY_UNTIL_CLOSED
    trigger_type = models.CharField(max_length=50)

    trigger_after_minutes = models.IntegerField(default=0)
    repeat_interval_minutes = models.IntegerField(null=True, blank=True)

    # ASSIGNED_EMPLOYEE / MANAGER / HEAD / BOM / FOLLOWERS
    recipient_type = models.CharField(max_length=50)

    # IN_APP / EMAIL / BOTH
    channel = models.CharField(max_length=50)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sla_escalation_rules"
        indexes = [
            models.Index(fields=["sla_policy"]),
            models.Index(fields=["trigger_type"]),
            models.Index(fields=["recipient_type"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.rule_name


class TicketSlaReminder(models.Model):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="sla_reminders",
    )

    sla_tracking = models.ForeignKey(
        TicketSlaTracking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reminders",
    )

    escalation_rule = models.ForeignKey(
        SlaEscalationRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_reminders",
    )

    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sla_reminders",
    )

    recipient_email = models.EmailField(max_length=255, null=True, blank=True)

    # IN_APP / EMAIL
    channel = models.CharField(max_length=50, null=True, blank=True)

    # PENDING / SENT / FAILED
    status = models.CharField(max_length=50, null=True, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_sla_reminders"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["escalation_rule"]),
            models.Index(fields=["recipient_user"]),
            models.Index(fields=["sent_at"]),
        ]


class TicketAlert(TimeStampedModel):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="alerts",
    )

    # SLA_OVERDUE / SLA_72H_OVERDUE / HIGH_PRIORITY
    alert_type = models.CharField(max_length=50)

    title = models.CharField(max_length=255, null=True, blank=True)
    content = models.TextField(null=True, blank=True)

    # ACTIVE / RESOLVED
    status = models.CharField(max_length=50, default="ACTIVE")

    triggered_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_alerts"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["alert_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["triggered_at"]),
        ]


class TicketTask(TimeStampedModel):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="tasks",
    )

    sla_policy_task = models.ForeignKey(
        SlaPolicyTask,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_tasks",
    )

    task_name = models.CharField(max_length=255)
    task_description = models.TextField(null=True, blank=True)

    processing_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ticket_tasks",
    )

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ticket_tasks",
    )

    assigned_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_tasks",
    )

    # PENDING / READY / ASSIGNED / IN_PROGRESS / DONE / CANCELLED / SKIPPED
    task_status = models.CharField(max_length=50, default="PENDING")

    is_required = models.BooleanField(default=True)
    is_sla_counted = models.BooleanField(default=True)

    standard_minutes = models.IntegerField(null=True, blank=True)
    actual_minutes = models.IntegerField(null=True, blank=True)

    # ON_TIME / OVERDUE / PROCESSING
    sla_status = models.CharField(max_length=30, null=True, blank=True)

    start_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ticket_tasks",
    )

    class Meta:
        db_table = "ticket_tasks"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["processing_unit"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["assigned_employee"]),
            models.Index(fields=["task_status"]),
            models.Index(fields=["sla_status"]),
        ]

    def __str__(self):
        return self.task_name


class TicketTaskDependency(models.Model):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="task_dependencies",
    )

    task = models.ForeignKey(
        TicketTask,
        on_delete=models.CASCADE,
        related_name="dependency_targets",
    )

    depends_on_task = models.ForeignKey(
        TicketTask,
        on_delete=models.CASCADE,
        related_name="dependency_sources",
    )

    # FINISH_TO_START / START_TO_START
    dependency_type = models.CharField(max_length=50, default="FINISH_TO_START")

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_task_dependencies"
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "task", "depends_on_task"],
                name="uq_ticket_task_dependency",
            ),
            models.CheckConstraint(
                condition=~Q(task=models.F("depends_on_task")),
                name="ck_ticket_task_not_self_dependent",
            ),
        ]
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["task"]),
            models.Index(fields=["depends_on_task"]),
        ]


class TicketTaskLog(models.Model):
    ticket_task = models.ForeignKey(
        TicketTask,
        on_delete=models.CASCADE,
        related_name="logs",
    )

    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="task_logs",
    )

    # ASSIGN / START / COMPLETE / REASSIGN / CANCEL / SKIP / UPDATE_STATUS
    action_type = models.CharField(max_length=50)

    from_status = models.CharField(max_length=50, null=True, blank=True)
    to_status = models.CharField(max_length=50, null=True, blank=True)

    from_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_task_logs_from",
    )

    to_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_task_logs_to",
    )

    note = models.TextField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_task_logs",
    )

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_task_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["ticket_task"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["created_at"]),
        ]


class TicketDepartmentSlaTracking(TimeStampedModel):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        related_name="department_sla_trackings",
    )

    processing_unit = models.ForeignKey(
        "branches.ProcessingUnit",
        on_delete=models.CASCADE,
        related_name="department_sla_trackings",
    )

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="department_sla_trackings",
    )

    total_standard_minutes = models.IntegerField(null=True, blank=True)
    total_actual_minutes = models.IntegerField(null=True, blank=True)

    task_count = models.IntegerField(default=0)
    completed_task_count = models.IntegerField(default=0)
    overdue_task_count = models.IntegerField(default=0)

    # ON_TIME / OVERDUE / PROCESSING
    sla_status = models.CharField(max_length=30, null=True, blank=True)

    breached_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ticket_department_sla_tracking"
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "processing_unit", "branch"],
                name="uq_ticket_department_sla_tracking",
            )
        ]
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["processing_unit"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["sla_status"]),
        ]

    def __str__(self):
        return f"{self.ticket} - {self.processing_unit}"