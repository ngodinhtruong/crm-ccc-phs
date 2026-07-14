from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.kpis.auto_calculation import (
    calculate_fake_reactivation_rate,
    get_default_kpi_users,
    get_reactivated_account_nos,
    get_user_sa_records,
    get_user_target_value,
    percent_value,
    decimal_value,
)
from apps.kpis.models import (
    KpiGateDefinition,
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
    KpiUserGateResult,
    KpiUserMetricResult,
    KpiUserSummary,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic


def evaluate_gate_operator(actual_value, operator, threshold_value):
    actual = decimal_value(actual_value)
    threshold = decimal_value(threshold_value)

    if operator == KpiGateDefinition.OP_GTE:
        return actual >= threshold

    if operator == KpiGateDefinition.OP_LTE:
        return actual <= threshold

    if operator == KpiGateDefinition.OP_LT:
        return actual < threshold

    if operator == KpiGateDefinition.OP_GT:
        return actual > threshold

    if operator == KpiGateDefinition.OP_EQ:
        return actual == threshold

    return False


def get_period_metric_by_formula(period, formula_key):
    return KpiPeriodMetric.objects.filter(
        period=period,
        formula_key=formula_key,
        is_active=True,
    ).first()


def calculate_min_calls_rate(period, user, records_queryset):
    total_calls = records_queryset.count()

    total_call_metric = get_period_metric_by_formula(period, "total_calls")
    target_calls = Decimal("0")

    if total_call_metric:
        target_calls = get_user_target_value(period, total_call_metric, user) or Decimal("0")

    actual_value = percent_value(total_calls, target_calls)

    return actual_value, {
        "total_calls": total_calls,
        "target_calls": str(target_calls),
        "formula": "total_calls / target_calls * 100",
        "sa_record_ids": list(records_queryset.values_list("id", flat=True)),
    }


def calculate_icp_complete_rate(records_queryset):
    total_records = records_queryset.count()

    valid_records = records_queryset.filter(icp_group__isnull=False)
    valid_count = valid_records.count()

    actual_value = percent_value(valid_count, total_records)

    return actual_value, {
        "total_records": total_records,
        "valid_icp_records": valid_count,
        "missing_icp_records": total_records - valid_count,
        "missing_icp_record_ids": list(
            records_queryset.filter(icp_group__isnull=True).values_list("id", flat=True)
        ),
    }


def calculate_missing_required_count(records_queryset):
    missing_queryset = records_queryset.filter(
        Q(account_no__isnull=True)
        | Q(account_no="")
        | Q(call_date__isnull=True)
        | Q(call_result__isnull=True)
    )

    return missing_queryset.count(), {
        "missing_required_record_ids": list(missing_queryset.values_list("id", flat=True)),
        "required_fields": ["account_no", "call_date", "call_result"],
    }


def calculate_gate_actual_value(period, user, gate_config, records_queryset):
    formula_key = gate_config.formula_key

    if formula_key == "min_calls_rate":
        return calculate_min_calls_rate(period, user, records_queryset)

    if formula_key == "icp_complete_rate":
        return calculate_icp_complete_rate(records_queryset)

    if formula_key == "fake_reactivation_rate":
        return calculate_fake_reactivation_rate(period, records_queryset)

    if formula_key == "missing_required_count":
        return calculate_missing_required_count(records_queryset)

    return Decimal("0.0000"), {
        "warning": f"Chưa hỗ trợ gate formula_key: {formula_key}",
    }


def save_gate_result(
    *,
    period,
    gate_config,
    user,
    actual_value,
    evidence_data,
    calculated_by_user=None,
):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None

    is_passed = evaluate_gate_operator(
        actual_value=actual_value,
        operator=gate_config.operator,
        threshold_value=gate_config.threshold_value,
    )

    old_result = KpiUserGateResult.objects.filter(
        period=period,
        gate_config=gate_config,
        user=user,
    ).first()

    old_data = serialize_model_basic(old_result) if old_result else None

    result, created = KpiUserGateResult.objects.update_or_create(
        period=period,
        gate_config=gate_config,
        user=user,
        defaults={
            "employee": employee,
            "branch": branch,
            "actual_value": actual_value,
            "threshold_value": gate_config.threshold_value,
            "operator": gate_config.operator,
            "is_passed": is_passed,
            "result_label": "Đạt" if is_passed else "Không đạt",
            "calculated_payload": {
                "formula_key": gate_config.formula_key,
                "actual_value": str(actual_value),
                "threshold_value": str(gate_config.threshold_value),
                "operator": gate_config.operator,
            },
            "evidence_data": evidence_data,
            "calculated_at": timezone.now(),
        },
    )

    create_kpi_audit_log(
        period=period,
        object_type="KpiUserGateResult",
        object_id=result.id,
        action_type="CREATE" if created else "UPDATE",
        changed_by_user=calculated_by_user,
        old_data=old_data,
        new_data=serialize_model_basic(result),
        note="Tính điều kiện cổng KPI.",
    )

    return result, created


def calculate_gates_for_user(*, period, user, calculated_by_user=None):
    records_queryset = get_user_sa_records(period, user)

    gate_configs = KpiPeriodGateConfig.objects.filter(
        period=period,
        is_active=True,
    ).select_related("gate_definition")

    results = []

    for gate_config in gate_configs:
        actual_value, evidence_data = calculate_gate_actual_value(
            period,
            user,
            gate_config,
            records_queryset,
        )

        result, created = save_gate_result(
            period=period,
            gate_config=gate_config,
            user=user,
            actual_value=decimal_value(actual_value),
            evidence_data=evidence_data,
            calculated_by_user=calculated_by_user,
        )

        results.append(
            {
                "result": result,
                "created": created,
            }
        )

    return results


def get_group_weight(period, group_type):
    return (
        KpiGroup.objects.filter(
            period=period,
            group_type=group_type,
            is_active=True,
        ).aggregate(total=Sum("weight_percent"))["total"]
        or Decimal("0")
    )


def get_user_metric_score_sum(period, user, source_type):
    return (
        KpiUserMetricResult.objects.filter(
            period=period,
            user=user,
            source_type=source_type,
        ).aggregate(total=Sum("weighted_score"))["total"]
        or Decimal("0")
    )


def get_failed_gate_codes(period, user):
    failed_results = KpiUserGateResult.objects.filter(
        period=period,
        user=user,
        gate_config__is_active=True,
        gate_config__is_required=True,
        is_passed=False,
    ).select_related("gate_config")

    return list(failed_results.values_list("gate_config__gate_code", flat=True))


def all_required_gates_passed(period, user):
    required_gate_count = KpiPeriodGateConfig.objects.filter(
        period=period,
        is_active=True,
        is_required=True,
    ).count()

    passed_gate_count = KpiUserGateResult.objects.filter(
        period=period,
        user=user,
        gate_config__is_active=True,
        gate_config__is_required=True,
        is_passed=True,
    ).count()

    return required_gate_count > 0 and required_gate_count == passed_gate_count


def save_user_summary(*, period, user, calculated_by_user=None):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None

    manual_score = get_user_metric_score_sum(
        period,
        user,
        KpiMetricDefinition.INPUT_MANUAL,
    )
    auto_score = get_user_metric_score_sum(
        period,
        user,
        KpiMetricDefinition.INPUT_AUTO,
    )
    total_score = manual_score + auto_score

    manual_weight = get_group_weight(period, KpiGroup.GROUP_TYPE_MANUAL)
    auto_weight = get_group_weight(period, KpiGroup.GROUP_TYPE_AUTO)

    failed_gate_codes = get_failed_gate_codes(period, user)
    gates_passed = all_required_gates_passed(period, user)

    old_summary = KpiUserSummary.objects.filter(
        period=period,
        user=user,
    ).first()

    old_data = serialize_model_basic(old_summary) if old_summary else None

    summary, created = KpiUserSummary.objects.update_or_create(
        period=period,
        user=user,
        defaults={
            "employee": employee,
            "branch": branch,
            "manual_score": manual_score,
            "auto_score": auto_score,
            "total_score": total_score,
            "manual_weight": manual_weight,
            "auto_weight": auto_weight,
            "all_gates_passed": gates_passed,
            "failed_gate_codes": failed_gate_codes,
            "calculated_at": timezone.now(),
        },
    )

    create_kpi_audit_log(
        period=period,
        object_type="KpiUserSummary",
        object_id=summary.id,
        action_type="CREATE" if created else "UPDATE",
        changed_by_user=calculated_by_user,
        old_data=old_data,
        new_data=serialize_model_basic(summary),
        note="Tổng hợp KPI cá nhân.",
    )

    return summary, created


def get_metric_actual_value(period, user, metric_definition_code):
    result = (
        KpiUserMetricResult.objects.filter(
            period=period,
            user=user,
            metric__metric_definition__metric_code=metric_definition_code,
        )
        .order_by("-id")
        .first()
    )

    if not result:
        return Decimal("0")

    return result.actual_value or Decimal("0")


def build_rank_map(rows):
    rank_map = {}

    current_rank = 0
    last_value = None

    for index, row in enumerate(rows, start=1):
        value = row["value"]

        if last_value is None or value != last_value:
            current_rank = index

        rank_map[row["summary"].id] = current_rank
        last_value = value

    return rank_map


def calculate_overall_rank_map(period):
    summaries = list(
        KpiUserSummary.objects.filter(period=period).order_by("-total_score", "id")
    )

    return build_rank_map(
        [
            {
                "summary": summary,
                "value": summary.total_score or Decimal("0"),
            }
            for summary in summaries
        ]
    )


def calculate_branch_rank_map(period):
    rank_map = {}

    branch_ids = (
        KpiUserSummary.objects.filter(period=period)
        .exclude(branch_id__isnull=True)
        .values_list("branch_id", flat=True)
        .distinct()
    )

    for branch_id in branch_ids:
        summaries = list(
            KpiUserSummary.objects.filter(
                period=period,
                branch_id=branch_id,
            ).order_by("-total_score", "id")
        )

        rank_map.update(
            build_rank_map(
                [
                    {
                        "summary": summary,
                        "value": summary.total_score or Decimal("0"),
                    }
                    for summary in summaries
                ]
            )
        )

    return rank_map


def calculate_metric_rank_map(period, metric_definition_code):
    summaries = list(KpiUserSummary.objects.filter(period=period).order_by("id"))

    rows = []

    for summary in summaries:
        rows.append(
            {
                "summary": summary,
                "value": get_metric_actual_value(
                    period,
                    summary.user,
                    metric_definition_code,
                ),
            }
        )

    rows.sort(key=lambda item: (-item["value"], item["summary"].id))

    return build_rank_map(rows)


def get_reward_tier(period, summary):
    tiers = {
        tier.tier_code: tier
        for tier in KpiRewardTierConfig.objects.filter(
            period=period,
            is_active=True,
        )
    }

    failed_tier = tiers.get("FAILED")
    standard_tier = tiers.get("STANDARD")
    silver_tier = tiers.get("SILVER")
    gold_tier = tiers.get("GOLD")

    if not summary.all_gates_passed:
        return failed_tier

    if gold_tier and summary.rank_fee and gold_tier.rank_limit:
        if summary.rank_fee <= gold_tier.rank_limit:
            return gold_tier

    if silver_tier and summary.rank_reactivated_accounts and silver_tier.rank_limit:
        if summary.rank_reactivated_accounts <= silver_tier.rank_limit:
            return silver_tier

    if standard_tier:
        min_score = standard_tier.min_total_score or Decimal("70.00")

        if summary.total_score >= min_score:
            return standard_tier

    return failed_tier


def update_ranks_and_rewards(period, calculated_by_user=None):
    overall_rank_map = calculate_overall_rank_map(period)
    branch_rank_map = calculate_branch_rank_map(period)
    fee_rank_map = calculate_metric_rank_map(period, "TOTAL_FEE")
    reactivated_rank_map = calculate_metric_rank_map(period, "REACTIVATED_ACCOUNTS")

    summaries = KpiUserSummary.objects.filter(period=period).select_related("user")

    for summary in summaries:
        old_data = serialize_model_basic(summary)

        summary.rank_overall = overall_rank_map.get(summary.id)
        summary.rank_branch = branch_rank_map.get(summary.id)
        summary.rank_fee = fee_rank_map.get(summary.id)
        summary.rank_reactivated_accounts = reactivated_rank_map.get(summary.id)

        reward_tier = get_reward_tier(period, summary)

        summary.reward_tier = reward_tier
        summary.reward_tier_code = reward_tier.tier_code if reward_tier else None
        summary.reward_tier_name = reward_tier.tier_name if reward_tier else None
        summary.calculated_at = timezone.now()

        summary.save(
            update_fields=[
                "rank_overall",
                "rank_branch",
                "rank_fee",
                "rank_reactivated_accounts",
                "reward_tier",
                "reward_tier_code",
                "reward_tier_name",
                "calculated_at",
                "updated_at",
            ]
        )

        create_kpi_audit_log(
            period=period,
            object_type="KpiUserSummary",
            object_id=summary.id,
            action_type="UPDATE",
            changed_by_user=calculated_by_user,
            old_data=old_data,
            new_data=serialize_model_basic(summary),
            note="Cập nhật xếp hạng và bậc thưởng KPI.",
        )


@transaction.atomic
def calculate_kpi_summaries(
    *,
    period,
    users=None,
    branch_id=None,
    calculated_by_user=None,
):
    if period.status == KpiPeriod.STATUS_CLOSED:
        raise ValueError("Kỳ KPI đã chốt, không thể tổng hợp lại.")

    if users is None:
        users = get_default_kpi_users(branch_id=branch_id)

    summaries = []

    for user in users:
        calculate_gates_for_user(
            period=period,
            user=user,
            calculated_by_user=calculated_by_user,
        )

        summary, created = save_user_summary(
            period=period,
            user=user,
            calculated_by_user=calculated_by_user,
        )

        summaries.append(
            {
                "summary": summary,
                "created": created,
            }
        )

    update_ranks_and_rewards(
        period,
        calculated_by_user=calculated_by_user,
    )

    refreshed_summaries = []

    for item in summaries:
        refreshed_summaries.append(
            {
                "summary": KpiUserSummary.objects.select_related(
                    "period",
                    "user",
                    "employee",
                    "branch",
                    "reward_tier",
                ).get(id=item["summary"].id),
                "created": item["created"],
            }
        )

    return refreshed_summaries