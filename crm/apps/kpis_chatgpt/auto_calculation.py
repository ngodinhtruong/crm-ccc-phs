from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldError
from django.db.models import Q, Sum
from django.utils import timezone

from apps.kpis.models import (
    KpiGroup,
    KpiPeriod,
    KpiPeriodMetric,
    KpiProfile,
    KpiUserMetricResult,
    KpiUserTarget,
    TransactionLog,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic
from apps.sale_admin.models import SaRecord


MATCHED_STATUS = "MATCHED"
SA_PROFILE_CODE = KpiProfile.PROFILE_SA
SA_SUP_PROFILE_CODE = KpiProfile.PROFILE_SA_SUP


# Vì đã bỏ KPI master/formula_key, phần tự động tính dùng metric_code thực tế trong từng bộ KPI.
AUTO_FORMULA_BY_PROFILE_AND_METRIC = {
    SA_PROFILE_CODE: {
        "B1_17": "total_calls",
        "B1_18": "contact_rate",
        "B2_20": "icp_update_rate",
        "B2_21": "data_quality_rate",
        "B3_23": "reactivated_accounts",
        "B3_24": "transaction_fee",
        "B3_25": "referral_intro_rate",
        "B4_26": "support_success_customers",
        "B4_27": "introduced_product_count",
        "B4_28": "group_conversion_rate",
    },
    SA_SUP_PROFILE_CODE: {
        "B1_01": "team_call_target_completion_rate",
        "B1_02": "team_data_quality_rate",
    },
}


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

    if target_value is None:
        return Decimal("0.00")

    target = decimal_value(target_value)

    if target <= 0:
        return Decimal("100.00") if actual <= target else Decimal("0.00")

    return min(
        Decimal("100.00"),
        ((actual / target) * Decimal("100")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        ),
    )


def get_inverse_score(actual_value, target_value):
    actual = decimal_value(actual_value)

    if target_value is None:
        return Decimal("0.00")

    target = decimal_value(target_value)

    if actual <= target:
        return Decimal("100.00")

    if actual == 0:
        return Decimal("100.00")

    return max(
        Decimal("0.00"),
        ((target / actual) * Decimal("100")).quantize(
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


def get_user_target(period, profile, metric, user):
    return KpiUserTarget.objects.filter(
        period=period,
        profile=profile,
        metric=metric,
        user=user,
    ).first()


def get_user_target_value(period, profile, metric, user):
    target = get_user_target(period, profile, metric, user)

    if target and target.target_value is not None:
        return target.target_value

    return metric.target_value


def get_user_employee_and_branch(user):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None

    return employee, branch


def user_has_role(user, role_code):
    if not user or not getattr(user, "is_authenticated", False):
        return False

    if getattr(user, "is_superuser", False):
        return True

    return user.user_roles.filter(role__role_code=role_code).exists()


def resolve_profile_for_user(period, user, profile=None):
    if profile:
        return profile

    if user_has_role(user, KpiProfile.TARGET_ROLE_SA_SUP):
        return KpiProfile.objects.filter(
            period=period,
            profile_code=KpiProfile.PROFILE_SA_SUP,
            is_active=True,
        ).first()

    return KpiProfile.objects.filter(
        period=period,
        profile_code=KpiProfile.PROFILE_SA,
        is_active=True,
    ).first()


def get_default_kpi_users(profile=None, branch_id=None):
    User = get_user_model()

    if profile:
        role_codes = [profile.target_role_code]
    else:
        role_codes = [KpiProfile.TARGET_ROLE_SA, KpiProfile.TARGET_ROLE_SA_SUP]

    queryset = User.objects.filter(
        user_roles__role__role_code__in=role_codes,
        is_active=True,
    ).distinct()

    if branch_id:
        queryset = queryset.filter(employee__branch_id=branch_id)

    return queryset


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


def get_branch_sa_records(period, branch_id=None):
    queryset = SaRecord.objects.select_related(
        "icp_group",
        "call_result",
        "interest_level",
        "pic_user",
    ).filter(
        call_date__gte=period.start_date,
        call_date__lte=period.end_date,
    )

    if branch_id:
        queryset = queryset.filter(pic_user__employee__branch_id=branch_id)

    return queryset


def safe_count(queryset):
    try:
        return queryset.count()
    except (FieldError, AttributeError):
        return 0


def safe_filter(queryset, *args, **kwargs):
    try:
        filtered = queryset.filter(*args, **kwargs)
        # Force evaluation of query construction so bad fields are caught here.
        filtered.count()
        return filtered
    except (FieldError, AttributeError):
        return queryset.none()


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


def calculate_contact_rate(records_queryset):
    total_calls = records_queryset.count()

    # Các tên field của CallResult có thể khác nhau theo master data.
    contacted_queryset = safe_filter(
        records_queryset,
        Q(call_result__result_code__icontains="CONTACT")
        | Q(call_result__result_code__icontains="SUCCESS")
        | Q(call_result__result_code__icontains="ANSWER")
        | Q(call_result__result_name__icontains="nghe")
        | Q(call_result__result_name__icontains="liên lạc")
        | Q(call_result__result_name__icontains="thành công")
        | Q(call_result__name__icontains="nghe")
        | Q(call_result__name__icontains="liên lạc")
        | Q(call_result__name__icontains="thành công"),
    )

    contacted_count = safe_count(contacted_queryset)

    return percent_value(contacted_count, total_calls), {
        "total_calls": total_calls,
        "contacted_count": contacted_count,
        "sa_record_ids": list(records_queryset.values_list("id", flat=True)),
    }


def calculate_icp_update_rate(records_queryset):
    total_records = records_queryset.count()
    updated_queryset = records_queryset.filter(icp_group__isnull=False)
    updated_count = updated_queryset.count()

    return percent_value(updated_count, total_records), {
        "total_records": total_records,
        "updated_count": updated_count,
        "missing_count": total_records - updated_count,
        "updated_record_ids": list(updated_queryset.values_list("id", flat=True)),
    }


def calculate_data_quality_rate(records_queryset):
    total_records = records_queryset.count()
    clean_queryset = records_queryset.exclude(account_no__isnull=True).exclude(account_no="")
    clean_queryset = clean_queryset.filter(call_date__isnull=False)
    clean_queryset = clean_queryset.filter(call_result__isnull=False)
    clean_queryset = clean_queryset.filter(icp_group__isnull=False)
    clean_count = clean_queryset.count()

    return percent_value(clean_count, total_records), {
        "total_records": total_records,
        "clean_records": clean_count,
        "dirty_records": total_records - clean_count,
        "clean_record_ids": list(clean_queryset.values_list("id", flat=True)),
    }


def calculate_reactivated_accounts(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = get_active_reactivated_account_nos(period, reactivated_account_nos)

    return len(active_account_nos), {
        "reactivated_account_nos": reactivated_account_nos,
        "active_post_reactivation_account_nos": active_account_nos,
    }


def calculate_retention_rate(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = get_active_reactivated_account_nos(period, reactivated_account_nos)
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
    active_account_nos = get_active_reactivated_account_nos(period, reactivated_account_nos)
    transactions = get_matched_transactions(period, active_account_nos)
    total = transactions.aggregate(total=Sum(field_name))["total"] or Decimal("0")

    return total, {
        "reactivated_account_nos": reactivated_account_nos,
        "active_account_nos": active_account_nos,
        "transaction_ids": list(transactions.values_list("id", flat=True)),
    }


def calculate_introduced_product_count(records_queryset):
    queryset = safe_filter(records_queryset, introduced_product=True)

    return queryset.count(), {
        "sa_record_ids": list(queryset.values_list("id", flat=True)),
    }


def calculate_rm_referral_count(records_queryset):
    queryset = safe_filter(
        records_queryset,
        Q(handover_to_broker=True) | Q(referred_rm=True),
    )

    return queryset.count(), {
        "sa_record_ids": list(queryset.values_list("id", flat=True)),
    }


def calculate_referral_intro_rate(records_queryset):
    total_records = records_queryset.count()
    referral_count, payload = calculate_rm_referral_count(records_queryset)
    payload.update({"total_records": total_records})

    return percent_value(referral_count, total_records), payload


def calculate_support_success_customers(records_queryset):
    contact_rate, payload = calculate_contact_rate(records_queryset)
    return contact_rate, payload


def calculate_fake_reactivation_rate(period, records_queryset):
    reactivated_account_nos = get_reactivated_account_nos(records_queryset)
    active_account_nos = set(get_active_reactivated_account_nos(period, reactivated_account_nos))
    fake_account_nos = [account_no for account_no in reactivated_account_nos if account_no not in active_account_nos]
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


def get_sa_total_call_metric(period):
    return KpiPeriodMetric.objects.filter(
        period=period,
        profile__profile_code=KpiProfile.PROFILE_SA,
        metric_code="B1_17",
        is_active=True,
    ).select_related("profile").first()


def calculate_team_call_target_completion_rate(period, supervisor_user):
    employee, branch = get_user_employee_and_branch(supervisor_user)
    branch_id = branch.id if branch else None
    sa_users = list(
        get_default_kpi_users(
            profile=KpiProfile.objects.filter(
                period=period,
                profile_code=KpiProfile.PROFILE_SA,
                is_active=True,
            ).first(),
            branch_id=branch_id,
        )
    )

    if not sa_users:
        return Decimal("0.0000"), {
            "sa_user_count": 0,
            "completed_user_count": 0,
        }

    target_metric = get_sa_total_call_metric(period)
    completed_user_ids = []
    user_payload = []

    for sa_user in sa_users:
        records_queryset = get_user_sa_records(period, sa_user)
        actual_calls = records_queryset.count()
        target_calls = (
            get_user_target_value(period, target_metric.profile, target_metric, sa_user)
            if target_metric
            else None
        )
        target_calls_decimal = decimal_value(target_calls) if target_calls is not None else Decimal("0")

        completed = target_calls_decimal > 0 and Decimal(actual_calls) >= target_calls_decimal

        if completed:
            completed_user_ids.append(sa_user.id)

        user_payload.append(
            {
                "user_id": sa_user.id,
                "actual_calls": actual_calls,
                "target_calls": str(target_calls_decimal),
                "completed": completed,
            }
        )

    return percent_value(len(completed_user_ids), len(sa_users)), {
        "sa_user_count": len(sa_users),
        "completed_user_count": len(completed_user_ids),
        "completed_user_ids": completed_user_ids,
        "users": user_payload,
    }


def calculate_team_data_quality_rate(period, supervisor_user):
    employee, branch = get_user_employee_and_branch(supervisor_user)
    records_queryset = get_branch_sa_records(period, branch_id=branch.id if branch else None)
    return calculate_data_quality_rate(records_queryset)


def get_metric_formula_key(metric):
    profile_code = metric.profile.profile_code if metric.profile else None
    return AUTO_FORMULA_BY_PROFILE_AND_METRIC.get(profile_code, {}).get(metric.metric_code)


def calculate_metric_actual_value(period, metric, records_queryset, user=None):
    formula_key = get_metric_formula_key(metric)

    if formula_key == "total_calls":
        return calculate_total_calls(records_queryset)

    if formula_key == "contact_rate":
        return calculate_contact_rate(records_queryset)

    if formula_key == "icp_update_rate":
        return calculate_icp_update_rate(records_queryset)

    if formula_key == "data_quality_rate":
        return calculate_data_quality_rate(records_queryset)

    if formula_key == "reactivated_accounts":
        return calculate_reactivated_accounts(period, records_queryset)

    if formula_key == "retention_rate":
        return calculate_retention_rate(period, records_queryset)

    if formula_key == "icp_ab_customers":
        return calculate_icp_ab_customers(records_queryset)

    if formula_key == "transaction_fee":
        return calculate_transaction_sum(period, records_queryset, "transaction_fee")

    if formula_key == "transaction_value":
        return calculate_transaction_sum(period, records_queryset, "transaction_value")

    if formula_key == "introduced_product_count":
        return calculate_introduced_product_count(records_queryset)

    if formula_key == "on_time_followup_rate":
        return calculate_on_time_followup_rate(records_queryset)

    if formula_key == "rm_referral_count":
        return calculate_rm_referral_count(records_queryset)

    if formula_key == "referral_intro_rate":
        return calculate_referral_intro_rate(records_queryset)

    if formula_key == "support_success_customers":
        return calculate_support_success_customers(records_queryset)

    if formula_key == "group_conversion_rate":
        return calculate_icp_ab_customers(records_queryset)

    if formula_key == "fake_reactivation_rate":
        return calculate_fake_reactivation_rate(period, records_queryset)

    if formula_key == "team_call_target_completion_rate":
        return calculate_team_call_target_completion_rate(period, user)

    if formula_key == "team_data_quality_rate":
        return calculate_team_data_quality_rate(period, user)

    return Decimal("0.0000"), {
        "warning": f"Chưa hỗ trợ tự động tính KPI {metric.profile.profile_code if metric.profile else ''}:{metric.metric_code}",
        "metric_code": metric.metric_code,
    }


def save_auto_metric_result(
    *,
    period,
    profile,
    metric,
    user,
    actual_value,
    target_value,
    evidence_data,
    calculated_by_user=None,
):
    employee, branch = get_user_employee_and_branch(user)
    formula_key = get_metric_formula_key(metric)

    if formula_key == "fake_reactivation_rate":
        score = get_inverse_score(actual_value=actual_value, target_value=target_value)
    else:
        score = get_score(actual_value=actual_value, target_value=target_value)

    old_result = KpiUserMetricResult.objects.filter(
        period=period,
        profile=profile,
        metric=metric,
        user=user,
    ).first()

    old_data = serialize_model_basic(old_result) if old_result else None

    result, created = KpiUserMetricResult.objects.update_or_create(
        period=period,
        profile=profile,
        metric=metric,
        user=user,
        defaults={
            "group": metric.group,
            "employee": employee,
            "branch": branch,
            "source_type": KpiUserMetricResult.SOURCE_AUTO,
            "actual_value": actual_value,
            "target_value": target_value,
            "score": score,
            "weight_percent": metric.weight_percent,
            "result_status": get_result_status(score),
            "calculated_payload": {
                "metric_code": metric.metric_code,
                "formula_key": formula_key,
                "actual_value": str(actual_value),
                "target_value": str(target_value) if target_value is not None else None,
                "score": str(score),
            },
            "evidence_data": evidence_data,
            "calculated_at": timezone.now(),
            "note": None,
        },
    )

    create_kpi_audit_log(
        period=period,
        object_type="KpiUserMetricResult",
        object_id=result.id,
        action_type="CREATE" if created else "UPDATE",
        changed_by_user=calculated_by_user,
        old_data=old_data,
        new_data=serialize_model_basic(result),
        note="Tính KPI tự động.",
    )

    return result, created


def get_auto_metrics(period, profile):
    return (
        KpiPeriodMetric.objects.select_related("period", "profile", "group")
        .filter(
            period=period,
            profile=profile,
            is_active=True,
            group__is_active=True,
            group__group_type=KpiGroup.GROUP_TYPE_AUTO,
        )
        .order_by("group__section__sort_order", "group__sort_order", "metric_code", "id")
    )


def calculate_auto_kpis_for_user(
    *,
    period,
    user,
    profile=None,
    calculated_by_user=None,
):
    if period.status == KpiPeriod.STATUS_CLOSED:
        raise ValueError("Kỳ KPI đã chốt, không thể tính lại.")

    profile = resolve_profile_for_user(period, user, profile=profile)

    if not profile:
        raise ValueError("Không tìm thấy bộ KPI phù hợp với nhân viên.")

    records_queryset = get_user_sa_records(period, user)
    metrics = get_auto_metrics(period, profile)
    results = []

    for metric in metrics:
        actual_value, evidence_data = calculate_metric_actual_value(
            period,
            metric,
            records_queryset,
            user=user,
        )

        target_value = get_user_target_value(period, profile, metric, user)

        result, created = save_auto_metric_result(
            period=period,
            profile=profile,
            metric=metric,
            user=user,
            actual_value=decimal_value(actual_value),
            target_value=target_value,
            evidence_data=evidence_data,
            calculated_by_user=calculated_by_user,
        )

        results.append({"result": result, "created": created})

    return results
