from django.contrib import admin

from apps.external_errors.models import (
    ExternalErrorCauseGroup,
    ExternalErrorClassificationLog,
    ExternalErrorDashboardWidget,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
    ExternalErrorCode,
    ExternalErrorGroup,
)


@admin.register(ExternalErrorGroup)
class ExternalErrorGroupAdmin(admin.ModelAdmin):
    list_display = (
        "group_code",
        "group_name",
        "error_code_count",
        "is_active",
        "sort_order",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "group_code",
        "group_name",
        "description",
    )

    ordering = (
        "sort_order",
        "id",
    )

    list_editable = (
        "is_active",
        "sort_order",
    )

    @admin.display(description="Số mã lỗi")
    def error_code_count(self, obj):
        return obj.error_codes.count()


@admin.register(ExternalErrorCode)
class ExternalErrorCodeAdmin(admin.ModelAdmin):
    list_display = (
        "error_code",
        "error_name",
        "group",
        "is_active",
        "sort_order",
    )

    list_filter = (
        "is_active",
        "group",
    )

    search_fields = (
        "error_code",
        "error_name",
        "description",
        "group__group_code",
        "group__group_name",
    )

    autocomplete_fields = (
        "group",
    )

    ordering = (
        "group__sort_order",
        "sort_order",
        "id",
    )

    list_editable = (
        "is_active",
        "sort_order",
    )




@admin.register(ExternalErrorCauseGroup)
class ExternalErrorCauseGroupAdmin(admin.ModelAdmin):
    list_display = (
        "cause_code",
        "cause_name",
        "record_count",
        "is_active",
        "sort_order",
    )
    list_filter = ("is_active",)
    search_fields = (
        "cause_code",
        "cause_name",
        "description",
    )
    ordering = ("sort_order", "id")
    list_editable = ("is_active", "sort_order")

    @admin.display(description="Số record")
    def record_count(self, obj):
        return obj.records.count()


@admin.register(ExternalErrorImportBatch)
class ExternalErrorImportBatchAdmin(admin.ModelAdmin):
    list_display = ["batch_code", "file_name", "source_type", "total_rows", "classified_rows", "failed_rows", "status", "created_at"]
    list_filter = ["source_type", "status", "created_at"]
    search_fields = ["batch_code", "file_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ExternalErrorRecord)
class ExternalErrorRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "received_date",
        "completed_date",
        "error_group_display",
        "error_code_display",
        "cause_group_display",
        "classification_status",
        "cause_classification_status",
        "classification_confidence",
        "need_review",
    )

    list_filter = (
        "classification_status",
        "need_review",
        "error_code__group",
        "error_code",
        "cause_group",
        "cause_classification_status",
        "cause_need_review",
        "received_date",
        "completed_date",
    )

    search_fields = (
        "raw_content",
        "clean_content",
        "normalized_issue",
        "normalized_cause",
        "raw_cause",
        "clean_cause",
        "cause_group__cause_code",
        "cause_group__cause_name",
        "raw_source",
        "raw_device",
        "error_code__error_code",
        "error_code__error_name",
        "error_code__group__group_code",
        "error_code__group__group_name",
    )

    readonly_fields = (
        "classified_at",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "batch",
        "error_code",
        "error_code__group",
        "cause_group",
        "created_by",
        "updated_by",
    )

    ordering = (
        "-received_date",
        "-id",
    )

    @admin.display(
        description="Nhóm lỗi",
        ordering="error_code__group__group_name",
    )
    def error_group_display(self, obj):
        if not obj.error_code_id:
            return "-"
        return (
            f"{obj.error_code.group.group_code} - "
            f"{obj.error_code.group.group_name}"
        )

    @admin.display(
        description="Mã lỗi",
        ordering="error_code__error_code",
    )
    def error_code_display(self, obj):
        if not obj.error_code_id:
            return "-"

        return (
            f"{obj.error_code.error_code} - "
            f"{obj.error_code.error_name}"
        )


    @admin.display(
        description="Nguyên nhân",
        ordering="cause_group__cause_name",
    )
    def cause_group_display(self, obj):
        if not obj.cause_group_id:
            return "-"
        return (
            f"{obj.cause_group.cause_code} - "
            f"{obj.cause_group.cause_name}"
        )


@admin.register(ExternalErrorClassificationLog)
class ExternalErrorClassificationLogAdmin(admin.ModelAdmin):
    list_display = ["record", "model_id", "prompt_version", "latency_ms", "created_at", "error_message"]
    list_filter = ["model_id", "prompt_version", "created_at"]
    search_fields = ["record__clean_content", "record__normalized_issue", "error_message"]
    readonly_fields = ["created_at"]


@admin.register(ExternalErrorDashboardWidget)
class ExternalErrorDashboardWidgetAdmin(admin.ModelAdmin):
    list_display = ["title", "widget_type", "group_by", "breakdown_by", "is_default", "is_active"]
    list_filter = ["widget_type", "is_default", "is_active"]
    search_fields = ["title", "group_by", "breakdown_by"]
    readonly_fields = ["created_at", "updated_at"]
