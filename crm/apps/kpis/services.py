import calendar
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.kpis.defaults import (
    DEFAULT_KPI_GROUPS,
    DEFAULT_KPI_PERIOD_METRICS,
    DEFAULT_REWARD_TIERS,
)
from apps.kpis.models import (
    KpiAuditLog,
    KpiGateDefinition,
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
)


def get_month_range(year: int, month: int):
    last_day = calendar.monthrange(year, month)[1]

    return date(year, month, 1), date(year, month, last_day)


def build_monthly_period_code(year: int, month: int):
    return f"KPI_{year}_{month:02d}"


def build_monthly_period_name(year: int, month: int):
    return f"KPI tháng {month:02d}/{year}"


def serialize_model_basic(obj):
    data = {}

    for field in obj._meta.fields:
        value = getattr(obj, field.name)

        if hasattr(value, "pk"):
            value = value.pk

        if isinstance(value, Decimal):
            value = str(value)

        if isinstance(value, date):
            value = value.isoformat()

        data[field.name] = value

    return data


def create_kpi_audit_log(
    *,
    period=None,
    object_type: str,
    object_id=None,
    action_type: str,
    changed_by_user=None,
    old_data=None,
    new_data=None,
    note=None,
):
    old_data = old_data or {}
    new_data = new_data or {}

    changed_fields = []

    for key, value in new_data.items():
        if old_data.get(key) != value:
            changed_fields.append(key)

    return KpiAuditLog.objects.create(
        period=period,
        object_type=object_type,
        object_id=object_id,
        action_type=action_type,
        old_data=old_data or None,
        new_data=new_data or None,
        changed_fields=changed_fields,
        changed_by_user=changed_by_user,
        note=note,
    )


@transaction.atomic
def create_monthly_kpi_period(
    *,
    year: int,
    month: int,
    created_by_user=None,
    activate: bool = False,
):
    if month < 1 or month > 12:
        raise ValidationError("Tháng KPI không hợp lệ.")

    period_code = build_monthly_period_code(year, month)
    period_name = build_monthly_period_name(year, month)
    start_date, end_date = get_month_range(year, month)

    existing_period = KpiPeriod.objects.filter(period_code=period_code).first()

    if existing_period:
        return existing_period, False

    period = KpiPeriod.objects.create(
        period_code=period_code,
        period_name=period_name,
        period_type=KpiPeriod.PERIOD_MONTH,
        year=year,
        month=month,
        start_date=start_date,
        end_date=end_date,
        status=KpiPeriod.STATUS_DRAFT,
        total_weight=Decimal("100.00"),
        created_by_user=created_by_user,
        updated_by_user=created_by_user,
    )

    create_kpi_audit_log(
        period=period,
        object_type="KpiPeriod",
        object_id=period.id,
        action_type=KpiAuditLog.ACTION_CREATE,
        changed_by_user=created_by_user,
        new_data=serialize_model_basic(period),
        note="Tạo kỳ KPI tháng.",
    )

    groups_by_code = create_default_groups(period)
    create_default_period_metrics(period, groups_by_code)
    create_default_gate_configs(period)
    create_default_reward_tiers(period)

    period.validate_weight_configuration()

    if activate:
        period.status = KpiPeriod.STATUS_ACTIVE
        period.updated_by_user = created_by_user
        period.save(update_fields=["status", "updated_by_user", "updated_at"])

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriod",
            object_id=period.id,
            action_type=KpiAuditLog.ACTION_UPDATE,
            changed_by_user=created_by_user,
            old_data={"status": KpiPeriod.STATUS_DRAFT},
            new_data={"status": KpiPeriod.STATUS_ACTIVE},
            note="Kích hoạt kỳ KPI sau khi validate trọng số.",
        )

    return period, True


def create_default_groups(period: KpiPeriod):
    groups_by_code = {}

    for item in DEFAULT_KPI_GROUPS:
        group = KpiGroup.objects.create(
            period=period,
            group_code=item["group_code"],
            group_name=item["group_name"],
            group_type=item["group_type"],
            weight_percent=item["weight_percent"],
            sort_order=item["sort_order"],
            is_active=True,
        )

        groups_by_code[group.group_code] = group

        create_kpi_audit_log(
            period=period,
            object_type="KpiGroup",
            object_id=group.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(group),
            note="Tạo nhóm KPI mặc định.",
        )

    return groups_by_code


def create_default_period_metrics(period: KpiPeriod, groups_by_code: dict):
    for item in DEFAULT_KPI_PERIOD_METRICS:
        metric_definition = KpiMetricDefinition.objects.filter(
            metric_code=item["metric_definition_code"],
            is_active=True,
        ).first()

        if not metric_definition:
            raise ValidationError(
                f"Không tìm thấy KPI metric definition: {item['metric_definition_code']}"
            )

        group = groups_by_code.get(item["group_code"])

        if not group:
            raise ValidationError(f"Không tìm thấy nhóm KPI: {item['group_code']}")

        KpiPeriodMetric.objects.create(
            period=period,
            group=group,
            metric_definition=definition,
            metric_code=item["metric_code"],
            metric_name=item["metric_name"],
            kpi_type=item["kpi_type"],
            input_type=item["input_type"],
            formula_key=item["formula_key"],
            work_description=item.get("work_description", ""),
            measurement_formula=item.get("measurement_formula", ""),
            target_text=item.get("target_text", ""),
            frequency=item.get("frequency", ""),
            weight_percent=item["weight_percent"],
            target_value=item.get("target_value"),
            description=item.get("work_description", ""),
            sort_order=item.get("sort_order", 0),
            is_active=True,
        )

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriodMetric",
            object_id=period_metric.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(period_metric),
            note="Tạo chỉ tiêu KPI mặc định.",
        )


def create_default_gate_configs(period: KpiPeriod):
    gate_definitions = KpiGateDefinition.objects.filter(is_active=True).order_by("gate_code")

    for gate_definition in gate_definitions:
        gate_config = KpiPeriodGateConfig.objects.create(
            period=period,
            gate_definition=gate_definition,
            gate_code=gate_definition.gate_code,
            gate_name=gate_definition.gate_name,
            formula_key=gate_definition.formula_key,
            operator=gate_definition.operator,
            threshold_value=gate_definition.default_threshold or Decimal("0.0000"),
            is_required=True,
            is_active=True,
        )

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriodGateConfig",
            object_id=gate_config.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(gate_config),
            note="Tạo điều kiện cổng KPI mặc định.",
        )


def create_default_reward_tiers(period: KpiPeriod):
    for item in DEFAULT_REWARD_TIERS:
        reward_tier = KpiRewardTierConfig.objects.create(
            period=period,
            tier_code=item["tier_code"],
            tier_name=item["tier_name"],
            description=item["description"],
            rank_metric_code=item["rank_metric_code"],
            rank_limit=item["rank_limit"],
            min_total_score=item["min_total_score"],
            require_all_gates_passed=item["require_all_gates_passed"],
            reward_type=item["reward_type"],
            sort_order=item["sort_order"],
            is_active=True,
        )

        create_kpi_audit_log(
            period=period,
            object_type="KpiRewardTierConfig",
            object_id=reward_tier.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(reward_tier),
            note="Tạo bậc thưởng KPI mặc định.",
        )