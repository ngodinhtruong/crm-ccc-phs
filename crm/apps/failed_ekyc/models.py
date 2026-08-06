from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class FailedEkycRecord(TimeStampedModel):
    STEP_CHOICES = [
        ("EKYC", "EKYC"),
        ("UPDATE_PASSWORD", "UPDATE_PASSWORD"),
        ("REGISTER_SERVICE", "REGISTER_SERVICE"),
        ("VERIFY_OPEN_ACCOUNT", "VERIFY_OPEN_ACCOUNT"),
        ("UPDATE_INFO", "UPDATE_INFO"),
    ]
    CALL_STATUS_CHOICES = [
        ("KHÔNG CALL", "KHÔNG CALL"),
        ("Nghe máy", "Nghe máy"),
        ("Không nghe máy", "Không nghe máy"),
        ("Thuê bao/Số không tồn tại", "Thuê bao/Số không tồn tại"),
    ]
    CALL_RESULT_CHOICES = [
        ("Thành công", "Thành công"),
        ("KH cần thử lại", "KH cần thử lại"),
        ("Không thành công", "Không thành công"),
    ]

    step = models.CharField(max_length=50, choices=STEP_CHOICES, default="EKYC", db_index=True)
    branch_name = models.CharField(max_length=255, blank=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.SET_NULL, null=True, blank=True, related_name="failed_ekyc_records")
    customer_account = models.ForeignKey("customers.CustomerAccount", on_delete=models.SET_NULL, null=True, blank=True, related_name="failed_ekyc_records")
    account_number = models.CharField(max_length=50, blank=True, db_index=True)
    customer_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    failed_at = models.DateField(null=True, blank=True, db_index=True)
    error_message = models.TextField(blank=True)
    pic = models.CharField(max_length=100, blank=True, db_index=True)
    call_date = models.DateField(null=True, blank=True, db_index=True)
    follow_count = models.PositiveIntegerField(default=0)
    call_status = models.CharField(max_length=100, choices=CALL_STATUS_CHOICES, blank=True, db_index=True)
    call_result = models.CharField(max_length=100, choices=CALL_RESULT_CHOICES, blank=True, db_index=True)
    cs_comment = models.TextField(blank=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_failed_ekyc_records")

    class Meta:
        db_table = "failed_ekyc_records"
        ordering = ["-failed_at", "-id"]
        permissions = [
            ("import_failedekycrecord", "Can import failed eKYC records"),
            ("export_failedekycrecord", "Can export failed eKYC records"),
            ("view_failedekycdashboard", "Can view failed eKYC dashboard"),
        ]

    def __str__(self):
        return f"Failed eKYC {self.step} - {self.account_number or self.phone or self.id}"
