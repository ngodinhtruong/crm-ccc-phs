from django.contrib import admin
from apps.ekyc.models import EkycRecord


@admin.register(EkycRecord)
class EkycRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "account_number",
        "customer_name",
        "branch_name",
        "manager_name",
        "phone",
        "call_date",
        "follow_count",
        "call_status",
        "call_result",
        "created_at",
    )
    list_filter = ("call_status", "call_result", "call_date", "branch_name")
    search_fields = (
        "account_number",
        "customer_name",
        "phone",
        "branch_name",
        "manager_name",
    )
    ordering = ("-call_date", "-id")
