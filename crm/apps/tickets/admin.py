from django.contrib import admin

from .models import (
    TicketSupportCategory,
    TicketClassification,
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketErrorGroup,
    TicketErrorType,
    Ticket,
    TicketProcessLog,
    TicketAssignment,
    TicketUpdateLog,
    TicketResponse,
    TicketComment,
    TicketActivityLog,
    TicketAttachment,
    TicketFeedback,
    Tag,
    TicketTag,
    TicketFollower,
)


@admin.register(TicketSupportCategory)
class TicketSupportCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "category_code", "category_name", "parent", "is_active", "sort_order")
    search_fields = ("category_code", "category_name")
    list_filter = ("is_active",)


@admin.register(TicketClassification)
class TicketClassificationAdmin(admin.ModelAdmin):
    list_display = ("id", "classification_code", "classification_name", "support_category", "is_active", "sort_order")
    search_fields = ("classification_code", "classification_name")
    list_filter = ("support_category", "is_active")


@admin.register(TicketStatus)
class TicketStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "status_code", "status_name", "sort_order", "is_final", "is_active")
    search_fields = ("status_code", "status_name")
    list_filter = ("is_final", "is_active")


@admin.register(TicketPriority)
class TicketPriorityAdmin(admin.ModelAdmin):
    list_display = ("id", "priority_code", "priority_name", "level_order", "default_sla_minutes", "is_active")
    search_fields = ("priority_code", "priority_name")
    list_filter = ("is_active",)


@admin.register(TicketSource)
class TicketSourceAdmin(admin.ModelAdmin):
    list_display = ("id", "source_code", "source_name", "is_active")
    search_fields = ("source_code", "source_name")
    list_filter = ("is_active",)




@admin.register(TicketErrorGroup)
class TicketErrorGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "group_code", "group_name", "related_system", "is_active", "sort_order")
    search_fields = ("group_code", "group_name", "description", "related_system")
    list_filter = ("related_system", "is_active")


@admin.register(TicketErrorType)
class TicketErrorTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "type_code", "type_name", "group", "related_system", "is_active", "sort_order")
    search_fields = ("type_code", "type_name", "description", "group__group_name", "related_system")
    list_filter = ("group", "related_system", "is_active")



@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "ticket_code",
        "title",
        "customer",
        "customer_account",
        "account_link_status",
        "raw_account_number",
        "handling_branch",
        "assigned_unit",
        "assigned_employee",
        "owner_user",
        "current_status",
        "priority",
        "error_group",
        "error_type",
        "sla_policy",
        "created_at",
    )
    search_fields = (
        "ticket_code",
        "title",
        "customer__full_name",
        "customer__customer_code",
        "customer_account__account_number",
        "raw_account_number",
        "error_group__group_name",
        "error_type__type_name",
        "error_note",
        "related_system",
        "source_ref_id",
    )
    list_filter = (
        "handling_branch",
        "assigned_unit",
        "current_status",
        "priority",
        "source",
        "account_link_status",
        "sla_policy",
        "error_group",
        "error_type",
        "related_system",
        "external_status",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(TicketProcessLog)
class TicketProcessLogAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "status", "employee", "user", "start_at", "end_at", "duration_minutes")
    search_fields = ("ticket__ticket_code", "employee__full_name", "user__email")
    list_filter = ("status",)


@admin.register(TicketAssignment)
class TicketAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "to_branch", "to_unit", "to_employee", "assigned_by_user", "assigned_at", "unassigned_at", "is_current")
    search_fields = ("ticket__ticket_code", "to_employee__full_name")
    list_filter = ("to_branch", "to_unit", "is_current")


@admin.register(TicketUpdateLog)
class TicketUpdateLogAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "action_type", "from_status", "to_status", "created_by_user", "created_at")
    search_fields = ("ticket__ticket_code", "action_type")
    list_filter = ("action_type", "from_status", "to_status")


admin.site.register(TicketResponse)
admin.site.register(TicketComment)
admin.site.register(TicketActivityLog)
admin.site.register(TicketAttachment)
admin.site.register(TicketFeedback)
admin.site.register(Tag)
admin.site.register(TicketTag)
admin.site.register(TicketFollower)