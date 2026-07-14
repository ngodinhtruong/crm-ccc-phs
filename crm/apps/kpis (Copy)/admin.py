from django.contrib import admin

from apps.kpis.models import (
    KpiAuditLog,
    KpiGateDefinition,
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
    KpiUserGateResult,
    KpiUserMetricResult,
    KpiUserSummary,
    KpiUserTarget,
    TransactionLog,
)


@admin.register(KpiPeriod)
class KpiPeriodAdmin(admin.ModelAdmin):
    list_display = ("period_code", "period_name", "period_type", "year", "month", "status")
    search_fields = ("period_code", "period_name")
    list_filter = ("period_type", "status", "year")


@admin.register(KpiGroup)
class KpiGroupAdmin(admin.ModelAdmin):
    list_display = ("period", "group_code", "group_name", "group_type", "weight_percent", "is_active")
    search_fields = ("group_code", "group_name")
    list_filter = ("group_type", "is_active")


@admin.register(KpiMetricDefinition)
class KpiMetricDefinitionAdmin(admin.ModelAdmin):
    list_display = ("metric_code", "metric_name", "input_type", "formula_key", "unit", "is_active")
    search_fields = ("metric_code", "metric_name", "formula_key")
    list_filter = ("input_type", "unit", "is_active")


@admin.register(KpiPeriodMetric)
class KpiPeriodMetricAdmin(admin.ModelAdmin):
    list_display = ("period", "group", "metric_code", "metric_name", "input_type", "weight_percent", "is_active")
    search_fields = ("metric_code", "metric_name")
    list_filter = ("input_type", "is_active")


@admin.register(KpiUserTarget)
class KpiUserTargetAdmin(admin.ModelAdmin):
    list_display = ("period", "metric", "user", "branch", "target_value")
    search_fields = ("user__username", "user__email", "metric__metric_code")


@admin.register(KpiUserMetricResult)
class KpiUserMetricResultAdmin(admin.ModelAdmin):
    list_display = ("period", "metric", "user", "branch", "source_type", "actual_value", "score", "weighted_score")
    search_fields = ("user__username", "user__email", "metric__metric_code")
    list_filter = ("source_type", "result_status")


@admin.register(KpiGateDefinition)
class KpiGateDefinitionAdmin(admin.ModelAdmin):
    list_display = ("gate_code", "gate_name", "formula_key", "operator", "default_threshold", "is_active")
    search_fields = ("gate_code", "gate_name", "formula_key")
    list_filter = ("is_active",)


@admin.register(KpiPeriodGateConfig)
class KpiPeriodGateConfigAdmin(admin.ModelAdmin):
    list_display = ("period", "gate_code", "gate_name", "operator", "threshold_value", "is_required", "is_active")
    search_fields = ("gate_code", "gate_name")
    list_filter = ("is_required", "is_active")


@admin.register(KpiUserGateResult)
class KpiUserGateResultAdmin(admin.ModelAdmin):
    list_display = ("period", "gate_config", "user", "branch", "actual_value", "threshold_value", "operator", "is_passed")
    search_fields = ("user__username", "user__email", "gate_config__gate_code")
    list_filter = ("is_passed",)


@admin.register(KpiRewardTierConfig)
class KpiRewardTierConfigAdmin(admin.ModelAdmin):
    list_display = ("period", "tier_code", "tier_name", "rank_metric_code", "rank_limit", "min_total_score", "is_active")
    search_fields = ("tier_code", "tier_name")
    list_filter = ("is_active",)


@admin.register(KpiUserSummary)
class KpiUserSummaryAdmin(admin.ModelAdmin):
    list_display = ("period", "user", "branch", "manual_score", "auto_score", "total_score", "all_gates_passed", "reward_tier_code")
    search_fields = ("user__username", "user__email")
    list_filter = ("all_gates_passed", "reward_tier_code")


@admin.register(TransactionLog)
class TransactionLogAdmin(admin.ModelAdmin):
    list_display = ("account_no", "transaction_date", "order_status", "transaction_value", "transaction_fee", "source_system")
    search_fields = ("account_no", "source_transaction_id")
    list_filter = ("order_status", "source_system")


@admin.register(KpiAuditLog)
class KpiAuditLogAdmin(admin.ModelAdmin):
    list_display = ("period", "object_type", "object_id", "action_type", "changed_by_user", "changed_at")
    search_fields = ("object_type", "action_type", "changed_by_user__username")
    list_filter = ("action_type", "object_type")