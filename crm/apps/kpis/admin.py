from django.contrib import admin

from apps.kpis.models import (
    KpiAuditLog,
    KpiGateDefinition,
    KpiGroup,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiProfile,
    KpiRewardTierConfig,
    KpiSection,
    KpiUserGateResult,
    KpiUserMetricResult,
    KpiUserSummary,
    KpiUserTarget,
    TransactionLog,
)


@admin.register(KpiPeriod)
class KpiPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period_code",
        "period_name",
        "period_type",
        "year",
        "month",
        "status",
        "total_weight",
        "start_date",
        "end_date",
    )
    search_fields = ("period_code", "period_name")
    list_filter = ("period_type", "status", "year", "month")
    ordering = ("-year", "-month", "-id")


@admin.register(KpiProfile)
class KpiProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile_code",
        "profile_name",
        "target_role_code",
        "total_weight",
        "sort_order",
        "is_active",
    )
    search_fields = ("period__period_code", "profile_code", "profile_name", "target_role_code")
    list_filter = ("profile_code", "target_role_code", "is_active")
    ordering = ("period_id", "sort_order", "id")


@admin.register(KpiSection)
class KpiSectionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "section_code",
        "section_name",
        "weight_percent",
        "sort_order",
        "is_active",
    )
    search_fields = (
        "period__period_code",
        "profile__profile_code",
        "section_code",
        "section_name",
    )
    list_filter = ("profile__profile_code", "section_code", "is_active")
    ordering = ("period_id", "profile__sort_order", "sort_order", "id")


@admin.register(KpiGroup)
class KpiGroupAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "section",
        "group_code",
        "group_name",
        "group_type",
        "weight_percent",
        "sort_order",
        "is_active",
    )
    search_fields = (
        "period__period_code",
        "profile__profile_code",
        "section__section_code",
        "group_code",
        "group_name",
    )
    list_filter = (
        "profile__profile_code",
        "section__section_code",
        "group_type",
        "is_active",
    )
    ordering = (
        "period_id",
        "profile__sort_order",
        "section__sort_order",
        "sort_order",
        "id",
    )


@admin.register(KpiPeriodMetric)
class KpiPeriodMetricAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "group",
        "metric_code",
        "metric_name",
        "weight_percent",
        "target_value",
        "target_unit",
        "frequency",
        "is_active",
    )
    search_fields = (
        "period__period_code",
        "profile__profile_code",
        "group__group_code",
        "metric_code",
        "metric_name",
        # "work_description",
        "measurement_formula",
        "target_text",
    )
    list_filter = (
        "profile__profile_code",
        "group__section__section_code",
        "group__group_code",
        "is_active",
    )
    ordering = (
        "period_id",
        "profile__sort_order",
        "group__section__sort_order",
        "group__sort_order",
        "metric_code",
        "id",
    )


@admin.register(KpiUserTarget)
class KpiUserTargetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "metric",
        "user",
        "branch",
        "target_value",
        "target_unit",
        "assigned_by_user",
        "assigned_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "employee__full_name",
        "metric__metric_code",
        "metric__metric_name",
    )
    list_filter = ("profile__profile_code", "period", "branch")


@admin.register(KpiUserMetricResult)
class KpiUserMetricResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "metric",
        "user",
        "branch",
        "source_type",
        "actual_value",
        "target_value",
        "score",
        "weighted_score",
        "result_status",
    )
    search_fields = (
        "user__username",
        "user__email",
        "employee__full_name",
        "metric__metric_code",
        "metric__metric_name",
    )
    list_filter = ("profile__profile_code", "source_type", "result_status", "period", "branch")


@admin.register(KpiGateDefinition)
class KpiGateDefinitionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "gate_code",
        "gate_name",
        "formula_key",
        "operator",
        "default_threshold",
        "is_active",
    )
    search_fields = ("gate_code", "gate_name", "formula_key", "description")
    list_filter = ("is_active", "operator")


@admin.register(KpiPeriodGateConfig)
class KpiPeriodGateConfigAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "gate_code",
        "gate_name",
        "operator",
        "threshold_value",
        "is_required",
        "is_active",
    )
    search_fields = ("period__period_code", "profile__profile_code", "gate_code", "gate_name")
    list_filter = ("profile__profile_code", "is_required", "is_active", "operator")


@admin.register(KpiUserGateResult)
class KpiUserGateResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "gate_config",
        "user",
        "branch",
        "actual_value",
        "threshold_value",
        "operator",
        "is_passed",
    )
    search_fields = ("user__username", "user__email", "employee__full_name", "gate_config__gate_code")
    list_filter = ("profile__profile_code", "is_passed", "period", "branch")


@admin.register(KpiRewardTierConfig)
class KpiRewardTierConfigAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "tier_code",
        "tier_name",
        "rank_metric_code",
        "rank_limit",
        "min_total_score",
        "is_active",
    )
    search_fields = ("period__period_code", "profile__profile_code", "tier_code", "tier_name")
    list_filter = ("profile__profile_code", "is_active")


@admin.register(KpiUserSummary)
class KpiUserSummaryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "profile",
        "user",
        "branch",
        "manual_score",
        "auto_score",
        "total_score",
        "all_gates_passed",
        "reward_tier_code",
        "rank_overall",
        "rank_branch",
    )
    search_fields = ("user__username", "user__email", "employee__full_name")
    list_filter = ("profile__profile_code", "all_gates_passed", "reward_tier_code", "period", "branch")


@admin.register(TransactionLog)
class TransactionLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_account",
        "transaction_code",
        "stock_code",
        "transaction_date",
        "order_status",
        "transaction_value",
        "transaction_fee",
        "source_system",
    )

    search_fields = (
        "transaction_code",
        "source_transaction_id",
        "stock_code",
        "customer_account__account_number",
        "customer_account__customer__customer_code",
        "customer_account__customer__full_name",
    )

    list_filter = (
        "order_status",
        "source_system",
        "market",
        "side",
        "transaction_date",
    )


@admin.register(KpiAuditLog)
class KpiAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "period",
        "object_type",
        "object_id",
        "action_type",
        "changed_by_user",
        "changed_at",
    )
    search_fields = ("object_type", "action_type", "changed_by_user__username", "note")
    list_filter = ("action_type", "object_type", "changed_at")
    readonly_fields = (
        "period",
        "object_type",
        "object_id",
        "action_type",
        "old_data",
        "new_data",
        "changed_fields",
        "changed_by_user",
        "changed_at",
        "note",
    )
