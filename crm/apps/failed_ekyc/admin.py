from django.contrib import admin

from apps.failed_ekyc.models import FailedEkycRecord


@admin.register(FailedEkycRecord)
class FailedEkycRecordAdmin(admin.ModelAdmin):
    list_display = ("step", "account_number", "phone", "failed_at", "pic", "call_status", "call_result")
    list_filter = ("step", "call_status", "call_result", "failed_at")
    search_fields = ("account_number", "customer_name", "email", "phone", "error_message")
