from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class EkycRecord(TimeStampedModel):
    CALL_STATUS_CHOICES = [
        ("Nghe máy", "Nghe máy"),
        ("Không nghe máy", "Không nghe máy"),
        ("Thuê bao không tồn tại", "Thuê bao không tồn tại"),
    ]

    CALL_RESULT_CHOICES = [
        ("Khách hàng tắt máy ngang", "Khách hàng tắt máy ngang"),
        ("KH không bấm phím", "KH không bấm phím"),
        ("Khách hàng bấm phím", "Khách hàng bấm phím"),
    ]

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ekyc_records",
    )
    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ekyc_records",
    )

    account_number = models.CharField(max_length=50, db_index=True)
    customer_name = models.CharField(max_length=255, blank=True)
    branch_name = models.CharField(max_length=255, blank=True)
    manager_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)

    call_date = models.DateField(null=True, blank=True, db_index=True)
    follow_count = models.PositiveIntegerField(default=1)

    call_status = models.CharField(
        max_length=50,
        choices=CALL_STATUS_CHOICES,
        blank=True,
        null=True,
        db_index=True,
    )
    call_result = models.CharField(
        max_length=50,
        choices=CALL_RESULT_CHOICES,
        blank=True,
        null=True,
        db_index=True,
    )
    note = models.TextField(null=True, blank=True)
    pic = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="PIC (loại gọi)",
        help_text="Ví dụ: autocall, không gọi, ...",
    )

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ekyc_records",
    )

    class Meta:
        db_table = "ekyc_records"
        ordering = ["-call_date", "-id"]
        indexes = [
            models.Index(fields=["account_number"]),
            models.Index(fields=["call_date"]),
            models.Index(fields=["call_status"]),
            models.Index(fields=["call_result"]),
        ]

    def __str__(self):
        return f"eKYC {self.account_number} - {self.customer_name} ({self.call_date})"
