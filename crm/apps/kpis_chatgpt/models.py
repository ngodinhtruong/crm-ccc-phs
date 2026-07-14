from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from apps.common.models import TimeStampedModel


class KpiPeriod(TimeStampedModel):
    PERIOD_MONTH = "MONTH"
    PERIOD_QUARTER = "QUARTER"
    PERIOD_HALF_YEAR = "HALF_YEAR"
    PERIOD_YEAR = "YEAR"

    PERIOD_TYPE_CHOICES = [
        (PERIOD_MONTH, "Tháng"),
        (PERIOD_QUARTER, "Quý"),
        (PERIOD_HALF_YEAR, "Bán niên"),
        (PERIOD_YEAR, "Năm"),
    ]

    STATUS_DRAFT = "DRAFT"
    STATUS_ACTIVE = "ACTIVE"
    STATUS_LOCKED = "LOCKED"
    STATUS_CLOSED = "CLOSED"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Nháp"),
        (STATUS_ACTIVE, "Đang áp dụng"),
        (STATUS_LOCKED, "Đã khóa"),
        (STATUS_CLOSED, "Đã chốt"),
    ]

    period_code = models.CharField(max_length=50, unique=True)
    period_name = models.CharField(max_length=255)

    period_type = models.CharField(max_length=20, choices=PERIOD_TYPE_CHOICES)
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField(null=True, blank=True)
    quarter = models.PositiveIntegerField(null=True, blank=True)
    half_year = models.PositiveIntegerField(null=True, blank=True)

    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
    )

    total_weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("100.00"),
    )

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_kpi_periods",
    )
    updated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_kpi_periods",
    )

    class Meta:
        db_table = "kpi_periods"
        ordering = ["-year", "-month", "-quarter", "-half_year", "-id"]

    def __str__(self):
        return self.period_name

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Ngày bắt đầu không được lớn hơn ngày kết thúc.")

        if self.period_type == self.PERIOD_MONTH and not self.month:
            raise ValidationError("Kỳ KPI theo tháng phải có month.")

        if self.period_type == self.PERIOD_QUARTER and not self.quarter:
            raise ValidationError("Kỳ KPI theo quý phải có quarter.")

        if self.period_type == self.PERIOD_HALF_YEAR and not self.half_year:
            raise ValidationError("Kỳ KPI bán niên phải có half_year.")

    def validate_weight_configuration(self):
        errors = []
        profiles = self.profiles.filter(is_active=True)

        profile_total = (
            profiles.aggregate(total=Sum("total_weight"))["total"] or Decimal("0")
        ).quantize(Decimal("0.01"))

        if not profiles.exists():
            errors.append("Kỳ KPI chưa có bộ KPI nào.")

        for profile in profiles:
            try:
                profile.validate_weight_configuration()
            except ValidationError as exc:
                if hasattr(exc, "messages"):
                    errors.extend(exc.messages)
                else:
                    errors.append(str(exc))

        # Mỗi profile tự có total_weight = 100%. Không cộng SA + SA_SUP với nhau.
        if profile_total <= Decimal("0.00"):
            errors.append("Tổng trọng số các bộ KPI không hợp lệ.")

        if errors:
            raise ValidationError(errors)

        return True


class KpiProfile(TimeStampedModel):
    PROFILE_SA = "SA"
    PROFILE_SA_SUP = "SA_SUP"

    PROFILE_CHOICES = [
        (PROFILE_SA, "KPI dành cho SA"),
        (PROFILE_SA_SUP, "KPI dành cho SA_SUP"),
    ]

    TARGET_ROLE_SA = "SA_STAFF"
    TARGET_ROLE_SA_SUP = "SA_SUPERVISOR"

    TARGET_ROLE_CHOICES = [
        (TARGET_ROLE_SA, "Nhân viên SA"),
        (TARGET_ROLE_SA_SUP, "Nhân viên SA_SUP"),
    ]

    period = models.ForeignKey(
        KpiPeriod,
        on_delete=models.CASCADE,
        related_name="profiles",
    )
    profile_code = models.CharField(max_length=50, choices=PROFILE_CHOICES)
    profile_name = models.CharField(max_length=255)
    target_role_code = models.CharField(max_length=50, choices=TARGET_ROLE_CHOICES)
    total_weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"))
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_profiles"
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile_code"],
                name="uq_kpi_profile_period_code",
            )
        ]

    def __str__(self):
        return f"{self.period.period_code} - {self.profile_code}"

    def validate_weight_configuration(self):
        errors = []

        sections = self.sections.filter(is_active=True)
        groups = self.groups.filter(is_active=True, section__is_active=True)
        metrics = self.metrics.filter(
            is_active=True,
            group__is_active=True,
            group__section__is_active=True,
        )

        section_total = (
            sections.aggregate(total=Sum("weight_percent"))["total"] or Decimal("0")
        ).quantize(Decimal("0.01"))
        group_total = (
            groups.aggregate(total=Sum("weight_percent"))["total"] or Decimal("0")
        ).quantize(Decimal("0.01"))
        metric_total = (
            metrics.aggregate(total=Sum("weight_percent"))["total"] or Decimal("0")
        ).quantize(Decimal("0.01"))

        if section_total != self.total_weight:
            errors.append(
                f"[{self.profile_code}] Tổng trọng số phần KPI hiện là {section_total}%, "
                f"phải bằng {self.total_weight}%."
            )

        if group_total != self.total_weight:
            errors.append(
                f"[{self.profile_code}] Tổng trọng số nhóm KPI hiện là {group_total}%, "
                f"phải bằng {self.total_weight}%."
            )

        if metric_total != self.total_weight:
            errors.append(
                f"[{self.profile_code}] Tổng trọng số KPI chi tiết hiện là {metric_total}%, "
                f"phải bằng {self.total_weight}%."
            )

        for section in sections:
            child_total = (
                groups.filter(section=section).aggregate(total=Sum("weight_percent"))["total"]
                or Decimal("0")
            ).quantize(Decimal("0.01"))

            if child_total != section.weight_percent:
                errors.append(
                    f"[{self.profile_code}] Tổng trọng số nhóm trong phần {section.section_code} "
                    f"là {child_total}%, phải bằng {section.weight_percent}%."
                )

        for group in groups:
            child_total = (
                metrics.filter(group=group).aggregate(total=Sum("weight_percent"))["total"]
                or Decimal("0")
            ).quantize(Decimal("0.01"))

            if child_total != group.weight_percent:
                errors.append(
                    f"[{self.profile_code}] Tổng trọng số KPI trong nhóm {group.group_code} "
                    f"là {child_total}%, phải bằng {group.weight_percent}%."
                )

        if errors:
            raise ValidationError(errors)

        return True


class KpiSection(TimeStampedModel):
    period = models.ForeignKey(
        KpiPeriod,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    section_code = models.CharField(max_length=50)
    section_name = models.CharField(max_length=255)
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_sections"
        ordering = ["profile__sort_order", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "section_code"],
                name="uq_kpi_section_period_profile_code",
            )
        ]

    def __str__(self):
        return f"{self.profile.profile_code} - {self.section_code} - {self.section_name}"


class KpiGroup(TimeStampedModel):
    GROUP_TYPE_MANUAL = "MANUAL"
    GROUP_TYPE_AUTO = "AUTO"
    GROUP_TYPE_MIXED = "MIXED"

    GROUP_TYPE_CHOICES = [
        (GROUP_TYPE_MANUAL, "Nhập tay"),
        (GROUP_TYPE_AUTO, "Tự động"),
        (GROUP_TYPE_MIXED, "Hỗn hợp"),
    ]

    period = models.ForeignKey(
        KpiPeriod,
        on_delete=models.CASCADE,
        related_name="groups",
    )
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="groups",
        null=True,
        blank=True,
    )
    section = models.ForeignKey(
        KpiSection,
        on_delete=models.CASCADE,
        related_name="groups",
        null=True,
        blank=True,
    )
    group_code = models.CharField(max_length=50)
    group_name = models.CharField(max_length=255)
    group_type = models.CharField(max_length=50, choices=GROUP_TYPE_CHOICES)
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_groups"
        ordering = ["profile__sort_order", "section__sort_order", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "group_code"],
                name="uq_kpi_group_period_profile_code",
            )
        ]

    def __str__(self):
        return f"{self.profile.profile_code if self.profile else ''} - {self.group_code} - {self.group_name}"


class KpiPeriodMetric(TimeStampedModel):
    period = models.ForeignKey(
        KpiPeriod,
        on_delete=models.CASCADE,
        related_name="metrics",
    )
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="metrics",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        KpiGroup,
        on_delete=models.CASCADE,
        related_name="metrics",
    )

    metric_code = models.CharField(max_length=50)
    metric_name = models.CharField(max_length=255)
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    work_description = models.TextField(null=True, blank=True)
    measurement_formula = models.TextField()
    target_text = models.TextField(null=True, blank=True)
    target_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    target_unit = models.CharField(max_length=50, null=True, blank=True)
    frequency = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_period_metrics"
        ordering = ["profile__sort_order", "group__section__sort_order", "group__sort_order", "metric_code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "metric_code"],
                name="uq_kpi_period_profile_metric_code",
            )
        ]

    def __str__(self):
        return f"{self.metric_code} - {self.metric_name}"

    def clean(self):
        if not self.measurement_formula or not self.measurement_formula.strip():
            raise ValidationError("Mỗi KPI bắt buộc phải có công thức tính / đo lường CRM.")


class KpiUserTarget(TimeStampedModel):
    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="user_targets")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="user_targets",
        null=True,
        blank=True,
    )
    metric = models.ForeignKey(KpiPeriodMetric, on_delete=models.CASCADE, related_name="user_targets")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kpi_targets")
    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_targets",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_targets",
    )
    target_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    target_text = models.TextField(null=True, blank=True)
    target_unit = models.CharField(max_length=50, null=True, blank=True)
    assigned_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_kpi_targets",
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "kpi_user_targets"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "metric", "user"],
                name="uq_kpi_user_target_profile",
            )
        ]


class KpiUserMetricResult(TimeStampedModel):
    SOURCE_MANUAL = "MANUAL"
    SOURCE_AUTO = "AUTO"

    SOURCE_TYPE_CHOICES = [
        (SOURCE_MANUAL, "Nhập tay"),
        (SOURCE_AUTO, "Tự động"),
    ]

    STATUS_GOOD = "GOOD"
    STATUS_WARNING = "WARNING"
    STATUS_BAD = "BAD"
    STATUS_PASSED = "PASSED"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = [
        (STATUS_GOOD, "Tốt"),
        (STATUS_WARNING, "Cảnh báo"),
        (STATUS_BAD, "Kém"),
        (STATUS_PASSED, "Đạt"),
        (STATUS_FAILED, "Không đạt"),
    ]

    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="user_metric_results")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="user_metric_results",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(KpiGroup, on_delete=models.PROTECT, related_name="user_metric_results")
    metric = models.ForeignKey(KpiPeriodMetric, on_delete=models.CASCADE, related_name="user_metric_results")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kpi_metric_results")
    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_metric_results",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_metric_results",
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default=SOURCE_MANUAL)
    actual_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    target_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    weight_percent = models.DecimalField(max_digits=5, decimal_places=2)
    weighted_score = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))
    result_status = models.CharField(max_length=20, choices=STATUS_CHOICES, null=True, blank=True)
    calculated_payload = models.JSONField(null=True, blank=True)
    evidence_data = models.JSONField(null=True, blank=True)
    scored_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scored_kpi_results",
    )
    scored_at = models.DateTimeField(null=True, blank=True)
    calculated_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "kpi_user_metric_results"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "metric", "user"],
                name="uq_kpi_user_metric_result_profile",
            )
        ]
        indexes = [
            models.Index(fields=["period", "profile", "user"]),
            models.Index(fields=["period", "branch"]),
            models.Index(fields=["period", "profile", "metric"]),
        ]

    def save(self, *args, **kwargs):
        self.weighted_score = (self.score or Decimal("0")) * self.weight_percent / Decimal("100")
        super().save(*args, **kwargs)


class KpiGateDefinition(TimeStampedModel):
    OP_GTE = ">="
    OP_LTE = "<="
    OP_LT = "<"
    OP_GT = ">"
    OP_EQ = "="

    OPERATOR_CHOICES = [
        (OP_GTE, ">="),
        (OP_LTE, "<="),
        (OP_LT, "<"),
        (OP_GT, ">"),
        (OP_EQ, "="),
    ]

    gate_code = models.CharField(max_length=50, unique=True)
    gate_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    formula_key = models.CharField(max_length=100)
    default_threshold = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    operator = models.CharField(max_length=20, choices=OPERATOR_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_gate_definitions"
        ordering = ["gate_code"]

    def __str__(self):
        return f"{self.gate_code} - {self.gate_name}"


class KpiPeriodGateConfig(TimeStampedModel):
    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="gate_configs")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="gate_configs",
        null=True,
        blank=True,
    )
    gate_definition = models.ForeignKey(KpiGateDefinition, on_delete=models.PROTECT, related_name="period_configs")
    gate_code = models.CharField(max_length=50)
    gate_name = models.CharField(max_length=255)
    formula_key = models.CharField(max_length=100)
    operator = models.CharField(max_length=20, choices=KpiGateDefinition.OPERATOR_CHOICES)
    threshold_value = models.DecimalField(max_digits=20, decimal_places=4)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    formula_config = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "kpi_period_gate_configs"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "gate_code"],
                name="uq_kpi_period_profile_gate_code",
            )
        ]


class KpiUserGateResult(TimeStampedModel):
    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="user_gate_results")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="user_gate_results",
        null=True,
        blank=True,
    )
    gate_config = models.ForeignKey(KpiPeriodGateConfig, on_delete=models.CASCADE, related_name="user_gate_results")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kpi_gate_results")
    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_gate_results",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_gate_results",
    )
    actual_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    threshold_value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    operator = models.CharField(max_length=20, choices=KpiGateDefinition.OPERATOR_CHOICES)
    is_passed = models.BooleanField(default=False)
    result_label = models.CharField(max_length=100, null=True, blank=True)
    calculated_payload = models.JSONField(null=True, blank=True)
    evidence_data = models.JSONField(null=True, blank=True)
    calculated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "kpi_user_gate_results"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "gate_config", "user"],
                name="uq_kpi_user_gate_result_profile",
            )
        ]
        indexes = [
            models.Index(fields=["period", "profile", "user"]),
            models.Index(fields=["period", "branch"]),
        ]


class KpiRewardTierConfig(TimeStampedModel):
    TIER_GOLD = "GOLD"
    TIER_SILVER = "SILVER"
    TIER_STANDARD = "STANDARD"
    TIER_FAILED = "FAILED"

    REWARD_CASH = "CASH"
    REWARD_RECOGNITION = "RECOGNITION"
    REWARD_IMPROVEMENT_PLAN = "IMPROVEMENT_PLAN"

    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="reward_tiers")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="reward_tiers",
        null=True,
        blank=True,
    )
    tier_code = models.CharField(max_length=50)
    tier_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    rank_metric_code = models.CharField(max_length=50, null=True, blank=True)
    rank_limit = models.PositiveIntegerField(null=True, blank=True)
    min_total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    require_all_gates_passed = models.BooleanField(default=True)
    reward_type = models.CharField(max_length=50, null=True, blank=True)
    reward_config = models.JSONField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "kpi_reward_tier_configs"
        ordering = ["profile__sort_order", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "tier_code"],
                name="uq_kpi_reward_tier_profile_code",
            )
        ]


class KpiUserSummary(TimeStampedModel):
    period = models.ForeignKey(KpiPeriod, on_delete=models.CASCADE, related_name="user_summaries")
    profile = models.ForeignKey(
        KpiProfile,
        on_delete=models.CASCADE,
        related_name="user_summaries",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kpi_summaries")
    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_summaries",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_summaries",
    )
    manual_score = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))
    auto_score = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))
    total_score = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal("0.0000"))
    manual_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    auto_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    all_gates_passed = models.BooleanField(default=False)
    failed_gate_codes = models.JSONField(null=True, blank=True)
    reward_tier = models.ForeignKey(
        KpiRewardTierConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_summaries",
    )
    reward_tier_code = models.CharField(max_length=50, null=True, blank=True)
    reward_tier_name = models.CharField(max_length=255, null=True, blank=True)
    rank_overall = models.PositiveIntegerField(null=True, blank=True)
    rank_branch = models.PositiveIntegerField(null=True, blank=True)
    rank_fee = models.PositiveIntegerField(null=True, blank=True)
    rank_reactivated_accounts = models.PositiveIntegerField(null=True, blank=True)
    calculated_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locked_kpi_summaries",
    )

    class Meta:
        db_table = "kpi_user_summaries"
        constraints = [
            models.UniqueConstraint(
                fields=["period", "profile", "user"],
                name="uq_kpi_user_summary_profile",
            )
        ]
        indexes = [
            models.Index(fields=["period", "profile", "branch"]),
            models.Index(fields=["period", "profile", "total_score"]),
        ]


class TransactionLog(TimeStampedModel):
    account_no = models.CharField(max_length=100, db_index=True)
    customer_account = models.ForeignKey(
        "customers.CustomerAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_logs",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_logs",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_logs",
    )
    transaction_date = models.DateField(db_index=True)
    matched_at = models.DateTimeField(null=True, blank=True)
    transaction_value = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal("0.00"))
    transaction_fee = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal("0.00"))
    order_status = models.CharField(max_length=50, db_index=True)
    product_code = models.CharField(max_length=100, null=True, blank=True)
    source_system = models.CharField(max_length=100, null=True, blank=True)
    source_transaction_id = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "transaction_logs"
        indexes = [
            models.Index(fields=["account_no", "transaction_date"]),
            models.Index(fields=["order_status"]),
            models.Index(fields=["source_transaction_id"]),
        ]

    def __str__(self):
        return f"{self.account_no} - {self.transaction_date}"


class KpiAuditLog(models.Model):
    ACTION_CREATE = "CREATE"
    ACTION_UPDATE = "UPDATE"
    ACTION_DELETE = "DELETE"
    ACTION_LOCK = "LOCK"
    ACTION_CLOSE = "CLOSE"
    ACTION_CALCULATE = "CALCULATE"

    period = models.ForeignKey(
        KpiPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    object_type = models.CharField(max_length=100)
    object_id = models.BigIntegerField(null=True, blank=True)
    action_type = models.CharField(max_length=50)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    changed_fields = models.JSONField(null=True, blank=True)
    changed_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpi_audit_logs",
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "kpi_audit_logs"
        ordering = ["-changed_at", "-id"]
        indexes = [
            models.Index(fields=["period", "object_type"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["changed_at"]),
        ]
