
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class ExternalErrorGroup(TimeStampedModel):
    group_code = models.CharField(max_length=50, unique=True, db_index=True)
    group_name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "external_error_groups"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.group_code} - {self.group_name}"


class ExternalErrorCode(TimeStampedModel):
    group = models.ForeignKey(
        ExternalErrorGroup,
        on_delete=models.PROTECT,
        related_name="error_codes",
    )
    error_code = models.CharField(max_length=100, unique=True, db_index=True)
    error_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    examples = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "external_error_codes"
        ordering = ["group__sort_order", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "error_name"],
                name="uniq_external_error_code_name_in_group",
            )
        ]
        indexes = [models.Index(fields=["group", "is_active"])]

    def __str__(self):
        return f"{self.error_code} - {self.error_name}"


class ExternalErrorCauseGroup(TimeStampedModel):
    """Danh mục nguyên nhân động được đưa vào prompt LLM từ database."""

    cause_code = models.CharField(max_length=50, unique=True, db_index=True)
    cause_name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    examples = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "external_error_cause_groups"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.cause_code} - {self.cause_name}"


class ExternalErrorImportBatch(TimeStampedModel):
    SOURCE_EXCEL = "EXCEL"
    SOURCE_API = "API"
    SOURCE_MANUAL = "MANUAL"

    SOURCE_TYPE_CHOICES = [
        (SOURCE_EXCEL, "Excel"),
        (SOURCE_API, "API"),
        (SOURCE_MANUAL, "Nhập tay"),
    ]

    STATUS_IMPORTED = "IMPORTED"
    STATUS_CLASSIFYING = "CLASSIFYING"
    STATUS_CLASSIFIED = "CLASSIFIED"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = [
        (STATUS_IMPORTED, "Đã import"),
        (STATUS_CLASSIFYING, "Đang phân loại"),
        (STATUS_CLASSIFIED, "Đã phân loại"),
        (STATUS_FAILED, "Lỗi"),
    ]

    batch_code = models.CharField(max_length=50, unique=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        default=SOURCE_EXCEL,
    )
    total_rows = models.PositiveIntegerField(default=0)
    classified_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_IMPORTED,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="external_error_batches",
    )

    class Meta:
        db_table = "external_error_import_batches"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.batch_code


class ExternalErrorRecord(TimeStampedModel):
    STATUS_UNCLASSIFIED = "UNCLASSIFIED"
    STATUS_CLASSIFIED = "CLASSIFIED"
    STATUS_NEED_REVIEW = "NEED_REVIEW"
    STATUS_CONFIRMED = "CONFIRMED"
    STATUS_FAILED = "FAILED"

    CLASSIFICATION_STATUS_CHOICES = [
        (STATUS_UNCLASSIFIED, "Chưa phân loại"),
        (STATUS_CLASSIFIED, "Đã phân loại"),
        (STATUS_NEED_REVIEW, "Cần kiểm tra"),
        (STATUS_CONFIRMED, "Đã xác nhận"),
        (STATUS_FAILED, "Lỗi phân loại"),
    ]

    batch = models.ForeignKey(
        ExternalErrorImportBatch,
        on_delete=models.CASCADE,
        related_name="records",
        null=True,
        blank=True,
    )

    received_date = models.DateTimeField(null=True, blank=True, db_index=True)
    completed_date = models.DateTimeField(null=True, blank=True, db_index=True)

    raw_source = models.CharField(max_length=255, null=True, blank=True)
    raw_device = models.CharField(max_length=255, null=True, blank=True)
    raw_result = models.CharField(max_length=255, null=True, blank=True)
    raw_content = models.TextField(null=True, blank=True)
    raw_cause = models.TextField(null=True, blank=True)
    raw_solution = models.TextField(null=True, blank=True)

    clean_source = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    clean_device = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    clean_result = models.CharField(max_length=255, null=True, blank=True)
    clean_content = models.TextField(null=True, blank=True)
    clean_cause = models.TextField(null=True, blank=True)
    clean_solution = models.TextField(null=True, blank=True)

    error_code = models.ForeignKey(
        ExternalErrorCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    normalized_issue = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    classification_confidence = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    need_review = models.BooleanField(default=False, db_index=True)
    classification_status = models.CharField(
        max_length=30,
        choices=CLASSIFICATION_STATUS_CHOICES,
        default=STATUS_UNCLASSIFIED,
        db_index=True,
    )
    classification_error = models.TextField(null=True, blank=True)
    llm_model_id = models.CharField(max_length=255, null=True, blank=True)
    classified_at = models.DateTimeField(null=True, blank=True)

    cause_group = models.ForeignKey(
        ExternalErrorCauseGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    normalized_cause = models.CharField(
        max_length=255, null=True, blank=True, db_index=True
    )
    cause_classification_confidence = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    cause_need_review = models.BooleanField(default=False, db_index=True)
    cause_classification_status = models.CharField(
        max_length=30,
        choices=CLASSIFICATION_STATUS_CHOICES,
        default=STATUS_UNCLASSIFIED,
        db_index=True,
    )
    cause_classification_error = models.TextField(null=True, blank=True)
    cause_llm_model_id = models.CharField(max_length=255, null=True, blank=True)
    cause_classified_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_external_error_records",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_external_error_records",
    )

    class Meta:
        db_table = "external_error_records"
        ordering = ["-received_date", "-id"]
        indexes = [
            models.Index(fields=["received_date", "error_code"]),
            models.Index(fields=["received_date", "clean_device"]),
            models.Index(fields=["received_date", "clean_source"]),
            models.Index(fields=["classification_status", "need_review"]),
            models.Index(
                fields=["received_date", "cause_group"],
                name="ext_err_recv_cause_idx",
            ),
            models.Index(
                fields=["cause_classification_status", "cause_need_review"],
                name="ext_err_cause_stat_idx",
            ),
        ]

    def __str__(self):
        code = self.error_code.error_code if self.error_code_id else "Chưa phân loại"
        return f"{self.received_date or '-'} - {code}"

    @property
    def error_group(self):
        return self.error_code.group if self.error_code_id else None

    @property
    def error_group_code(self):
        return self.error_group.group_code if self.error_group else None

    @property
    def error_group_name(self):
        return self.error_group.group_name if self.error_group else None

    @property
    def error_code_value(self):
        return self.error_code.error_code if self.error_code_id else None

    @property
    def error_code_name(self):
        return self.error_code.error_name if self.error_code_id else None

    @property
    def cause_group_code(self):
        return self.cause_group.cause_code if self.cause_group_id else None

    @property
    def cause_group_name(self):
        return self.cause_group.cause_name if self.cause_group_id else None


class ExternalErrorClassificationLog(models.Model):
    record = models.ForeignKey(
        ExternalErrorRecord,
        on_delete=models.CASCADE,
        related_name="classification_logs",
    )
    model_id = models.CharField(max_length=255, null=True, blank=True)
    prompt_version = models.CharField(max_length=50, default="v1")
    input_payload = models.JSONField(default=dict, blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(null=True, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "external_error_classification_logs"
        ordering = ["-created_at", "-id"]


class ExternalErrorDashboardWidget(TimeStampedModel):
    WIDGET_BAR = "BAR"
    WIDGET_LINE = "LINE"
    WIDGET_DONUT = "DONUT"
    WIDGET_STACKED_BAR = "STACKED_BAR"
    WIDGET_STACKED_HORIZONTAL_BAR = "STACKED_HORIZONTAL_BAR"
    WIDGET_TABLE = "TABLE"

    WIDGET_TYPE_CHOICES = [
        (WIDGET_BAR, "Biểu đồ cột"),
        (WIDGET_LINE, "Biểu đồ đường"),
        (WIDGET_DONUT, "Biểu đồ donut"),
        (WIDGET_STACKED_BAR, "Biểu đồ cột chồng"),
        (WIDGET_STACKED_HORIZONTAL_BAR, "Biểu đồ thanh ngang chồng"),
        (WIDGET_TABLE, "Bảng"),
    ]

    title = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=50, choices=WIDGET_TYPE_CHOICES)
    group_by = models.CharField(max_length=50)
    breakdown_by = models.CharField(max_length=50, null=True, blank=True)
    metric = models.CharField(max_length=50, default="count")
    sort_by = models.CharField(max_length=50, default="count")
    sort_direction = models.CharField(max_length=10, default="desc")
    limit = models.PositiveIntegerField(default=10)
    filters = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="external_error_dashboard_widgets",
    )

    class Meta:
        db_table = "external_error_dashboard_widgets"
        ordering = ["-is_default", "id"]

    def __str__(self):
        return self.title
