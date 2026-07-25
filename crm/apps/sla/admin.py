from django.contrib import admin

from .models import (
    SlaPolicy,
    SlaPolicyTask,
    SlaPolicyTaskDependency,
    SlaBreachReason,
    TicketSlaTracking,
    SlaEscalationRule,
    TicketSlaReminder,
    TicketAlert,
    TicketTask,
    TicketTaskDependency,
    TicketTaskLog,
    TicketOrganizationUnitSlaTracking,
)


@admin.register(SlaPolicy)
class SlaPolicyAdmin(admin.ModelAdmin):
    list_display = ("id", "sla_name", "status", "version", "is_active", "effective_from", "effective_to")
    search_fields = ("sla_name",)
    list_filter = ("status", "is_active", "support_category", "classification", "priority", "organization_unit")


@admin.register(SlaPolicyTask)
class SlaPolicyTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "sla_policy", "task_name", "organization_unit", "default_branch", "standard_minutes", "is_sla_counted", "is_required", "sort_order", "is_active")
    search_fields = ("task_name", "sla_policy__sla_name")
    list_filter = ("sla_policy", "organization_unit", "is_sla_counted", "is_required", "is_active")


@admin.register(SlaPolicyTaskDependency)
class SlaPolicyTaskDependencyAdmin(admin.ModelAdmin):
    list_display = ("id", "sla_policy", "task", "depends_on_task", "dependency_type")
    list_filter = ("sla_policy", "dependency_type")


@admin.register(SlaBreachReason)
class SlaBreachReasonAdmin(admin.ModelAdmin):
    list_display = ("id", "reason_code", "reason_name", "is_active", "sort_order")
    search_fields = ("reason_code", "reason_name")
    list_filter = ("is_active",)


@admin.register(TicketSlaTracking)
class TicketSlaTrackingAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "sla_policy", "sla_status", "resolution_due_at", "breached_at", "breach_reason_submitted")
    search_fields = ("ticket__ticket_code",)
    list_filter = ("sla_status", "sla_policy", "breach_reason_submitted")


@admin.register(SlaEscalationRule)
class SlaEscalationRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "rule_code", "rule_name", "sla_policy", "trigger_type", "recipient_type", "channel", "is_active")
    search_fields = ("rule_code", "rule_name")
    list_filter = ("trigger_type", "recipient_type", "channel", "is_active")


@admin.register(TicketSlaReminder)
class TicketSlaReminderAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "escalation_rule", "recipient_user", "recipient_email", "channel", "status", "sent_at")
    search_fields = ("ticket__ticket_code", "recipient_email")
    list_filter = ("channel", "status")


@admin.register(TicketAlert)
class TicketAlertAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "alert_type", "status", "triggered_at", "resolved_at")
    search_fields = ("ticket__ticket_code", "title")
    list_filter = ("alert_type", "status")


@admin.register(TicketTask)
class TicketTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "task_name", "organization_unit", "branch", "assigned_employee", "task_status", "sla_status", "due_at", "completed_at")
    search_fields = ("ticket__ticket_code", "task_name", "assigned_employee__full_name")
    list_filter = ("organization_unit", "branch", "task_status", "sla_status")


@admin.register(TicketTaskDependency)
class TicketTaskDependencyAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "task", "depends_on_task", "dependency_type")
    list_filter = ("dependency_type",)


@admin.register(TicketTaskLog)
class TicketTaskLogAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "ticket_task", "action_type", "from_status", "to_status", "created_by_user", "created_at")
    search_fields = ("ticket__ticket_code", "ticket_task__task_name", "action_type")
    list_filter = ("action_type",)


@admin.register(TicketOrganizationUnitSlaTracking)
class TicketOrganizationUnitSlaTrackingAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "organization_unit", "branch", "sla_status", "task_count", "completed_task_count", "overdue_task_count")
    list_filter = ("organization_unit", "branch", "sla_status")