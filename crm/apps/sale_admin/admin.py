from django.contrib import admin

from apps.sale_admin.models import (
    SaCallResult,
    SaInterestLevel,
    SaIcpGroup,
    SaRecord,
    SaRecordAuditLog,
)


@admin.register(SaCallResult)
class SaCallResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "result_code",
        "result_name",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active",)
    search_fields = ("result_code", "result_name")
    ordering = ("sort_order", "id")


@admin.register(SaInterestLevel)
class SaInterestLevelAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "level_code",
        "level_name",
        "score",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active",)
    search_fields = ("level_code", "level_name")
    ordering = ("sort_order", "id")


@admin.register(SaIcpGroup)
class SaIcpGroupAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "icp_code",
        "icp_name",
        "icp_type",
        "is_potential",
        "is_active",
        "sort_order",
    )
    list_filter = ("icp_type", "is_potential", "is_active")
    search_fields = ("icp_code", "icp_name", "description")
    ordering = ("sort_order", "id")


@admin.register(SaRecord)
class SaRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "record_code",
        "account_no",
        "customer_name_snapshot",
        "branch_name_snapshot",
        "pic_name_snapshot",
        "call_date",
        "follow_no",
        "call_result",
        "icp_group",
        "reactivation",
        "account_status",
        "vip_classification",
        "data_status",
        "source_system",
    )
    list_filter = (
        "call_date",
        "call_result",
        "interest_level",
        "icp_group",
        "reactivation",
        "introduced_product",
        "support_info",
        "referred_rm",
        "handover_to_broker",
        "account_status",
        "vip_classification",
        "data_status",
        "source_system",
        "branch",
    )
    search_fields = (
        "record_code",
        "account_no",
        "customer_name_snapshot",
        "branch_name_snapshot",
        "pic_name_snapshot",
        "customer__full_name",
        "customer_account__account_number",
        "pic_user__username",
        "pic_user__email",
        "pic_employee__full_name",
        "note",
    )
    readonly_fields = (
        "record_code",
        "created_at",
        "updated_at",
        "created_by_user",
        "updated_by_user",
    )
    autocomplete_fields = (
        "customer_account",
        "customer",
        "company",
        "branch",
        "pic_user",
        "pic_employee",
        "broker_user",
        "broker_employee",
    )
    date_hierarchy = "call_date"
    ordering = ("-call_date", "-id")


@admin.register(SaRecordAuditLog)
class SaRecordAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sa_record",
        "action_type",
        "changed_by_user",
        "changed_at",
        "note",
    )
    list_filter = ("action_type", "changed_at")
    search_fields = (
        "sa_record__record_code",
        "sa_record__account_no",
        "changed_by_user__username",
        "changed_by_user__email",
        "note",
    )
    readonly_fields = (
        "sa_record",
        "action_type",
        "old_data",
        "new_data",
        "changed_fields",
        "changed_by_user",
        "changed_at",
        "note",
    )
    ordering = ("-changed_at", "-id")