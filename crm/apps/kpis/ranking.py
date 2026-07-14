from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.accounts.services import PermissionService
from apps.kpis.models import KpiPeriodMetric, KpiProfile, KpiUserMetricResult, KpiUserSummary


RANK_CATEGORY_TOTAL = "TOTAL"
RANK_CATEGORY_MANUAL = "MANUAL"
RANK_CATEGORY_AUTO = "AUTO"
RANK_CATEGORY_FEE = "FEE"
RANK_CATEGORY_REACTIVATED = "REACTIVATED"
RANK_CATEGORY_GATE = "GATE"

RANK_CATEGORIES = [
    {
        "value": RANK_CATEGORY_TOTAL,
        "label": "Tổng điểm",
        "description": "Xếp hạng theo tổng điểm KPI.",
    },
    {
        "value": RANK_CATEGORY_MANUAL,
        "label": "Bảng A",
        "description": "Xếp hạng theo điểm nghiệp vụ/Admin nhập.",
    },
    {
        "value": RANK_CATEGORY_AUTO,
        "label": "Bảng B",
        "description": "Xếp hạng theo điểm dữ liệu CRM tự động.",
    },
    {
        "value": RANK_CATEGORY_FEE,
        "label": "Phí giao dịch",
        "description": "Xếp hạng theo KPI B3_24 - phí giao dịch KH tái kích hoạt.",
    },
    {
        "value": RANK_CATEGORY_REACTIVATED,
        "label": "Tái kích hoạt",
        "description": "Xếp hạng theo KPI B3_23 - số KH tái kích hoạt.",
    },
    {
        "value": RANK_CATEGORY_GATE,
        "label": "Điều kiện cổng",
        "description": "Ưu tiên nhân viên đạt điều kiện cổng, sau đó xếp theo tổng điểm.",
    },
]

STATUS_ALL = "ALL"
STATUS_HAS_DATA = "HAS_DATA"
STATUS_NO_DATA = "NO_DATA"
STATUS_GATE_PASSED = "GATE_PASSED"
STATUS_GATE_FAILED = "GATE_FAILED"


RANK_METRIC_CODE_MAP = {
    RANK_CATEGORY_FEE: "B3_24",
    RANK_CATEGORY_REACTIVATED: "B3_23",
}


def decimal_to_string(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return str(value)
    return str(value)


def decimal_to_float(value):
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def normalize_int(value):
    if value in [None, ""]:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_user_branch_id(user):
    employee = getattr(user, "employee", None)
    return getattr(employee, "branch_id", None) if employee else None


def user_has_permission(user, permission_code):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return PermissionService.has_permission(user, permission_code)


def can_view_all_ranking(user):
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user_has_permission(user, "KPI_DASHBOARD_VIEW_ALL")
        )
    )


def can_view_branch_ranking(user):
    return bool(
        user
        and user.is_authenticated
        and (
            can_view_all_ranking(user)
            or user_has_permission(user, "KPI_DASHBOARD_VIEW_BRANCH")
            or user_has_permission(user, "SA_KPI_VIEW_BRANCH")
        )
    )


def normalize_rank_category(value):
    value = (value or RANK_CATEGORY_TOTAL).upper()
    allowed_values = {item["value"] for item in RANK_CATEGORIES}
    return value if value in allowed_values else RANK_CATEGORY_TOTAL


def normalize_status(value):
    value = (value or STATUS_ALL).upper()
    allowed_values = {
        STATUS_ALL,
        STATUS_HAS_DATA,
        STATUS_NO_DATA,
        STATUS_GATE_PASSED,
        STATUS_GATE_FAILED,
    }
    return value if value in allowed_values else STATUS_ALL


def get_period_profile(period, profile_code):
    return KpiProfile.objects.filter(
        period=period,
        profile_code=profile_code,
        is_active=True,
    ).first()


def get_visible_target_users(*, request_user, profile, branch_id=None, q=None):
    User = get_user_model()

    target_role_code = getattr(profile, "target_role_code", None) or KpiProfile.TARGET_ROLE_SA

    queryset = (
        User.objects.select_related("employee", "employee__branch")
        .filter(
            user_roles__role__role_code=target_role_code,
            is_active=True,
        )
        .distinct()
    )

    if q:
        queryset = queryset.filter(
            Q(username__icontains=q)
            | Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(employee__full_name__icontains=q)
            | Q(employee__employee_code__icontains=q)
            | Q(employee__branch__branch_name__icontains=q)
        )

    branch_id = normalize_int(branch_id)

    if can_view_all_ranking(request_user):
        if branch_id:
            queryset = queryset.filter(employee__branch_id=branch_id)
        return queryset

    if can_view_branch_ranking(request_user):
        current_branch_id = get_user_branch_id(request_user)
        if not current_branch_id:
            return queryset.none()

        # SUP chỉ xem bảng xếp hạng trong chi nhánh của mình.
        queryset = queryset.filter(employee__branch_id=current_branch_id)
        return queryset

    # Fallback: chỉ xem chính mình nếu không có quyền chi nhánh.
    return queryset.filter(pk=request_user.pk)


def get_metric_actual_values_by_user(*, period, profile, users, metric_code):
    if not profile or not metric_code:
        return {}

    metric_ids = KpiPeriodMetric.objects.filter(
        period=period,
        profile=profile,
        metric_code=metric_code,
        is_active=True,
    ).values_list("id", flat=True)

    if not metric_ids:
        return {}

    user_ids = [user.id for user in users]
    results = KpiUserMetricResult.objects.filter(
        period=period,
        profile=profile,
        metric_id__in=list(metric_ids),
        user_id__in=user_ids,
    ).values_list("user_id", "actual_value")

    values = {}
    for user_id, actual_value in results:
        values[user_id] = (values.get(user_id) or Decimal("0")) + (actual_value or Decimal("0"))

    return values


def get_ranking_numeric_value(item, category):
    if category == RANK_CATEGORY_MANUAL:
        return decimal_to_float(item.get("manual_score"))
    if category == RANK_CATEGORY_AUTO:
        return decimal_to_float(item.get("auto_score"))
    if category == RANK_CATEGORY_FEE:
        return decimal_to_float(item.get("fee_value"))
    if category == RANK_CATEGORY_REACTIVATED:
        return decimal_to_float(item.get("reactivated_accounts"))
    if category == RANK_CATEGORY_GATE:
        return 1.0 if item.get("all_gates_passed") else 0.0
    return decimal_to_float(item.get("total_score"))


def serialize_user_ranking_row(*, user, summary, category, fee_value=None, reactivated_accounts=None):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None

    item = {
        "user": user.id,
        "user_username": user.username,
        "user_email": user.email,
        "employee": getattr(employee, "id", None),
        "employee_code": getattr(employee, "employee_code", None),
        "employee_name": getattr(employee, "full_name", None) or user.get_full_name() or user.username,
        "branch": getattr(branch, "id", None),
        "branch_name": getattr(branch, "branch_name", None),
        "has_summary": summary is not None,
        "manual_score": decimal_to_string(getattr(summary, "manual_score", None)),
        "auto_score": decimal_to_string(getattr(summary, "auto_score", None)),
        "total_score": decimal_to_string(getattr(summary, "total_score", None)),
        "all_gates_passed": getattr(summary, "all_gates_passed", None),
        "failed_gate_codes": getattr(summary, "failed_gate_codes", None),
        "reward_tier_code": getattr(summary, "reward_tier_code", None),
        "reward_tier_name": getattr(summary, "reward_tier_name", None),
        "rank_overall": getattr(summary, "rank_overall", None),
        "rank_branch": getattr(summary, "rank_branch", None),
        "rank_fee": getattr(summary, "rank_fee", None),
        "rank_reactivated_accounts": getattr(summary, "rank_reactivated_accounts", None),
        "fee_value": decimal_to_string(fee_value),
        "reactivated_accounts": decimal_to_string(reactivated_accounts),
        "calculated_at": getattr(summary, "calculated_at", None),
    }

    item["ranking_value"] = decimal_to_string(get_ranking_numeric_value(item, category))
    return item


def filter_rows_by_status(rows, status):
    if status == STATUS_HAS_DATA:
        return [item for item in rows if item.get("has_summary")]

    if status == STATUS_NO_DATA:
        return [item for item in rows if not item.get("has_summary")]

    if status == STATUS_GATE_PASSED:
        return [item for item in rows if item.get("all_gates_passed") is True]

    if status == STATUS_GATE_FAILED:
        return [item for item in rows if item.get("has_summary") and item.get("all_gates_passed") is False]

    return rows


def sort_ranking_rows(rows, category):
    if category == RANK_CATEGORY_GATE:
        return sorted(
            rows,
            key=lambda item: (
                1 if item.get("all_gates_passed") is True else 0,
                decimal_to_float(item.get("total_score")),
                decimal_to_float(item.get("auto_score")),
                item.get("employee_name") or "",
            ),
            reverse=True,
        )

    return sorted(
        rows,
        key=lambda item: (
            get_ranking_numeric_value(item, category),
            decimal_to_float(item.get("total_score")),
            decimal_to_float(item.get("auto_score")),
            item.get("employee_name") or "",
        ),
        reverse=True,
    )


def get_kpi_ranking_payload(*, request_user, period, profile_code=None, branch_id=None, q=None, category=None, status=None):
    profile_code = profile_code or KpiProfile.PROFILE_SA
    category = normalize_rank_category(category)
    status = normalize_status(status)

    profile = get_period_profile(period, profile_code)

    users = list(
        get_visible_target_users(
            request_user=request_user,
            profile=profile,
            branch_id=branch_id,
            q=(q or "").strip(),
        ).order_by("employee__branch__branch_name", "employee__full_name", "username")
    )

    user_ids = [user.id for user in users]

    summaries = {}
    if profile and user_ids:
        summaries = {
            summary.user_id: summary
            for summary in KpiUserSummary.objects.select_related(
                "period",
                "profile",
                "user",
                "employee",
                "branch",
                "reward_tier",
            ).filter(
                period=period,
                profile=profile,
                user_id__in=user_ids,
            )
        }

    fee_values = get_metric_actual_values_by_user(
        period=period,
        profile=profile,
        users=users,
        metric_code=RANK_METRIC_CODE_MAP[RANK_CATEGORY_FEE],
    )
    reactivated_values = get_metric_actual_values_by_user(
        period=period,
        profile=profile,
        users=users,
        metric_code=RANK_METRIC_CODE_MAP[RANK_CATEGORY_REACTIVATED],
    )

    rows = [
        serialize_user_ranking_row(
            user=user,
            summary=summaries.get(user.id),
            category=category,
            fee_value=fee_values.get(user.id),
            reactivated_accounts=reactivated_values.get(user.id),
        )
        for user in users
    ]

    rows = filter_rows_by_status(rows, status)
    rows = sort_ranking_rows(rows, category)

    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return {
        "period": period.id,
        "period_code": period.period_code,
        "period_name": period.period_name,
        "profile": profile.id if profile else None,
        "profile_code": profile.profile_code if profile else profile_code,
        "category": category,
        "status": status,
        "categories": RANK_CATEGORIES,
        "total_count": len(rows),
        "has_summary_count": sum(1 for item in rows if item.get("has_summary")),
        "no_summary_count": sum(1 for item in rows if not item.get("has_summary")),
        "items": rows,
    }
