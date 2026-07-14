from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldError
from django.db.models import Q

from apps.kpis.auto_calculation import (
    get_active_reactivated_account_nos,
    get_branch_sa_records,
    get_metric_formula_key,
    get_user_sa_records,
)
from apps.kpis.models import KpiPeriod, KpiPeriodMetric, KpiProfile
from apps.kpis.metric_windows import get_metric_window


def _safe_filter(queryset, *args, **kwargs):
    try:
        filtered = queryset.filter(*args, **kwargs)
        filtered.count()
        return filtered
    except (FieldError, AttributeError):
        return queryset.none()


def _decimal_to_string(value):
    if value is None:
        return None

    if isinstance(value, Decimal):
        return str(value)

    return str(value)


def _get_record_display_name(record, relation_name, code_attr, name_attr):
    related = getattr(record, relation_name, None)

    if not related:
        return None, None

    return getattr(related, code_attr, None), getattr(related, name_attr, None)


def serialize_sa_record_for_contribution(record, *, contributes, contribution_label, contribution_reason):
    call_result_code, call_result_name = _get_record_display_name(
        record,
        "call_result",
        "result_code",
        "result_name",
    )
    interest_level_code, interest_level_name = _get_record_display_name(
        record,
        "interest_level",
        "level_code",
        "level_name",
    )
    icp_group_code, icp_group_name = _get_record_display_name(
        record,
        "icp_group",
        "icp_code",
        "icp_name",
    )

    return {
        "id": record.id,
        "record_code": getattr(record, "record_code", None),
        "account_no": getattr(record, "account_no", None),
        "customer_name_snapshot": getattr(record, "customer_name_snapshot", None),
        "branch_name_snapshot": getattr(record, "branch_name_snapshot", None),
        "pic_name_snapshot": getattr(record, "pic_name_snapshot", None),
        "call_date": getattr(record, "call_date", None),
        "follow_no": getattr(record, "follow_no", None),
        "call_result_code": call_result_code,
        "call_result_name": call_result_name,
        "interest_level_code": interest_level_code,
        "interest_level_name": interest_level_name,
        "icp_group_code": icp_group_code,
        "icp_group_name": icp_group_name,
        "introduced_product": getattr(record, "introduced_product", False),
        "reactivation": getattr(record, "reactivation", False),
        "support_info": getattr(record, "support_info", False),
        "referred_rm": getattr(record, "referred_rm", False),
        "handover_to_broker": getattr(record, "handover_to_broker", False),
        "transaction_value_snapshot": _decimal_to_string(
            getattr(record, "transaction_value_snapshot", None)
        ),
        "transaction_fee_snapshot": _decimal_to_string(
            getattr(record, "transaction_fee_snapshot", None)
        ),
        "data_status": getattr(record, "data_status", None),
        "note": getattr(record, "note", None),
        "contributes": contributes,
        "contribution_label": contribution_label,
        "contribution_reason": contribution_reason,
    }


def _contacted_queryset(records_queryset):
    return _safe_filter(
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


def _icp_updated_queryset(records_queryset):
    return records_queryset.filter(icp_group__isnull=False)


def _clean_data_queryset(records_queryset):
    clean_queryset = records_queryset.exclude(account_no__isnull=True).exclude(account_no="")
    clean_queryset = clean_queryset.filter(call_date__isnull=False)
    clean_queryset = clean_queryset.filter(call_result__isnull=False)
    clean_queryset = clean_queryset.filter(icp_group__isnull=False)
    return clean_queryset


def _referral_queryset(records_queryset):
    return _safe_filter(records_queryset, Q(handover_to_broker=True) | Q(referred_rm=True))


def _introduced_product_queryset(records_queryset):
    return _safe_filter(records_queryset, introduced_product=True)


def _support_success_queryset(records_queryset):
    return _contacted_queryset(records_queryset)


def _icp_ab_queryset(records_queryset):
    return _safe_filter(
        records_queryset,
        Q(icp_group__icp_code__in=["A", "B"])
        | Q(icp_group__icp_code__startswith="A")
        | Q(icp_group__icp_code__startswith="B")
        | Q(icp_group__icp_type__in=["A", "B"]),
    )


def _reactivated_queryset(period, records_queryset, metric=None):
    account_nos = list(
        records_queryset.filter(reactivation=True)
        .exclude(account_no__isnull=True)
        .exclude(account_no="")
        .values_list("account_no", flat=True)
        .distinct()
    )
    active_account_nos = set(get_active_reactivated_account_nos(period, account_nos, metric=metric))

    if not active_account_nos:
        return records_queryset.none(), account_nos, []

    queryset = records_queryset.filter(account_no__in=list(active_account_nos))
    return queryset, account_nos, list(active_account_nos)


def _branch_id_for_user(user):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None
    return branch.id if branch else None


def _get_records_queryset(period, profile, user, metric=None):
    profile_code = profile.profile_code if profile else None

    if profile_code == KpiProfile.PROFILE_SA_SUP:
        return get_branch_sa_records(period, branch_id=_branch_id_for_user(user), metric=metric)

    return get_user_sa_records(period, user, metric=metric)


def get_metric_contribution_payload(*, period, profile, metric, user):
    window = get_metric_window(period, metric)
    records_queryset = _get_records_queryset(period, profile, user, metric=metric).select_related(
        "call_result",
        "interest_level",
        "icp_group",
        "pic_user",
        "pic_employee",
        "branch",
    )
    records_queryset = records_queryset.order_by("-call_date", "-id")

    formula_key = get_metric_formula_key(metric)
    total_count = records_queryset.count()
    numerator_queryset = records_queryset.none()
    related = {}
    contribution_mode = "ALL"

    if formula_key == "total_calls":
        numerator_queryset = records_queryset
        contribution_mode = "COUNT_ALL_RECORDS"
        positive_label = "Tính vào số cuộc gọi"
        negative_label = "Không tính"
    elif formula_key == "contact_rate":
        numerator_queryset = _contacted_queryset(records_queryset)
        contribution_mode = "RATE_NUMERATOR_DENOMINATOR"
        positive_label = "Liên lạc được"
        negative_label = "Chỉ tính vào mẫu số"
    elif formula_key == "icp_update_rate":
        numerator_queryset = _icp_updated_queryset(records_queryset)
        contribution_mode = "RATE_NUMERATOR_DENOMINATOR"
        positive_label = "Đã cập nhật ICP"
        negative_label = "Thiếu ICP"
    elif formula_key == "data_quality_rate" or formula_key == "team_data_quality_rate":
        numerator_queryset = _clean_data_queryset(records_queryset)
        contribution_mode = "RATE_NUMERATOR_DENOMINATOR"
        positive_label = "Data hợp lệ"
        negative_label = "Data thiếu thông tin"
    elif formula_key in ["reactivated_accounts", "transaction_fee", "transaction_value"]:
        numerator_queryset, reactivated_account_nos, active_account_nos = _reactivated_queryset(
            period,
            records_queryset,
            metric=metric,
        )
        related = {
            "reactivated_account_nos": reactivated_account_nos,
            "active_post_reactivation_account_nos": active_account_nos,
        }
        contribution_mode = "REACTIVATION_RECORDS"
        positive_label = "Tái kích hoạt có giao dịch"
        negative_label = "Không tính vào kết quả"
    elif formula_key == "referral_intro_rate" or formula_key == "rm_referral_count":
        numerator_queryset = _referral_queryset(records_queryset)
        contribution_mode = "RATE_NUMERATOR_DENOMINATOR"
        positive_label = "Có referral/chuyển RM"
        negative_label = "Chỉ tính vào mẫu số"
    elif formula_key == "introduced_product_count":
        numerator_queryset = _introduced_product_queryset(records_queryset)
        contribution_mode = "COUNT_MATCHED_RECORDS"
        positive_label = "Có giới thiệu sản phẩm"
        negative_label = "Không giới thiệu sản phẩm"
    elif formula_key == "support_success_customers":
        numerator_queryset = _support_success_queryset(records_queryset)
        contribution_mode = "RATE_NUMERATOR_DENOMINATOR"
        positive_label = "Hỗ trợ/liên lạc thành công"
        negative_label = "Chưa thành công"
    elif formula_key == "group_conversion_rate" or formula_key == "icp_ab_customers":
        numerator_queryset = _icp_ab_queryset(records_queryset)
        contribution_mode = "COUNT_MATCHED_RECORDS"
        positive_label = "Thuộc nhóm ICP A/B"
        negative_label = "Không thuộc nhóm ICP A/B"
    elif formula_key == "team_call_target_completion_rate":
        # KPI này tổng hợp theo nhân viên trong chi nhánh. Record chỉ dùng để đối chiếu cuộc gọi của toàn chi nhánh.
        numerator_queryset = records_queryset
        contribution_mode = "TEAM_REFERENCE_RECORDS"
        positive_label = "Record tham chiếu chi nhánh"
        negative_label = "Không tính"
    else:
        numerator_queryset = records_queryset.none()
        contribution_mode = "UNSUPPORTED"
        positive_label = "Có đóng góp"
        negative_label = "Chưa có rule đóng góp"

    contributing_ids = set(numerator_queryset.values_list("id", flat=True))
    numerator_count = len(contributing_ids)

    # Chỉ trả về các SA Record thật sự đóng góp vào chỉ tiêu.
    # Các record chỉ nằm ở mẫu số không hiển thị ở tab đóng góp để SA dễ đối chiếu.
    records = []
    for record in numerator_queryset.order_by("-call_date", "-id")[:500]:
        records.append(
            serialize_sa_record_for_contribution(
                record,
                contributes=True,
                contribution_label=positive_label,
                contribution_reason="Record này được tính vào tử số/giá trị thực tế của chỉ tiêu.",
            )
        )

    return {
        "period": period.id,
        "period_code": period.period_code,
        "profile": profile.id if profile else None,
        "profile_code": profile.profile_code if profile else None,
        "user": user.id,
        "metric": {
            "id": metric.id,
            "metric_code": metric.metric_code,
            "metric_name": metric.metric_name,
            "measurement_formula": metric.measurement_formula,
        },
        "summary": {
            "formula_key": formula_key,
            "contribution_mode": contribution_mode,
            "window_start_date": str(window.start_date),
            "window_end_date": str(window.end_date),
            "window_label": window.label,
            "total_record_count": total_count,
            "contributing_record_count": numerator_count,
            "non_contributing_record_count": max(total_count - numerator_count, 0),
            **related,
        },
        "records": records,
    }
