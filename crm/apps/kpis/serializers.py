from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.branches.models import Branch
from apps.kpis.models import (
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
)
from apps.kpis.services import create_monthly_kpi_period

User = get_user_model()


def get_user_target_for_metric(period, profile, metric, user):
    return KpiUserTarget.objects.filter(
        period=period,
        profile=profile,
        metric=metric,
        user=user,
    ).first()


class KpiProfileSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    section_count = serializers.IntegerField(read_only=True)
    group_count = serializers.IntegerField(read_only=True)
    metric_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = KpiProfile
        fields = [
            "id",
            "period",
            "period_code",
            "profile_code",
            "profile_name",
            "target_role_code",
            "total_weight",
            "sort_order",
            "is_active",
            "section_count",
            "group_count",
            "metric_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["period_code", "created_at", "updated_at"]


class KpiProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiProfile
        fields = [
            "id",
            "period",
            "profile_code",
            "profile_name",
            "target_role_code",
            "total_weight",
            "sort_order",
            "is_active",
        ]

    def validate_total_weight(self, value):
        if value != 100:
            raise serializers.ValidationError("Tổng trọng số mỗi bộ KPI phải bằng 100%.")
        return value


class KpiSectionSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    profile_name = serializers.CharField(source="profile.profile_name", read_only=True)

    class Meta:
        model = KpiSection
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "profile_name",
            "section_code",
            "section_name",
            "weight_percent",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["period_code", "profile_code", "profile_name", "created_at", "updated_at"]


class KpiSectionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiSection
        fields = [
            "id",
            "period",
            "profile",
            "section_code",
            "section_name",
            "weight_percent",
            "sort_order",
            "is_active",
        ]

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        return attrs


class KpiGateDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiGateDefinition
        fields = "__all__"


class KpiGroupSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    profile_name = serializers.CharField(source="profile.profile_name", read_only=True)
    section_code = serializers.CharField(source="section.section_code", read_only=True)
    section_name = serializers.CharField(source="section.section_name", read_only=True)

    class Meta:
        model = KpiGroup
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "profile_name",
            "section",
            "section_code",
            "section_name",
            "group_code",
            "group_name",
            "group_type",
            "weight_percent",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "period_code",
            "profile_code",
            "profile_name",
            "section_code",
            "section_name",
            "created_at",
            "updated_at",
        ]


class KpiGroupWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiGroup
        fields = [
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
        ]

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)
        section = attrs.get("section") or getattr(self.instance, "section", None)

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        if period and section and section.period_id != period.id:
            raise serializers.ValidationError({"section": "Phần KPI không thuộc kỳ KPI đã chọn."})

        if profile and section and section.profile_id != profile.id:
            raise serializers.ValidationError({"section": "Phần KPI không thuộc bộ KPI đã chọn."})

        return attrs


class KpiPeriodMetricSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    profile_name = serializers.CharField(source="profile.profile_name", read_only=True)
    section = serializers.IntegerField(source="group.section_id", read_only=True)
    section_code = serializers.CharField(source="group.section.section_code", read_only=True)
    section_name = serializers.CharField(source="group.section.section_name", read_only=True)
    group_code = serializers.CharField(source="group.group_code", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)

    class Meta:
        model = KpiPeriodMetric
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "profile_name",
            "section",
            "section_code",
            "section_name",
            "group",
            "group_code",
            "group_name",
            "metric_code",
            "metric_name",
            "weight_percent",
            "work_description",
            "measurement_formula",
            "target_text",
            "target_value",
            "target_unit",
            "frequency",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "period_code",
            "profile_code",
            "profile_name",
            "section",
            "section_code",
            "section_name",
            "group_code",
            "group_name",
            "created_at",
            "updated_at",
        ]


class KpiPeriodMetricWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiPeriodMetric
        fields = [
            "id",
            "period",
            "profile",
            "group",
            "metric_code",
            "metric_name",
            "weight_percent",
            "work_description",
            "measurement_formula",
            "target_text",
            "target_value",
            "target_unit",
            "frequency",
            "is_active",
        ]

    def validate_measurement_formula(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Mỗi KPI bắt buộc phải có công thức tính / đo lường CRM.")
        return value

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)
        group = attrs.get("group") or getattr(self.instance, "group", None)

        if not profile and group:
            attrs["profile"] = group.profile
            profile = group.profile

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        if period and group and group.period_id != period.id:
            raise serializers.ValidationError({"group": "Nhóm KPI không thuộc kỳ KPI đã chọn."})

        if profile and group and group.profile_id != profile.id:
            raise serializers.ValidationError({"group": "Nhóm KPI không thuộc bộ KPI đã chọn."})

        return attrs


class KpiPeriodGateConfigSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    definition_code = serializers.CharField(source="gate_definition.gate_code", read_only=True)

    class Meta:
        model = KpiPeriodGateConfig
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "gate_definition",
            "definition_code",
            "gate_code",
            "gate_name",
            "formula_key",
            "operator",
            "threshold_value",
            "is_required",
            "is_active",
            "formula_config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["period_code", "profile_code", "definition_code", "created_at", "updated_at"]


class KpiPeriodGateConfigWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiPeriodGateConfig
        fields = [
            "id",
            "period",
            "profile",
            "gate_definition",
            "gate_code",
            "gate_name",
            "operator",
            "threshold_value",
            "is_required",
            "is_active",
            "formula_config",
        ]

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        return attrs

    def create(self, validated_data):
        gate_definition = validated_data["gate_definition"]
        validated_data["gate_code"] = validated_data.get("gate_code") or gate_definition.gate_code
        validated_data["gate_name"] = validated_data.get("gate_name") or gate_definition.gate_name
        validated_data["formula_key"] = gate_definition.formula_key
        validated_data["operator"] = validated_data.get("operator") or gate_definition.operator
        validated_data["threshold_value"] = validated_data.get("threshold_value") or gate_definition.default_threshold or 0
        return super().create(validated_data)


class KpiRewardTierConfigSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)

    class Meta:
        model = KpiRewardTierConfig
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "tier_code",
            "tier_name",
            "description",
            "rank_metric_code",
            "rank_limit",
            "min_total_score",
            "require_all_gates_passed",
            "reward_type",
            "reward_config",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["period_code", "profile_code", "created_at", "updated_at"]


class KpiRewardTierConfigWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiRewardTierConfig
        fields = [
            "id",
            "period",
            "profile",
            "tier_code",
            "tier_name",
            "description",
            "rank_metric_code",
            "rank_limit",
            "min_total_score",
            "require_all_gates_passed",
            "reward_type",
            "reward_config",
            "sort_order",
            "is_active",
        ]

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        return attrs


class KpiPeriodListSerializer(serializers.ModelSerializer):
    profile_count = serializers.IntegerField(read_only=True)
    section_count = serializers.IntegerField(read_only=True)
    group_count = serializers.IntegerField(read_only=True)
    metric_count = serializers.IntegerField(read_only=True)
    gate_count = serializers.IntegerField(read_only=True)
    reward_tier_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = KpiPeriod
        fields = [
            "id",
            "period_code",
            "period_name",
            "period_type",
            "year",
            "month",
            "quarter",
            "half_year",
            "start_date",
            "end_date",
            "status",
            "total_weight",
            "profile_count",
            "section_count",
            "group_count",
            "metric_count",
            "gate_count",
            "reward_tier_count",
            "created_at",
            "updated_at",
        ]


class KpiPeriodDetailSerializer(serializers.ModelSerializer):
    profiles = KpiProfileSerializer(many=True, read_only=True)
    sections = KpiSectionSerializer(many=True, read_only=True)
    groups = KpiGroupSerializer(many=True, read_only=True)
    metrics = KpiPeriodMetricSerializer(many=True, read_only=True)
    gate_configs = KpiPeriodGateConfigSerializer(many=True, read_only=True)
    reward_tiers = KpiRewardTierConfigSerializer(many=True, read_only=True)

    class Meta:
        model = KpiPeriod
        fields = [
            "id",
            "period_code",
            "period_name",
            "period_type",
            "year",
            "month",
            "quarter",
            "half_year",
            "start_date",
            "end_date",
            "status",
            "total_weight",
            "profiles",
            "sections",
            "groups",
            "metrics",
            "gate_configs",
            "reward_tiers",
            "created_at",
            "updated_at",
        ]


class KpiPeriodWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiPeriod
        fields = [
            "id",
            "period_code",
            "period_name",
            "period_type",
            "year",
            "month",
            "quarter",
            "half_year",
            "start_date",
            "end_date",
            "status",
            "total_weight",
        ]

    def validate_total_weight(self, value):
        if value != 100:
            raise serializers.ValidationError("Tổng trọng số kỳ KPI phải bằng 100%.")
        return value


class CreateMonthlyKpiPeriodSerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)
    activate = serializers.BooleanField(required=False, default=False)

    def create(self, validated_data):
        request = self.context.get("request")
        period, created = create_monthly_kpi_period(
            year=validated_data["year"],
            month=validated_data["month"],
            created_by_user=request.user if request else None,
            activate=validated_data.get("activate", False),
        )
        return {"period": period, "created": created}


class KpiWeightValidationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())


class KpiUserTargetSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    metric_code = serializers.CharField(source="metric.metric_code", read_only=True)
    metric_name = serializers.CharField(source="metric.metric_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = KpiUserTarget
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "metric",
            "metric_code",
            "metric_name",
            "user",
            "user_username",
            "employee",
            "employee_name",
            "branch",
            "branch_name",
            "target_value",
            "target_text",
            "target_unit",
            "assigned_by_user",
            "assigned_at",
            "note",
            "created_at",
            "updated_at",
        ]


class KpiUserTargetWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiUserTarget
        fields = [
            "id",
            "period",
            "profile",
            "metric",
            "user",
            "employee",
            "branch",
            "target_value",
            "target_text",
            "target_unit",
            "assigned_by_user",
            "assigned_at",
            "note",
        ]
        read_only_fields = ["assigned_by_user", "assigned_at"]

    def validate(self, attrs):
        period = attrs.get("period") or getattr(self.instance, "period", None)
        profile = attrs.get("profile") or getattr(self.instance, "profile", None)
        metric = attrs.get("metric") or getattr(self.instance, "metric", None)

        if not profile and metric:
            attrs["profile"] = metric.profile
            profile = metric.profile

        if period and profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        if period and metric and metric.period_id != period.id:
            raise serializers.ValidationError({"metric": "KPI không thuộc kỳ KPI đã chọn."})

        if profile and metric and metric.profile_id != profile.id:
            raise serializers.ValidationError({"metric": "KPI không thuộc bộ KPI đã chọn."})

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["assigned_by_user"] = request.user
            validated_data["assigned_at"] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["assigned_by_user"] = request.user
            validated_data["assigned_at"] = timezone.now()
        return super().update(instance, validated_data)


class KpiUserMetricResultSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    group_code = serializers.CharField(source="group.group_code", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)
    metric_code = serializers.CharField(source="metric.metric_code", read_only=True)
    metric_name = serializers.CharField(source="metric.metric_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)
    scored_by_user_name = serializers.SerializerMethodField()

    class Meta:
        model = KpiUserMetricResult
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "group",
            "group_code",
            "group_name",
            "metric",
            "metric_code",
            "metric_name",
            "user",
            "user_username",
            "user_email",
            "employee",
            "employee_name",
            "branch",
            "branch_name",
            "source_type",
            "actual_value",
            "target_value",
            "window_start_date",
            "window_end_date",
            "denominator_value",
            "contributing_record_count",
            "score",
            "weight_percent",
            "weighted_score",
            "result_status",
            "calculated_payload",
            "evidence_data",
            "scored_by_user",
            "scored_by_user_name",
            "scored_at",
            "calculated_at",
            "note",
            "created_at",
            "updated_at",
        ]

    def get_scored_by_user_name(self, obj):
        if not obj.scored_by_user:
            return None
        return obj.scored_by_user.get_full_name() or obj.scored_by_user.username or obj.scored_by_user.email


class KpiManualScoreSerializer(serializers.Serializer):
    period = serializers.PrimaryKeyRelatedField(queryset=KpiPeriod.objects.all(), required=False, allow_null=True)
    period_code = serializers.CharField(required=False, allow_blank=True)
    profile = serializers.PrimaryKeyRelatedField(queryset=KpiProfile.objects.all(), required=False, allow_null=True)
    profile_code = serializers.CharField(required=False, allow_blank=True)
    metric = serializers.PrimaryKeyRelatedField(
        queryset=KpiPeriodMetric.objects.select_related("period", "profile", "group").all()
    )
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        period = attrs.get("period")
        period_code = attrs.get("period_code")
        profile = attrs.get("profile")
        profile_code = attrs.get("profile_code")
        metric = attrs["metric"]

        if period_code and not period:
            period = KpiPeriod.objects.filter(period_code=period_code).first()
            if not period:
                raise serializers.ValidationError({"period_code": "Không tìm thấy kỳ KPI."})
            attrs["period"] = period

        if not period:
            period = metric.period
            attrs["period"] = period

        if profile_code and not profile:
            profile = KpiProfile.objects.filter(period=period, profile_code=profile_code).first()
            if not profile:
                raise serializers.ValidationError({"profile_code": "Không tìm thấy bộ KPI."})
            attrs["profile"] = profile

        if not profile:
            profile = metric.profile
            attrs["profile"] = profile

        if metric.period_id != period.id:
            raise serializers.ValidationError({"metric": "KPI không thuộc kỳ KPI đã chọn."})

        if metric.profile_id != profile.id:
            raise serializers.ValidationError({"metric": "KPI không thuộc bộ KPI đã chọn."})

        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            raise serializers.ValidationError("Kỳ KPI đã khóa hoặc đã chốt, không thể nhập điểm.")

        if metric.group.group_type == KpiGroup.GROUP_TYPE_AUTO:
            raise serializers.ValidationError({"metric": "Không thể nhập điểm tay cho KPI thuộc nhóm AUTO."})

        return attrs

    def save(self, **kwargs):
        request = self.context.get("request")
        period = self.validated_data["period"]
        profile = self.validated_data["profile"]
        metric = self.validated_data["metric"]
        user = self.validated_data["user"]
        score = self.validated_data["score"]
        note = self.validated_data.get("note") or ""
        employee = getattr(user, "employee", None)
        branch = getattr(employee, "branch", None) if employee else None
        user_target = get_user_target_for_metric(period, profile, metric, user)
        effective_target_value = user_target.target_value if user_target and user_target.target_value is not None else metric.target_value

        result, created = KpiUserMetricResult.objects.update_or_create(
            period=period,
            profile=profile,
            metric=metric,
            user=user,
            defaults={
                "group": metric.group,
                "employee": employee,
                "branch": branch,
                "source_type": KpiUserMetricResult.SOURCE_MANUAL,
                "actual_value": None,
                "target_value": effective_target_value,
                "score": score,
                "weight_percent": metric.weight_percent,
                "result_status": (
                    KpiUserMetricResult.STATUS_GOOD
                    if score >= 80
                    else KpiUserMetricResult.STATUS_WARNING
                    if score >= 70
                    else KpiUserMetricResult.STATUS_BAD
                ),
                "scored_by_user": request.user if request else None,
                "scored_at": timezone.now(),
                "note": note,
            },
        )
        return result, created


class KpiAutoCalculateSerializer(serializers.Serializer):
    period = serializers.PrimaryKeyRelatedField(queryset=KpiPeriod.objects.all(), required=False, allow_null=True)
    period_code = serializers.CharField(required=False, allow_blank=True)
    profile = serializers.PrimaryKeyRelatedField(queryset=KpiProfile.objects.all(), required=False, allow_null=True)
    profile_code = serializers.CharField(required=False, allow_blank=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), required=False, allow_null=True)

    def validate(self, attrs):
        period = attrs.get("period")
        period_code = attrs.get("period_code")
        profile = attrs.get("profile")
        profile_code = attrs.get("profile_code")

        if period_code and not period:
            period = KpiPeriod.objects.filter(period_code=period_code).first()
            if not period:
                raise serializers.ValidationError({"period_code": "Không tìm thấy kỳ KPI."})
            attrs["period"] = period

        if not period:
            raise serializers.ValidationError({"period": "Vui lòng chọn kỳ KPI hoặc period_code."})

        if profile_code and not profile:
            profile = KpiProfile.objects.filter(period=period, profile_code=profile_code).first()
            if not profile:
                raise serializers.ValidationError({"profile_code": "Không tìm thấy bộ KPI."})
            attrs["profile"] = profile

        if profile and profile.period_id != period.id:
            raise serializers.ValidationError({"profile": "Bộ KPI không thuộc kỳ KPI đã chọn."})

        if period.status == KpiPeriod.STATUS_CLOSED:
            raise serializers.ValidationError("Kỳ KPI đã chốt, không thể tính lại.")

        return attrs


class KpiUserGateResultSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    gate_code = serializers.CharField(source="gate_config.gate_code", read_only=True)
    gate_name = serializers.CharField(source="gate_config.gate_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = KpiUserGateResult
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "gate_config",
            "gate_code",
            "gate_name",
            "user",
            "user_username",
            "user_email",
            "employee",
            "employee_name",
            "branch",
            "branch_name",
            "actual_value",
            "threshold_value",
            "operator",
            "is_passed",
            "result_label",
            "calculated_payload",
            "evidence_data",
            "calculated_at",
            "created_at",
            "updated_at",
        ]


class KpiUserSummarySerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    profile_code = serializers.CharField(source="profile.profile_code", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = KpiUserSummary
        fields = [
            "id",
            "period",
            "period_code",
            "profile",
            "profile_code",
            "user",
            "user_username",
            "user_email",
            "employee",
            "employee_name",
            "branch",
            "branch_name",
            "manual_score",
            "auto_score",
            "total_score",
            "manual_weight",
            "auto_weight",
            "all_gates_passed",
            "failed_gate_codes",
            "reward_tier",
            "reward_tier_code",
            "reward_tier_name",
            "rank_overall",
            "rank_branch",
            "rank_fee",
            "rank_reactivated_accounts",
            "calculated_at",
            "locked_at",
            "locked_by_user",
            "created_at",
            "updated_at",
        ]


class KpiSummaryCalculateSerializer(KpiAutoCalculateSerializer):
    pass


class KpiWeightSectionItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    weight_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    is_active = serializers.BooleanField(required=False)


class KpiWeightGroupItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    weight_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    is_active = serializers.BooleanField(required=False)


class KpiWeightMetricItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    weight_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    is_active = serializers.BooleanField(required=False)


class KpiWeightConfigSaveSerializer(serializers.Serializer):
    profile = serializers.IntegerField(required=False)
    profile_code = serializers.CharField(required=False, allow_blank=True)
    sections = KpiWeightSectionItemSerializer(many=True, required=False)
    groups = KpiWeightGroupItemSerializer(many=True, required=False)
    metrics = KpiWeightMetricItemSerializer(many=True, required=False)
