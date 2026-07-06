from django.contrib import admin

from .models import CallLog, CallAccessLog


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "customer", "employee", "branch", "call_time", "duration_seconds", "call_direction", "source_system")
    search_fields = ("ticket__ticket_code", "customer__full_name", "employee__full_name", "phone_number", "external_call_id")
    list_filter = ("branch", "call_direction", "source_system", "call_time")


@admin.register(CallAccessLog)
class CallAccessLogAdmin(admin.ModelAdmin):
    list_display = ("id", "call_log", "user", "action_type", "accessed_at")
    search_fields = ("user__email", "user__username", "call_log__external_call_id")
    list_filter = ("action_type", "accessed_at")