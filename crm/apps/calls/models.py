from django.conf import settings
from django.db import models


class CallLog(models.Model):
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
    )

    call_time = models.DateTimeField()
    duration_seconds = models.IntegerField(null=True, blank=True)

    # INBOUND / OUTBOUND
    call_direction = models.CharField(max_length=50, null=True, blank=True)

    phone_number = models.CharField(max_length=50, null=True, blank=True)

    recording_url = models.TextField(null=True, blank=True)
    recording_file_name = models.CharField(max_length=255, null=True, blank=True)

    # CRM / CLOUDGO / CALL_CENTER
    source_system = models.CharField(max_length=50, null=True, blank=True)
    external_call_id = models.CharField(max_length=100, null=True, blank=True)

    note = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "call_logs"
        indexes = [
            models.Index(fields=["ticket"]),
            models.Index(fields=["customer"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["call_time"]),
        ]

    def __str__(self):
        return f"{self.phone_number or ''} - {self.call_time}"


class CallAccessLog(models.Model):
    call_log = models.ForeignKey(
        CallLog,
        on_delete=models.CASCADE,
        related_name="access_logs",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="call_access_logs",
    )

    # VIEW / LISTEN
    action_type = models.CharField(max_length=50)

    accessed_at = models.DateTimeField(null=True, blank=True)

    ip_address = models.CharField(max_length=100, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "call_access_logs"
        indexes = [
            models.Index(fields=["call_log"]),
            models.Index(fields=["user"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["accessed_at"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.call_log} - {self.action_type}"