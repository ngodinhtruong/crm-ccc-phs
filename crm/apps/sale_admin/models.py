from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class SaCallResult(TimeStampedModel):
    result_code = models.CharField(max_length=50, unique=True)
    result_name = models.CharField(max_length=255)

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "sa_call_results"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.result_name


class SaInterestLevel(TimeStampedModel):
    level_code = models.CharField(max_length=50, unique=True)
    level_name = models.CharField(max_length=255)

    score = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "sa_interest_levels"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.level_name


class SaIcpGroup(TimeStampedModel):
    TYPE_POTENTIAL = "POTENTIAL"
    TYPE_NURTURE = "NURTURE"
    TYPE_NON_POTENTIAL = "NON_POTENTIAL"
    TYPE_INVALID = "INVALID"

    ICP_TYPE_CHOICES = [
        (TYPE_POTENTIAL, "Tiềm năng"),
        (TYPE_NURTURE, "Nuôi dưỡng"),
        (TYPE_NON_POTENTIAL, "Không tiềm năng"),
        (TYPE_INVALID, "Ảo / Không liên lạc"),
    ]

    icp_code = models.CharField(max_length=20, unique=True)
    icp_name = models.CharField(max_length=255)

    icp_type = models.CharField(
        max_length=50,
        choices=ICP_TYPE_CHOICES,
        default=TYPE_NURTURE,
    )

    description = models.TextField(null=True, blank=True)
    follow_up_days = models.IntegerField(null=True, blank=True)

    is_potential = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "sa_icp_groups"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.icp_code} - {self.icp_name}"


class SaRecord(TimeStampedModel):
    SOURCE_CRM_MINI = "CRM_MINI"
    SOURCE_CLOUDGO = "CLOUDGO"
    SOURCE_EXCEL = "EXCEL"

    SOURCE_CHOICES = [
        (SOURCE_CRM_MINI, "CRM Mini"),
        (SOURCE_CLOUDGO, "CloudGo"),
        (SOURCE_EXCEL, "Excel"),
    ]

    STATUS_VALID = "VALID"
    STATUS_MISSING_ACCOUNT = "MISSING_ACCOUNT"
    STATUS_DUPLICATED = "DUPLICATED"
    STATUS_INVALID = "INVALID"

    DATA_STATUS_CHOICES = [
        (STATUS_VALID, "Hợp lệ"),
        (STATUS_MISSING_ACCOUNT, "Thiếu số tài khoản"),
        (STATUS_DUPLICATED, "Trùng dữ liệu"),
        (STATUS_INVALID, "Không hợp lệ"),
    ]

    record_code = models.CharField(max_length=50, unique=True)

    # Số TK KH - bắt buộc, dùng để kết nối Customer 360
    account_no = models.CharField(max_length=50, db_index=True)


    # Snapshot từ Excel / Customer 360 tại thời điểm ghi nhận
    customer_name_snapshot = models.CharField(max_length=255, null=True, blank=True)
    branch_name_snapshot = models.CharField(max_length=255, null=True, blank=True)
    pic_name_snapshot = models.CharField(max_length=255, null=True, blank=True)

    # Trạng thái tài khoản/KH tại thời điểm gọi: INACTIVE / ACTIVE / REACTIVATED...
    account_status = models.CharField(max_length=50, null=True, blank=True)

    # Phân loại VIP tại thời điểm gọi
    vip_classification = models.CharField(max_length=100, null=True, blank=True)

    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    company = models.ForeignKey(
        "customers.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    # PIC SA
    pic_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records_as_pic",
    )

    pic_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records_as_pic",
    )

    call_date = models.DateField()
    follow_no = models.IntegerField(default=1)

    call_result = models.ForeignKey(
        SaCallResult,
        on_delete=models.PROTECT,
        related_name="sa_records",
    )

    interest_level = models.ForeignKey(
        SaInterestLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    icp_group = models.ForeignKey(
        SaIcpGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records",
    )

    # KPI Part B
    reactivation = models.BooleanField(default=False)
    reactivation_confirmed_at = models.DateTimeField(null=True, blank=True)

    # KPI Part A
    introduced_product = models.BooleanField(default=False)
    support_info = models.BooleanField(default=False)
    referred_rm = models.BooleanField(default=False)

    # Bàn giao MG chăm sóc
    handover_to_broker = models.BooleanField(default=False)

    broker_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records_as_broker",
    )

    broker_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_records_as_broker",
    )

    broker_handover_at = models.DateTimeField(null=True, blank=True)
    broker_handover_note = models.TextField(null=True, blank=True)

    # Snapshot tại thời điểm xác nhận, số liệu chính về sau lấy từ transaction_logs
    transaction_fee_snapshot = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )
    transaction_value_snapshot = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    note = models.TextField(null=True, blank=True)

    source_system = models.CharField(
        max_length=50,
        choices=SOURCE_CHOICES,
        default=SOURCE_CRM_MINI,
    )

    source_call_id = models.CharField(max_length=100, null=True, blank=True)

    data_status = models.CharField(
        max_length=50,
        choices=DATA_STATUS_CHOICES,
        default=STATUS_VALID,
    )

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sa_records",
    )

    updated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_sa_records",
    )

    class Meta:
        db_table = "sa_records"
        ordering = ["-call_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["account_no", "pic_user", "call_date", "follow_no"],
                name="uq_sa_record_account_pic_date_follow",
            ),
            models.UniqueConstraint(
                fields=["source_system", "source_call_id"],
                condition=(
                    Q(source_call_id__isnull=False)
                    & ~Q(source_call_id="")
                ),
                name="uq_sa_record_source_call",
            ),
        ]
        indexes = [
            models.Index(fields=["record_code"]),
            models.Index(fields=["account_no"]),
            models.Index(fields=["customer_account"]),
            models.Index(fields=["customer"]),
            models.Index(fields=["company"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["pic_user"]),
            models.Index(fields=["call_date"]),
            models.Index(fields=["call_result"]),
            models.Index(fields=["icp_group"]),
            models.Index(fields=["reactivation"]),
            models.Index(fields=["source_system"]),
            models.Index(fields=["data_status"]),
            models.Index(fields=["branch", "call_date"], name="sa_rec_branch_call_idx"),
            models.Index(fields=["pic_user", "call_date"], name="sa_rec_pic_call_idx"),
            models.Index(fields=["reactivation", "call_date"], name="sa_rec_react_call_idx"),
            models.Index(fields=["customer_account", "call_date"], name="sa_rec_account_call_idx"),
        ]

    def __str__(self):
        return self.record_code


class SaRecordAuditLog(models.Model):
    ACTION_CREATE = "CREATE"
    ACTION_UPDATE = "UPDATE"
    ACTION_DELETE = "DELETE"
    ACTION_IMPORT = "IMPORT"

    ACTION_CHOICES = [
        (ACTION_CREATE, "Tạo mới"),
        (ACTION_UPDATE, "Cập nhật"),
        (ACTION_DELETE, "Xóa"),
        (ACTION_IMPORT, "Import"),
    ]

    sa_record = models.ForeignKey(
        SaRecord,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )

    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)

    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    changed_fields = models.JSONField(null=True, blank=True)

    changed_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sa_record_audit_logs",
    )

    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "sa_record_audit_logs"
        ordering = ["-changed_at", "-id"]
        indexes = [
            models.Index(fields=["sa_record"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["changed_by_user"]),
            models.Index(fields=["changed_at"]),
        ]

    def __str__(self):
        return f"{self.sa_record_id} - {self.action_type}"