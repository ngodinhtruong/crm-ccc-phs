from rest_framework import serializers
from apps.branches.models import Branch
from apps.kpis.models import (
    KpiGateDefinition,
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
)
from apps.kpis.services import create_monthly_kpi_period

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.kpis.models import KpiUserMetricResult

class KpiMetricDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiMetricDefinition
        fields = "__all__"


class KpiGateDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KpiGateDefinition
        fields = "__all__"


class KpiGroupSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)

    class Meta:
        model = KpiGroup
        fields = [
            "id",
            "period",
            "period_code",
            "group_code",
            "group_name",
            "group_type",
            "weight_percent",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["period", "period_code", "group_code", "group_type"]


class KpiPeriodMetricSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    group_code = serializers.CharField(source="group.group_code", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)
    branch = serializers.PrimaryKeyRelatedField(
            queryset=Branch.objects.all(),
            required=False,
            allow_null=True,
        )
    definition_code = serializers.CharField(
        source="metric_definition.metric_code",
        read_only=True,
    )

    class Meta:
        model = KpiPeriodMetric
        fields = [
            "id",
            "period",
            "period_code",
            "group",
            "group_code",
            "group_name",
            "metric_definition",
            "definition_code",
            "metric_code",
            "metric_name",
            "input_type",
            "formula_key",
            "weight_percent",
            "target_value",
            "min_value",
            "max_value",
            "score_direction",
            "formula_config",
            "description",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "period",
            "period_code",
            "group",
            "group_code",
            "group_name",
            "metric_definition",
            "definition_code",
            "metric_code",
            "input_type",
            "formula_key",
        ]


class KpiPeriodGateConfigSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)
    definition_code = serializers.CharField(
        source="gate_definition.gate_code",
        read_only=True,
    )

    class Meta:
        model = KpiPeriodGateConfig
        fields = [
            "id",
            "period",
            "period_code",
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
        read_only_fields = [
            "period",
            "period_code",
            "gate_definition",
            "definition_code",
            "gate_code",
            "formula_key",
        ]


class KpiRewardTierConfigSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)

    class Meta:
        model = KpiRewardTierConfig
        fields = [
            "id",
            "period",
            "period_code",
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
        read_only_fields = ["period", "period_code", "tier_code"]


class KpiPeriodListSerializer(serializers.ModelSerializer):
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
            "group_count",
            "metric_count",
            "gate_count",
            "reward_tier_count",
            "created_at",
            "updated_at",
        ]


class KpiPeriodDetailSerializer(serializers.ModelSerializer):
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
            "groups",
            "metrics",
            "gate_configs",
            "reward_tiers",
            "created_at",
            "updated_at",
        ]


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

        return {
            "period": period,
            "created": created,
        }


class KpiWeightValidationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())


class KpiUserMetricResultSerializer(serializers.ModelSerializer):
    period_code = serializers.CharField(source="period.period_code", read_only=True)

    group_code = serializers.CharField(source="group.group_code", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)

    metric_code = serializers.CharField(source="metric.metric_code", read_only=True)
    metric_name = serializers.CharField(source="metric.metric_name", read_only=True)
    metric_input_type = serializers.CharField(source="metric.input_type", read_only=True)

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
            "group",
            "group_code",
            "group_name",
            "metric",
            "metric_code",
            "metric_name",
            "metric_input_type",
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

        return (
            obj.scored_by_user.get_full_name()
            or obj.scored_by_user.username
            or obj.scored_by_user.email
        )


class KpiManualScoreSerializer(serializers.Serializer):
    period = serializers.PrimaryKeyRelatedField(
        queryset=KpiPeriod.objects.all(),
        required=False,
        allow_null=True,
    )
    period_code = serializers.CharField(required=False, allow_blank=True)

    metric = serializers.PrimaryKeyRelatedField(
        queryset=KpiPeriodMetric.objects.select_related(
            "period",
            "group",
            "metric_definition",
        ).all()
    )

    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all()
    )

    score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
    )

    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate(self, attrs):
        period = attrs.get("period")
        period_code = attrs.get("period_code")
        metric = attrs["metric"]

        if period_code and not period:
            period = KpiPeriod.objects.filter(period_code=period_code).first()

            if not period:
                raise serializers.ValidationError(
                    {"period_code": "Không tìm thấy kỳ KPI."}
                )

            attrs["period"] = period

        if not period:
            period = metric.period
            attrs["period"] = period

        if metric.period_id != period.id:
            raise serializers.ValidationError(
                {"metric": "Chỉ tiêu KPI không thuộc kỳ KPI đã chọn."}
            )

        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            raise serializers.ValidationError(
                "Kỳ KPI đã khóa hoặc đã chốt, không thể nhập điểm."
            )

        if metric.input_type != KpiMetricDefinition.INPUT_MANUAL:
            raise serializers.ValidationError(
                {"metric": "Chỉ được nhập điểm tay cho KPI Phần A / MANUAL."}
            )

        return attrs

    def save(self, **kwargs):
        request = self.context.get("request")

        period = self.validated_data["period"]
        metric = self.validated_data["metric"]
        user = self.validated_data["user"]
        score = self.validated_data["score"]
        note = self.validated_data.get("note") or ""

        employee = getattr(user, "employee", None)
        branch = getattr(employee, "branch", None) if employee else None

        result, created = KpiUserMetricResult.objects.update_or_create(
            period=period,
            metric=metric,
            user=user,
            defaults={
                "group": metric.group,
                "employee": employee,
                "branch": branch,
                "source_type": KpiMetricDefinition.INPUT_MANUAL,
                "actual_value": None,
                "target_value": metric.target_value,
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
    period = serializers.PrimaryKeyRelatedField(
        queryset=KpiPeriod.objects.all(),
        required=False,
        allow_null=True,
    )
    period_code = serializers.CharField(required=False, allow_blank=True)

    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all(),
        required=False,
        allow_null=True,
    )

    branch = serializers.PrimaryKeyRelatedField(
        queryset=__import__("apps.branches.models", fromlist=["Branch"]).Branch.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        period = attrs.get("period")
        period_code = attrs.get("period_code")

        if period_code and not period:
            period = KpiPeriod.objects.filter(period_code=period_code).first()

            if not period:
                raise serializers.ValidationError(
                    {"period_code": "Không tìm thấy kỳ KPI."}
                )

            attrs["period"] = period

        if not period:
            raise serializers.ValidationError(
                {"period": "Vui lòng chọn kỳ KPI hoặc period_code."}
            )

        if period.status == KpiPeriod.STATUS_CLOSED:
            raise serializers.ValidationError(
                "Kỳ KPI đã chốt, không thể tính lại."
            )

        return attrs