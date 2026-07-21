from rest_framework import serializers

from apps.external_errors.models import (
    ExternalErrorClassificationLog,
    ExternalErrorCode,
    ExternalErrorDashboardWidget,
    ExternalErrorGroup,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.services.importer import (
    parse_completed_datetime,
    parse_received_datetime,
)


class ExternalErrorCodeSerializer(serializers.ModelSerializer):
    group_code = serializers.CharField(
        source="group.group_code",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="group.group_name",
        read_only=True,
    )

    class Meta:
        model = ExternalErrorCode
        fields = [
            "id",
            "group",
            "group_code",
            "group_name",
            "error_code",
            "error_name",
            "description",
            "keywords",
            "examples",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "group_code",
            "group_name",
            "created_at",
            "updated_at",
        ]

    def validate_group(self, group):
        if not group.is_active:
            raise serializers.ValidationError(
                "Không thể gán mã lỗi vào nhóm đang Inactive."
            )
        return group

    def validate_error_code(self, value):
        value = str(value or "").strip().upper()
        queryset = ExternalErrorCode.objects.filter(
            error_code__iexact=value
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "Mã lỗi đã tồn tại."
            )
        return value


class ExternalErrorGroupSerializer(serializers.ModelSerializer):
    error_code_count = serializers.SerializerMethodField()

    class Meta:
        model = ExternalErrorGroup
        fields = [
            "id",
            "group_code",
            "group_name",
            "description",
            "sort_order",
            "is_active",
            "error_code_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "error_code_count",
            "created_at",
            "updated_at",
        ]

    def get_error_code_count(self, obj):
        annotated_count = getattr(obj, "error_code_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.error_codes.count()

    def validate_group_code(self, value):
        value = str(value or "").strip().upper()
        queryset = ExternalErrorGroup.objects.filter(
            group_code__iexact=value
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "Mã nhóm lỗi đã tồn tại."
            )
        return value


class ExternalErrorImportBatchSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

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
        read_only_fields = fields


class ExternalErrorRecordSerializer(serializers.ModelSerializer):
    batch_code = serializers.CharField(
        source="batch.batch_code",
        read_only=True,
        allow_null=True,
    )
    error_code_value = serializers.CharField(
        source="error_code.error_code",
        read_only=True,
        allow_null=True,
    )
    error_code_name = serializers.CharField(
        source="error_code.error_name",
        read_only=True,
        allow_null=True,
    )
    error_group_id = serializers.IntegerField(
        source="error_code.group_id",
        read_only=True,
        allow_null=True,
    )
    error_group_code = serializers.CharField(
        source="error_code.group.group_code",
        read_only=True,
        allow_null=True,
    )
    error_group_name = serializers.CharField(
        source="error_code.group.group_name",
        read_only=True,
        allow_null=True,
    )

    # Alias tạm thời để frontend/dashboard cũ chưa bị gãy.
    error_type_code = serializers.CharField(
        source="error_code.group.group_code",
        read_only=True,
        allow_null=True,
    )
    error_type_name = serializers.CharField(
        source="error_code.group.group_name",
        read_only=True,
        allow_null=True,
    )
    error_type_label = serializers.CharField(
        source="error_code.group.group_name",
        read_only=True,
        allow_null=True,
    )

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
            "error_code",
            "error_code_value",
            "error_code_name",
            "error_group_id",
            "error_group_code",
            "error_group_name",
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
        read_only_fields = fields


class ExternalErrorRecordListSerializer(ExternalErrorRecordSerializer):
    class Meta(ExternalErrorRecordSerializer.Meta):
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
            "error_code",
            "error_code_value",
            "error_code_name",
            "error_group_id",
            "error_group_code",
            "error_group_name",
            "error_type_code",
            "error_type_name",
            "error_type_label",
            "normalized_issue",
            "classification_confidence",
            "need_review",
            "classification_status",
            "classification_error",
            "classified_at",
            "created_at",
        ]
        read_only_fields = fields


class ExternalErrorManualCreateSerializer(serializers.Serializer):
    received_date = serializers.CharField()
    completed_date = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    source = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
    )
    device = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
    )
    result = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
    )
    content = serializers.CharField()
    auto_classify = serializers.BooleanField(default=True)

    def validate_received_date(self, value):
        if parse_received_datetime(value) is None:
            raise serializers.ValidationError(
                "Ngày nhận không đúng định dạng."
            )
        return value

    def validate_completed_date(self, value):
        if value not in (None, "") and parse_completed_datetime(value) is None:
            raise serializers.ValidationError(
                "Ngày hoàn thành không đúng định dạng."
            )
        return value


class ExternalErrorExcelImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    sheet_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    auto_classify = serializers.BooleanField(default=True)

    def validate_file(self, value):
        filename = str(getattr(value, "name", "")).lower()
        if not filename.endswith((".xlsx", ".xlsm")):
            raise serializers.ValidationError(
                "Chỉ hỗ trợ file Excel .xlsx hoặc .xlsm."
            )
        return value


class ExternalErrorRawImportRowSerializer(serializers.Serializer):
    received_date = serializers.CharField()
    completed_date = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    source = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    device = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    result = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    content = serializers.CharField()


class ExternalErrorRawImportSerializer(serializers.Serializer):
    file_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    source_type = serializers.ChoiceField(
        required=False,
        choices=ExternalErrorImportBatch.SOURCE_TYPE_CHOICES,
        default=ExternalErrorImportBatch.SOURCE_API,
    )
    classify_now = serializers.BooleanField(default=True)
    rows = ExternalErrorRawImportRowSerializer(many=True)


class ExternalErrorBulkClassifySerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
    all_matching = serializers.BooleanField(default=False)
    force = serializers.BooleanField(default=False)


class ExternalErrorConfirmClassificationSerializer(serializers.Serializer):
    error_code = serializers.PrimaryKeyRelatedField(
        queryset=ExternalErrorCode.objects.filter(
            is_active=True,
            group__is_active=True,
        ).select_related("group"),
    )


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
        read_only_fields = [
            "created_by",
            "created_at",
            "updated_at",
        ]


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
        read_only_fields = fields
