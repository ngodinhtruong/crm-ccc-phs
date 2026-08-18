import calendar
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.kpis.defaults import (
    DEFAULT_KPI_GROUPS,
    DEFAULT_KPI_PERIOD_METRICS,
    DEFAULT_KPI_PROFILES,
    DEFAULT_KPI_SECTIONS,
    DEFAULT_REWARD_TIERS,
)
from apps.kpis.models import (
    KpiAuditLog,
    KpiGateDefinition,
    KpiGroup,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiProfile,
    KpiRewardTierConfig,
    KpiSection,
)


def get_month_range(year: int, month: int):
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def build_monthly_period_code(year: int, month: int):
    return f"KPI_{year}_{month:02d}"


def build_monthly_period_name(year: int, month: int):
    return f"KPI tháng {month:02d}/{year}"


def serialize_model_basic(obj):
    if obj is None:
        return None

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

    profiles_by_code = create_default_profiles(period)
    sections_by_key = create_default_sections(period, profiles_by_code)
    groups_by_key = create_default_groups(period, profiles_by_code, sections_by_key)
    create_default_period_metrics(period, profiles_by_code, groups_by_key)
    create_default_gate_configs(period, profiles_by_code)
    create_default_reward_tiers(period, profiles_by_code)

    period.validate_weight_configuration()

    if activate:
        old_data = serialize_model_basic(period)
        period.status = KpiPeriod.STATUS_ACTIVE
        period.updated_by_user = created_by_user
        period.save(update_fields=["status", "updated_by_user", "updated_at"])

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriod",
            object_id=period.id,
            action_type=KpiAuditLog.ACTION_UPDATE,
            changed_by_user=created_by_user,
            old_data=old_data,
            new_data=serialize_model_basic(period),
            note="Kích hoạt kỳ KPI sau khi validate trọng số.",
        )

    return period, True


def create_default_profiles(period: KpiPeriod):
    profiles_by_code = {}

    for item in DEFAULT_KPI_PROFILES:
        profile = KpiProfile.objects.create(
            period=period,
            profile_code=item["profile_code"],
            profile_name=item["profile_name"],
            target_role_code=item["target_role_code"],
            total_weight=item.get("total_weight", "100.00"),
            sort_order=item.get("sort_order", 0),
            is_active=True,
        )
        profiles_by_code[profile.profile_code] = profile

        create_kpi_audit_log(
            period=period,
            object_type="KpiProfile",
            object_id=profile.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(profile),
            note="Tạo bộ KPI mặc định.",
        )

    return profiles_by_code


def create_default_sections(period: KpiPeriod, profiles_by_code: dict):
    sections_by_key = {}

    for item in DEFAULT_KPI_SECTIONS:
        profile = profiles_by_code.get(item["profile_code"])

        if not profile:
            raise ValidationError(f"Không tìm thấy bộ KPI: {item['profile_code']}")

        section = KpiSection.objects.create(
            period=period,
            profile=profile,
            section_code=item["section_code"],
            section_name=item["section_name"],
            weight_percent=item["weight_percent"],
            sort_order=item.get("sort_order", 0),
            is_active=True,
        )
        sections_by_key[(profile.profile_code, section.section_code)] = section

        create_kpi_audit_log(
            period=period,
            object_type="KpiSection",
            object_id=section.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(section),
            note="Tạo phần KPI mặc định.",
        )

    return sections_by_key


def create_default_groups(period: KpiPeriod, profiles_by_code: dict, sections_by_key: dict):
    groups_by_key = {}

    for item in DEFAULT_KPI_GROUPS:
        profile = profiles_by_code.get(item["profile_code"])
        section = sections_by_key.get((item["profile_code"], item["section_code"]))

        if not profile:
            raise ValidationError(f"Không tìm thấy bộ KPI: {item['profile_code']}")

        if not section:
            raise ValidationError(
                f"Không tìm thấy phần KPI {item['section_code']} trong bộ {item['profile_code']}"
            )

        group = KpiGroup.objects.create(
            period=period,
            profile=profile,
            section=section,
            group_code=item["group_code"],
            group_name=item["group_name"],
            group_type=item["group_type"],
            weight_percent=item["weight_percent"],
            sort_order=item.get("sort_order", 0),
            is_active=True,
        )
        groups_by_key[(profile.profile_code, group.group_code)] = group

        create_kpi_audit_log(
            period=period,
            object_type="KpiGroup",
            object_id=group.id,
            action_type=KpiAuditLog.ACTION_CREATE,
            new_data=serialize_model_basic(group),
            note="Tạo nhóm KPI mặc định.",
        )

    return groups_by_key


def create_default_period_metrics(period: KpiPeriod, profiles_by_code: dict, groups_by_key: dict):
    for item in DEFAULT_KPI_PERIOD_METRICS:
        profile = profiles_by_code.get(item["profile_code"])
        group = groups_by_key.get((item["profile_code"], item["group_code"]))

        if not profile:
            raise ValidationError(f"Không tìm thấy bộ KPI: {item['profile_code']}")

        if not group:
            raise ValidationError(
                f"Không tìm thấy nhóm KPI {item['group_code']} trong bộ {item['profile_code']}"
            )

        period_metric = KpiPeriodMetric.objects.create(
            period=period,
            profile=profile,
            group=group,
            metric_code=item["metric_code"],
            metric_name=item["metric_name"],
            weight_percent=item["weight_percent"],
            measurement_formula=item.get("measurement_formula", ""),
            target_text=item.get("target_text", ""),
            target_value=item.get("target_value"),
            target_unit=item.get("target_unit", ""),
            frequency=item.get("frequency", ""),
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


def create_default_gate_configs(period: KpiPeriod, profiles_by_code: dict):
    gate_definitions = KpiGateDefinition.objects.filter(is_active=True).order_by("gate_code")

    for profile in profiles_by_code.values():
        for gate_definition in gate_definitions:
            gate_config = KpiPeriodGateConfig.objects.create(
                period=period,
                profile=profile,
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


def create_default_reward_tiers(period: KpiPeriod, profiles_by_code: dict):
    for profile in profiles_by_code.values():
        for item in DEFAULT_REWARD_TIERS:
            reward_tier = KpiRewardTierConfig.objects.create(
                period=period,
                profile=profile,
                tier_code=item["tier_code"],
                tier_name=item["tier_name"],
                description=item.get("description", ""),
                rank_metric_code=item.get("rank_metric_code"),
                rank_limit=item.get("rank_limit"),
                min_total_score=item.get("min_total_score"),
                require_all_gates_passed=item.get("require_all_gates_passed", True),
                reward_type=item.get("reward_type"),
                sort_order=item.get("sort_order", 0),
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


def ensure_default_kpi_structures_for_period(period: KpiPeriod):
    """
    Đảm bảo kỳ KPI (kể cả các kỳ cũ đã khởi tạo trước đó) có đầy đủ các profile, section, group (đặc biệt là B4)
    và metrics (B4_26, B4_27, B4_28) theo định nghĩa mới nhất trong defaults.py.
    """
    from apps.kpis.models import (
        KpiProfile,
        KpiSection,
        KpiGroup,
        KpiPeriodMetric,
    )
    from apps.kpis.defaults import (
        DEFAULT_KPI_PROFILES,
        DEFAULT_KPI_SECTIONS,
        DEFAULT_KPI_GROUPS,
        DEFAULT_KPI_PERIOD_METRICS,
    )

    # 1. Profiles
    profiles_by_code = {}
    for item in DEFAULT_KPI_PROFILES:
        prof = KpiProfile.objects.filter(
            period=period,
            profile_code=item["profile_code"],
        ).first()

        if not prof:
            prof = KpiProfile.objects.create(
                period=period,
                profile_code=item["profile_code"],
                profile_name=item["profile_name"],
                target_role_code=item["target_role_code"],
                total_weight=item.get("total_weight", "100.00"),
                sort_order=item.get("sort_order", 0),
                is_active=True,
            )
        elif not prof.is_active:
            prof.is_active = True
            prof.save(update_fields=["is_active"])

        profiles_by_code[prof.profile_code] = prof

    # 2. Sections
    sections_by_key = {}
    for item in DEFAULT_KPI_SECTIONS:
        prof = profiles_by_code.get(item["profile_code"])
        if not prof:
            continue

        sec = KpiSection.objects.filter(
            period=period,
            section_code=item["section_code"],
        ).first()

        if not sec:
            sec = KpiSection.objects.create(
                period=period,
                profile=prof,
                section_code=item["section_code"],
                section_name=item["section_name"],
                weight_percent=item["weight_percent"],
                sort_order=item.get("sort_order", 0),
                is_active=True,
            )
        else:
            sec_fields = []
            if not sec.is_active:
                sec.is_active = True
                sec_fields.append("is_active")
            if sec.profile_id != prof.id:
                sec.profile = prof
                sec_fields.append("profile")
            if sec_fields:
                sec.save(update_fields=sec_fields)

        sections_by_key[(prof.profile_code, sec.section_code)] = sec

    # 3. Groups
    groups_by_key = {}
    for item in DEFAULT_KPI_GROUPS:
        prof = profiles_by_code.get(item["profile_code"])
        sec = sections_by_key.get((item["profile_code"], item["section_code"]))
        if not prof or not sec:
            continue

        grp = KpiGroup.objects.filter(
            period=period,
            group_code=item["group_code"],
        ).first()

        if not grp:
            grp = KpiGroup.objects.create(
                period=period,
                profile=prof,
                section=sec,
                group_code=item["group_code"],
                group_name=item["group_name"],
                group_type=item["group_type"],
                weight_percent=item["weight_percent"],
                sort_order=item.get("sort_order", 0),
                is_active=True,
            )
        else:
            group_updated_fields = []
            if not grp.is_active:
                grp.is_active = True
                group_updated_fields.append("is_active")
            if grp.section_id != sec.id:
                grp.section = sec
                group_updated_fields.append("section")
            if grp.profile_id != prof.id:
                grp.profile = prof
                group_updated_fields.append("profile")
            if group_updated_fields:
                grp.save(update_fields=group_updated_fields)

        groups_by_key[(prof.profile_code, grp.group_code)] = grp

    # 4. Metrics
    for item in DEFAULT_KPI_PERIOD_METRICS:
        prof = profiles_by_code.get(item["profile_code"])
        grp = groups_by_key.get((item["profile_code"], item["group_code"]))
        if not prof or not grp:
            continue

        m = KpiPeriodMetric.objects.filter(
            period=period,
            metric_code=item["metric_code"],
        ).first()

        if not m:
            formula = item.get("measurement_formula") or "Tự động đo lường từ dữ liệu CRM"
            m = KpiPeriodMetric.objects.create(
                period=period,
                profile=prof,
                group=grp,
                metric_code=item["metric_code"],
                metric_name=item["metric_name"],
                weight_percent=item["weight_percent"],
                measurement_formula=formula,
                target_text=item.get("target_text", ""),
                target_value=item.get("target_value"),
                target_unit=item.get("target_unit", "COUNT"),
                frequency=item.get("frequency", "MONTHLY"),
                is_active=True,
            )
        else:
            metric_updated_fields = []
            if not m.is_active:
                m.is_active = True
                metric_updated_fields.append("is_active")
            if m.group_id != grp.id:
                m.group = grp
                metric_updated_fields.append("group")
            if m.profile_id != prof.id:
                m.profile = prof
                metric_updated_fields.append("profile")
            if metric_updated_fields:
                m.save(update_fields=metric_updated_fields)
