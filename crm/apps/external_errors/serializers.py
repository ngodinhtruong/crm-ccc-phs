from rest_framework import serializers

from apps.external_errors.models import (
    ExternalErrorClassificationLog,
    ExternalErrorDashboardWidget,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)


class ExternalErrorImportBatchSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ExternalErrorImportBatch
        fields = [
            "id",
            "batch_code",
            "file_name",
            "source_type",
            "total_rows",
            "classified_rows",
            "failed_rows",
            "status",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class ExternalErrorRecordSerializer(serializers.ModelSerializer):
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)
    error_type_label = serializers.CharField(read_only=True)

    class Meta:
        model = ExternalErrorRecord
        fields = [
            "id",
            "batch",
            "batch_code",
            "received_date",
            "completed_date",
            "raw_source",
            "raw_device",
            "raw_result",
            "raw_content",
            "raw_cause",
            "raw_solution",
            "clean_source",
            "clean_device",
            "clean_result",
            "clean_content",
            "clean_cause",
            "clean_solution",
            "error_type_code",
            "error_type_name",
            "error_type_label",
            "normalized_issue",
            "classification_confidence",
            "need_review",
            "classification_status",
            "classification_error",
            "llm_model_id",
            "classified_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "classified_at",
            "classification_error",
            "llm_model_id",
        ]


class ExternalErrorRecordListSerializer(serializers.ModelSerializer):
    batch_code = serializers.CharField(source="batch.batch_code", read_only=True)
    error_type_label = serializers.CharField(read_only=True)

    class Meta:
        model = ExternalErrorRecord
        fields = [
            "id",
            "batch",
            "batch_code",
            "received_date",
            "completed_date",
            "clean_source",
            "clean_device",
            "clean_result",
            "clean_content",
            "clean_cause",
            "clean_solution",
            "error_type_code",
            "error_type_name",
            "error_type_label",
            "normalized_issue",
            "classification_confidence",
            "need_review",
            "classification_status",
            "classified_at",
            "created_at",
        ]


class ExternalErrorRawImportRowSerializer(serializers.Serializer):
    received_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    completed_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    source = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    device = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    result = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cause = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    solution = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ExternalErrorRawImportSerializer(serializers.Serializer):
    file_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    source_type = serializers.ChoiceField(
        required=False,
        choices=ExternalErrorImportBatch.SOURCE_TYPE_CHOICES,
        default=ExternalErrorImportBatch.SOURCE_API,
    )
    classify_now = serializers.BooleanField(required=False, default=False)
    rows = ExternalErrorRawImportRowSerializer(many=True)


class ExternalErrorBulkClassifySerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
    all_matching = serializers.BooleanField(required=False, default=False)
    force = serializers.BooleanField(required=False, default=False)


class ExternalErrorDashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalErrorDashboardWidget
        fields = [
            "id",
            "title",
            "widget_type",
            "group_by",
            "breakdown_by",
            "metric",
            "sort_by",
            "sort_direction",
            "limit",
            "filters",
            "is_default",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class ExternalErrorClassificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalErrorClassificationLog
        fields = [
            "id",
            "record",
            "model_id",
            "prompt_version",
            "input_payload",
            "output_payload",
            "error_message",
            "latency_ms",
            "created_at",
        ]
