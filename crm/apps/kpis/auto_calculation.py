from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.db.models import Q, Sum
from django.utils import timezone

from apps.accounts.models import Role
from apps.kpis.models import (
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodMetric,
    KpiUserMetricResult,
    KpiUserTarget,
    TransactionLog,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic
from apps.sale_admin.models import SaRecord


MATCHED_STATUS = "MATCHED"


def decimal_value(value):
    if value is None:
        return Decimal("0.0000")

    return Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def percent_value(numerator, denominator):
    numerator = Decimal(str(numerator or 0))
    denominator = Decimal(str(denominator or 0))

    if denominator == 0:
        return Decimal("0.0000")

    return ((numerator / denominator) * Decimal("100")).quantize(
        Decimal("0.0001"),
        rounding=ROUND_HALF_UP,
    )


def get_score(actual_value, target_value):
    actual = decimal_value(actual_value)
    target = decimal_value(target_value)

    

    if target <= 0:
        return Decimal("100.00") if actual > 0 else Decimal("0.00")

    return min(
        Decimal("100.00"),
        ((actual / target) * Decimal("100")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        ),
    )


def get_result_status(score):
    score = decimal_value(score)

    if score >= Decimal("100"):
        return KpiUserMetricResult.STATUS_GOOD

    if score >= Decimal("70"):
        return KpiUserMetricResult.STATUS_WARNING

    return KpiUserMetricResult.STATUS_BAD


def get_user_target_value(period, metric, user):
    target = KpiUserTarget.objects.filter(
        period=period,
        metric=metric,
        user=user,
    ).first()

    if target:
        return target.target_value

    return metric.target_value


def get_user_employee_and_branch(user):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None

    return employee, branch


def get_reactivated_account_nos(records_queryset):
    return list(
        records_queryset.filter(reactivation=True)
        .exclude(account_no__isnull=True)
        .exclude(account_no="")
        .values_list("account_no", flat=True)
        .distinct()
    )


def get_matched_transactions(period, account_nos):
    if not account_nos:
        return TransactionLog.objects.none()

    return TransactionLog.objects.filter(
        account_no__in=account_nos,
        transaction_date__gte=period.start_date,
        transaction_date__lte=period.end_date,
        order_status__iexact=MATCHED_STATUS,
    )


def get_active_reactivated_account_nos(period, account_nos):
    if not account_nos:
        return []

    return list(
        get_matched_transactions(period, account_nos)
        .values_list("account_no", flat=True)
        .distinct()
    )


def calculate_total_calls(records_queryset):
    return records_queryset.count(), {
        "sa_record_ids": list(records_queryset.values_list("id", flat=True)),
    }


def calculate_reactivated_accounts(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = get_active_reactivated_account_nos(
        period,
        reactivated_account_nos,
    )

    return len(active_account_nos), {
        "reactivated_account_nos": reactivated_account_nos,
        "active_post_reactivation_account_nos": active_account_nos,
    }


def calculate_retention_rate(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = get_active_reactivated_account_nos(
        period,
        reactivated_account_nos,
    )

    value = percent_value(len(active_account_nos), len(reactivated_account_nos))

    return value, {
        "reactivated_count": len(reactivated_account_nos),
        "active_post_reactivation_count": len(active_account_nos),
        "reactivated_account_nos": reactivated_account_nos,
        "active_post_reactivation_account_nos": active_account_nos,
    }


def calculate_icp_ab_customers(records_queryset):
    queryset = records_queryset.filter(
        Q(icp_group__icp_code__in=["A", "B"])
        | Q(icp_group__icp_code__startswith="A")
        | Q(icp_group__icp_code__startswith="B")
        | Q(icp_group__icp_type__in=["A", "B"])
    )

    account_nos = list(
        queryset.exclude(account_no__isnull=True)
        .exclude(account_no="")
        .values_list("account_no", flat=True)
        .distinct()
    )

    return len(account_nos), {
        "account_nos": account_nos,
        "sa_record_ids": list(queryset.values_list("id", flat=True)),
    }


def calculate_transaction_sum(period, records_queryset, field_name):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = get_active_reactivated_account_nos(
        period,
        reactivated_account_nos,
    )

    transactions = get_matched_transactions(period, active_account_nos)

    total = transactions.aggregate(total=Sum(field_name))["total"] or Decimal("0")

    return total, {
        "reactivated_account_nos": reactivated_account_nos,
        "active_account_nos": active_account_nos,
        "transaction_ids": list(transactions.values_list("id", flat=True)),
    }


def calculate_introduced_product_count(records_queryset):
    queryset = records_queryset.filter(introduced_product=True)

    return queryset.count(), {
        "sa_record_ids": list(queryset.values_list("id", flat=True)),
    }


def calculate_rm_referral_count(records_queryset):
    queryset = records_queryset.filter(
        Q(handover_to_broker=True) | Q(referred_rm=True)
    )

    return queryset.count(), {
        "sa_record_ids": list(queryset.values_list("id", flat=True)),
    }


def calculate_fake_reactivation_rate(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = set(
        get_active_reactivated_account_nos(period, reactivated_account_nos)
    )

    fake_account_nos = [
        account_no
        for account_no in reactivated_account_nos
        if account_no not in active_account_nos
    ]

    value = percent_value(len(fake_account_nos), len(reactivated_account_nos))

    return value, {
        "reactivated_count": len(reactivated_account_nos),
        "fake_reactivation_count": len(fake_account_nos),
        "fake_account_nos": fake_account_nos,
        "active_account_nos": list(active_account_nos),
    }


def calculate_on_time_followup_rate(records_queryset):
    ab_records = (
        records_queryset.filter(
            Q(icp_group__icp_code__in=["A", "B"])
            | Q(icp_group__icp_code__startswith="A")
            | Q(icp_group__icp_code__startswith="B")
            | Q(icp_group__icp_type__in=["A", "B"])
        )
        .exclude(account_no__isnull=True)
        .exclude(account_no="")
        .select_related("icp_group")
        .order_by("account_no", "call_date", "id")
    )

    records = list(ab_records)

    if not records:
        return Decimal("0.0000"), {
            "eligible_count": 0,
            "on_time_count": 0,
            "sa_record_ids": [],
        }

    eligible_count = 0
    on_time_count = 0
    on_time_record_ids = []

    records_by_account = {}

    for record in records:
        records_by_account.setdefault(record.account_no, []).append(record)

    for account_no, account_records in records_by_account.items():
        for index, current_record in enumerate(account_records[:-1]):
            follow_up_days = getattr(current_record.icp_group, "follow_up_days", None)

            if not follow_up_days:
                continue

            eligible_count += 1

            next_record = account_records[index + 1]
            delta_days = (next_record.call_date - current_record.call_date).days

            if 0 < delta_days <= follow_up_days:
                on_time_count += 1
                on_time_record_ids.append(next_record.id)

    value = percent_value(on_time_count, eligible_count)

    return value, {
        "eligible_count": eligible_count,
        "on_time_count": on_time_count,
        "on_time_record_ids": on_time_record_ids,
        "sa_record_ids": [record.id for record in records],
    }


def calculate_metric_actual_value(period, metric, records_queryset):
    formula_key = metric.formula_key

    if formula_key == "total_calls":
        return calculate_total_calls(records_queryset)

    if formula_key == "reactivated_accounts":
        return calculate_reactivated_accounts(period, records_queryset)

    if formula_key == "retention_rate":
        return calculate_retention_rate(period, records_queryset)

    if formula_key == "icp_ab_customers":
        return calculate_icp_ab_customers(records_queryset)

    if formula_key == "transaction_fee":
        return calculate_transaction_sum(
            period,
            records_queryset,
            "transaction_fee",
        )

    if formula_key == "transaction_value":
        return calculate_transaction_sum(
            period,
            records_queryset,
            "transaction_value",
        )

    if formula_key == "introduced_product_count":
        return calculate_introduced_product_count(records_queryset)

    if formula_key == "on_time_followup_rate":
        return calculate_on_time_followup_rate(records_queryset)

    if formula_key == "rm_referral_count":
        return calculate_rm_referral_count(records_queryset)

    if formula_key == "fake_reactivation_rate":
        return calculate_fake_reactivation_rate(period, records_queryset)

    return Decimal("0.0000"), {
        "warning": f"Chưa hỗ trợ formula_key: {formula_key}",
    }


def get_auto_metrics(period):
    return KpiPeriodMetric.objects.select_related(
        "period",
        "group",
        "metric_definition",
    ).filter(
        period=period,
        input_type=KpiMetricDefinition.INPUT_AUTO,
        is_active=True,
    )


def get_user_sa_records(period, user):
    return SaRecord.objects.select_related(
        "icp_group",
        "call_result",
        "interest_level",
    ).filter(
        pic_user=user,
        call_date__gte=period.start_date,
        call_date__lte=period.end_date,
    )


def save_auto_metric_result(
    *,
    period,
    metric,
    user,
    actual_value,
    target_value,
    evidence_data,
    calculated_by_user=None,
):
    employee, branch = get_user_employee_and_branch(user)

    score = get_score(
        actual_value=actual_value,
        target_value=target_value,
    )

    old_result = KpiUserMetricResult.objects.filter(
        period=period,
        metric=metric,
        user=user,
    ).first()

    old_data = serialize_model_basic(old_result) if old_result else None

    result, created = KpiUserMetricResult.objects.update_or_create(
        period=period,
        metric=metric,
        user=user,
        defaults={
            "group": metric.group,
            "employee": employee,
            "branch": branch,
            "source_type": KpiMetricDefinition.INPUT_AUTO,
            "actual_value": actual_value,
            "target_value": target_value,
            "score": score,
            "weight_percent": metric.weight_percent,
            "result_status": get_result_status(score),
            "calculated_payload": {
                "formula_key": metric.formula_key,
                "actual_value": str(actual_value),
                "target_value": str(target_value) if target_value is not None else None,
                "score": str(score),
            },
            "evidence_data": evidence_data,
            "calculated_at": timezone.now(),
            "note": None,
        },
    )

    new_data = serialize_model_basic(result)

    create_kpi_audit_log(
        period=period,
        object_type="KpiUserMetricResult",
        object_id=result.id,
        action_type="CREATE" if created else "UPDATE",
        changed_by_user=calculated_by_user,
        old_data=old_data,
        new_data=new_data,
        note="Tính KPI tự động Phần B.",
    )

    return result, created


def calculate_auto_kpis_for_user(
    *,
    period,
    user,
    calculated_by_user=None,
):
    if period.status == KpiPeriod.STATUS_CLOSED:
        raise ValueError("Kỳ KPI đã chốt, không thể tính lại.")

    records_queryset = get_user_sa_records(period, user)
    metrics = get_auto_metrics(period)

    results = []

    for metric in metrics:
        actual_value, evidence_data = calculate_metric_actual_value(
            period,
            metric,
            records_queryset,
        )

        target_value = get_user_target_value(period, metric, user)

        result, created = save_auto_metric_result(
            period=period,
            metric=metric,
            user=user,
            actual_value=decimal_value(actual_value),
            target_value=target_value,
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


def get_default_kpi_users(branch_id=None):
    User = get_user_model()

    queryset = User.objects.filter(
        user_roles__role__role_code__in=["SA_STAFF", "SA_SUPERVISOR"],
        is_active=True,
    ).distinct()

    if branch_id:
        queryset = queryset.filter(employee__branch_id=branch_id)

    return queryset.order_by("id")