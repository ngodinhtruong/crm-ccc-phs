from django.contrib import admin

from apps.external_errors.models import (
    ExternalErrorClassificationLog,
    ExternalErrorDashboardWidget,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)


@admin.register(ExternalErrorImportBatch)
class ExternalErrorImportBatchAdmin(admin.ModelAdmin):
    list_display = ["batch_code", "file_name", "source_type", "total_rows", "classified_rows", "failed_rows", "status", "created_at"]
    list_filter = ["source_type", "status", "created_at"]
    search_fields = ["batch_code", "file_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ExternalErrorRecord)
class ExternalErrorRecordAdmin(admin.ModelAdmin):
    list_display = ["received_date", "clean_device", "clean_source", "error_type_name", "normalized_issue", "classification_confidence", "need_review", "classification_status"]
    list_filter = ["classification_status", "need_review", "error_type_code", "clean_device", "clean_source", "received_date"]
    search_fields = ["raw_content", "clean_content", "raw_cause", "clean_cause", "normalized_issue"]
    readonly_fields = ["created_at", "updated_at", "classified_at"]
    date_hierarchy = "received_date"


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
