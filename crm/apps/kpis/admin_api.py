from collections import defaultdict
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.services import PermissionService
from apps.branches.models import Branch
from apps.kpis.models import (
    KpiPeriod,
    KpiPeriodMetric,
    KpiProfile,
    KpiUserMetricResult,
    KpiUserSummary,
    KpiUserTarget,
)
from apps.sale_admin.models import SaRecord
from apps.kpis.permissions import (
    SA_ROLE_CODES,
    SA_SUP_ROLE_CODES,
    can_assign_target_for_profile,
    get_manageable_profile_codes,
    is_kpi_admin,
    is_sa_supervisor,
    user_role_codes,
)

User = get_user_model()


PART_B_SECTION_PREFIX = "B"


def decimal_to_string(value, default="0"):
    if value is None:
        return default
    return str(value)


def parse_decimal_or_none(value):
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({"target_value": "Giá trị chỉ tiêu không hợp lệ."})


def user_can_view_all_kpi(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or is_kpi_admin(user):
        return True
    return PermissionService.has_permission(user, "KPI_DASHBOARD_VIEW_ALL")


def user_can_view_branch_kpi(user):
    if not user or not user.is_authenticated:
        return False
    if user_can_view_all_kpi(user):
        return True
    if is_sa_supervisor(user):
        return True
    return (
        PermissionService.has_permission(user, "KPI_DASHBOARD_VIEW_BRANCH")
        or PermissionService.has_permission(user, "SA_KPI_VIEW_BRANCH")
    )


def get_user_employee_branch_id(user):
    employee = getattr(user, "employee", None)
    return getattr(employee, "branch_id", None) if employee else None


def get_period_from_request(request, required=True):
    period_id = request.query_params.get("period") or request.data.get("period")
    period_code = request.query_params.get("period_code") or request.data.get("period_code")
    year = request.query_params.get("year") or request.data.get("year")
    month = request.query_params.get("month") or request.data.get("month")

    queryset = KpiPeriod.objects.all()

    if period_id:
        period = queryset.filter(pk=period_id).first()
    elif period_code:
        period = queryset.filter(period_code=period_code).first()
    elif year and month:
        period = queryset.filter(year=year, month=month, period_type=KpiPeriod.PERIOD_MONTH).first()
    else:
        today = timezone.localdate()
        period = (
            queryset.filter(
                start_date__lte=today,
                end_date__gte=today,
                status__in=[KpiPeriod.STATUS_ACTIVE, KpiPeriod.STATUS_LOCKED],
            )
            .order_by("-start_date", "-id")
            .first()
        )
        if not period:
            period = queryset.order_by("-start_date", "-id").first()

    if required and not period:
        raise NotFound("Không tìm thấy kỳ KPI.")

    return period


def serialize_period(period):
    if not period:
        return None
    return {
        "id": period.id,
        "period_code": period.period_code,
        "period_name": period.period_name,
        "period_type": period.period_type,
        "year": period.year,
        "month": period.month,
        "quarter": period.quarter,
        "half_year": period.half_year,
        "start_date": period.start_date.isoformat() if period.start_date else None,
        "end_date": period.end_date.isoformat() if period.end_date else None,
        "status": period.status,
    }


class KpiAdminPeriodOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Endpoint nhẹ cho dropdown kỳ KPI ở trang KPI Admin.

        Không dùng /api/kpis/periods/ vì endpoint cấu hình KPI có thể annotate/prefetch
        nhiều bảng cấu hình, dễ chậm khi mở dashboard.
        """
        queryset = KpiPeriod.objects.filter(period_type=KpiPeriod.PERIOD_MONTH).only(
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
        )

        year = request.query_params.get("year")
        status_value = request.query_params.get("status")

        if year:
            queryset = queryset.filter(year=year)

        if status_value:
            queryset = queryset.filter(status=status_value)

        try:
            limit = int(request.query_params.get("limit") or 48)
        except (TypeError, ValueError):
            limit = 48

        limit = max(1, min(limit, 120))

        periods = list(queryset.order_by("-year", "-month", "-id")[:limit])
        current_period = get_period_from_request(request, required=False)

        if current_period and not any(item.id == current_period.id for item in periods):
            periods.insert(0, current_period)

        return Response([serialize_period(item) for item in periods])


def get_allowed_profile_codes_for_admin_page(user):
    if user_can_view_all_kpi(user):
        return [KpiProfile.PROFILE_SA, KpiProfile.PROFILE_SA_SUP]
    if user_can_view_branch_kpi(user):
        return [KpiProfile.PROFILE_SA]
    return []


def get_profile_for_admin_page(period, user, profile_code=None, require_manage=False):
    allowed_codes = (
        get_manageable_profile_codes(user)
        if require_manage
        else get_allowed_profile_codes_for_admin_page(user)
    )

    if not allowed_codes:
        raise PermissionDenied("Bạn không có quyền truy cập KPI Admin.")

    requested_code = profile_code or allowed_codes[0]

    if requested_code not in allowed_codes:
        raise PermissionDenied("Bạn không có quyền truy cập bộ KPI này.")

    profile = KpiProfile.objects.filter(
        period=period,
        profile_code=requested_code,
        is_active=True,
    ).first()

    if not profile:
        raise NotFound("Không tìm thấy bộ KPI trong kỳ đã chọn.")

    return profile


def get_target_role_codes_for_profile(profile):
    if profile.profile_code == KpiProfile.PROFILE_SA_SUP:
        return SA_SUP_ROLE_CODES
    return SA_ROLE_CODES


def get_accessible_branch_queryset(user):
    branches = Branch.objects.filter(status="ACTIVE").order_by("branch_name", "id")

    if user_can_view_all_kpi(user):
        return branches

    branch_id = get_user_employee_branch_id(user)
    if not branch_id:
        return branches.none()

    return branches.filter(id=branch_id)


def serialize_branch(branch):
    return {
        "id": branch.id,
        "branch_code": branch.branch_code,
        "branch_name": branch.branch_name,
    }


def get_accessible_target_users(user, profile, branch_id=None, include_self=False):
    role_codes = get_target_role_codes_for_profile(profile)

    queryset = (
        User.objects.select_related("employee", "employee__branch")
        .filter(employee__isnull=False)
        .filter(user_roles__role__role_code__in=role_codes)
        .distinct()
        .order_by("employee__branch__branch_name", "employee__full_name", "id")
    )

    if hasattr(User, "status"):
        queryset = queryset.filter(status="ACTIVE")

    if user_can_view_all_kpi(user):
        if branch_id and str(branch_id).lower() not in ["all", ""]:
            queryset = queryset.filter(employee__branch_id=branch_id)
        return queryset

    if not user_can_view_branch_kpi(user):
        return queryset.none()

    user_branch_id = get_user_employee_branch_id(user)
    if not user_branch_id:
        return queryset.none()

    queryset = queryset.filter(employee__branch_id=user_branch_id)

    # Supervisor chỉ set/xem nhân viên SA trong chi nhánh. Không set cho chính SUP bằng profile SA_SUP.
    if not include_self:
        queryset = queryset.exclude(id=user.id)

    return queryset


def serialize_user_for_kpi(user):
    employee = getattr(user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None
    role_codes = sorted(user_role_codes(user))
    role_type = "SUP" if set(role_codes) & SA_SUP_ROLE_CODES else "SA"

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": (
            getattr(employee, "full_name", None)
            or user.get_full_name()
            or user.username
            or user.email
        ),
        "employee_id": getattr(employee, "id", None),
        "employee_code": getattr(employee, "employee_code", None),
        "branch_id": getattr(branch, "id", None),
        "branch_name": getattr(branch, "branch_name", None),
        "role_codes": role_codes,
        "role_type": role_type,
    }


def get_part_b_metrics(period, profile):
    return (
        KpiPeriodMetric.objects.select_related("profile", "group", "group__section")
        .filter(
            period=period,
            profile=profile,
            is_active=True,
            group__is_active=True,
            group__section__is_active=True,
            group__section__section_code__istartswith=PART_B_SECTION_PREFIX,
        )
        .order_by("group__section__sort_order", "group__sort_order", "metric_code", "id")
    )


def serialize_metric(metric):
    section = getattr(metric.group, "section", None)
    return {
        "id": metric.id,
        "period": metric.period_id,
        "profile": metric.profile_id,
        "profile_code": metric.profile.profile_code if metric.profile else None,
        "section_code": getattr(section, "section_code", None),
        "section_name": getattr(section, "section_name", None),
        "group": metric.group_id,
        "group_code": metric.group.group_code if metric.group else None,
        "group_name": metric.group.group_name if metric.group else None,
        "metric_code": metric.metric_code,
        "metric_name": metric.metric_name,
        "weight_percent": decimal_to_string(metric.weight_percent),
        "measurement_formula": metric.measurement_formula,
        "target_text": metric.target_text,
        "target_value": decimal_to_string(metric.target_value, None),
        "target_unit": metric.target_unit,
        "frequency": metric.frequency,
    }


def get_all_profile_options(period, user, require_manage=False):
    codes = (
        get_manageable_profile_codes(user)
        if require_manage
        else get_allowed_profile_codes_for_admin_page(user)
    )
    profiles = KpiProfile.objects.filter(period=period, profile_code__in=codes, is_active=True).order_by("sort_order", "id")
    return [
        {
            "id": profile.id,
            "profile_code": profile.profile_code,
            "profile_name": profile.profile_name,
            "target_role_code": profile.target_role_code,
        }
        for profile in profiles
    ]


def get_summary_map(period, profile, users):
    user_ids = [item.id for item in users]
    summaries = KpiUserSummary.objects.filter(
        period=period,
        profile=profile,
        user_id__in=user_ids,
    ).select_related("reward_tier")
    return {item.user_id: item for item in summaries}


def get_part_score_map(period, profile, users):
    user_ids = [item.id for item in users]
    rows = (
        KpiUserMetricResult.objects.filter(
            period=period,
            profile=profile,
            user_id__in=user_ids,
        )
        .values("user_id", "metric__group__section__section_code")
        .annotate(score=Sum("weighted_score"))
    )

    result = defaultdict(lambda: {"part_a_score": Decimal("0"), "part_b_score": Decimal("0")})
    for row in rows:
        section_code = row["metric__group__section__section_code"] or ""
        key = "part_b_score" if section_code.startswith("B") else "part_a_score"
        result[row["user_id"]][key] += row["score"] or Decimal("0")
    return result


def get_metric_result_map(period, profile, users, metrics):
    user_ids = [item.id for item in users]
    metric_ids = [item.id for item in metrics]
    rows = KpiUserMetricResult.objects.filter(
        period=period,
        profile=profile,
        user_id__in=user_ids,
        metric_id__in=metric_ids,
    ).select_related("metric")
    return {(item.user_id, item.metric_id): item for item in rows}


def serialize_target(target):
    if not target:
        return None
    return {
        "id": target.id,
        "period": target.period_id,
        "profile": target.profile_id,
        "metric": target.metric_id,
        "user": target.user_id,
        "employee": target.employee_id,
        "branch": target.branch_id,
        "target_value": decimal_to_string(target.target_value, None),
        "target_text": target.target_text or "",
        "target_unit": target.target_unit or "",
        "note": target.note or "",
        "assigned_by_user": target.assigned_by_user_id,
        "assigned_at": target.assigned_at.isoformat() if target.assigned_at else None,
    }


def get_target_map(period, profile, users, metrics):
    user_ids = [item.id for item in users]
    metric_ids = [item.id for item in metrics]
    targets = KpiUserTarget.objects.filter(
        period=period,
        profile=profile,
        user_id__in=user_ids,
        metric_id__in=metric_ids,
    )
    return {(item.user_id, item.metric_id): item for item in targets}


def ensure_period_is_editable(period):
    if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
        raise ValidationError({"period": "Kỳ KPI đã khóa hoặc đã chốt, không thể set chỉ tiêu."})


def ensure_target_user_allowed(request_user, target_user, profile):
    if not can_assign_target_for_profile(request_user, target_user, profile):
        raise PermissionDenied("Bạn không có quyền set chỉ tiêu cho nhân viên thuộc bộ KPI này.")

    if user_can_view_all_kpi(request_user):
        return

    request_branch_id = get_user_employee_branch_id(request_user)
    target_branch_id = get_user_employee_branch_id(target_user)
    if not request_branch_id or request_branch_id != target_branch_id:
        raise PermissionDenied("Bạn chỉ được set chỉ tiêu cho nhân viên trong chi nhánh của mình.")


def get_part_b_metric_or_404(period, profile, metric_id):
    metric = get_part_b_metrics(period, profile).filter(id=metric_id).first()
    if not metric:
        raise ValidationError({"metric": "Chỉ được set chỉ tiêu cho KPI Phần B."})
    return metric


def upsert_user_target(*, period, profile, metric, target_user, request_user, target_value=None, target_text="", target_unit="", note=""):
    employee = getattr(target_user, "employee", None)
    branch = getattr(employee, "branch", None) if employee else None
    target, created = KpiUserTarget.objects.update_or_create(
        period=period,
        profile=profile,
        metric=metric,
        user=target_user,
        defaults={
            "employee": employee,
            "branch": branch,
            "target_value": target_value,
            "target_text": target_text or "",
            "target_unit": target_unit or metric.target_unit or "",
            "assigned_by_user": request_user,
            "assigned_at": timezone.now(),
            "note": note or "",
        },
    )
    return target, created


class KpiAdminBaseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_context(self, request, require_manage=False):
        period = get_period_from_request(request)
        profile = get_profile_for_admin_page(
            period,
            request.user,
            request.query_params.get("profile_code") or request.data.get("profile_code"),
            require_manage=require_manage,
        )
        branch_id = request.query_params.get("branch") or request.data.get("branch")
        users = list(get_accessible_target_users(request.user, profile, branch_id=branch_id, include_self=True))
        metrics = list(get_part_b_metrics(period, profile))
        return period, profile, branch_id, users, metrics


class KpiAdminMetaAPIView(KpiAdminBaseAPIView):
    def get(self, request):
        period = get_period_from_request(request)
        profile_code = request.query_params.get("profile_code")
        profile = get_profile_for_admin_page(period, request.user, profile_code, require_manage=False)
        branch_id = request.query_params.get("branch")
        users = list(get_accessible_target_users(request.user, profile, branch_id=branch_id, include_self=True))
        return Response(
            {
                "period": serialize_period(period),
                "selected_profile": {
                    "id": profile.id,
                    "profile_code": profile.profile_code,
                    "profile_name": profile.profile_name,
                    "target_role_code": profile.target_role_code,
                },
                "profiles": get_all_profile_options(period, request.user),
                "manageable_profiles": get_all_profile_options(period, request.user, require_manage=True),
                "branches": [serialize_branch(item) for item in get_accessible_branch_queryset(request.user)],
                "employee_count": len(users),
                "can_view_all": user_can_view_all_kpi(request.user),
                "can_manage_targets": profile.profile_code in get_manageable_profile_codes(request.user),
            }
        )


class KpiAdminRankingAPIView(KpiAdminBaseAPIView):
    def get(self, request):
        period, profile, branch_id, users, metrics = self.get_context(request)
        q = (request.query_params.get("q") or "").strip().lower()
        role_type = (request.query_params.get("role_type") or "").upper()

        if q:
            users = [
                item
                for item in users
                if q in (serialize_user_for_kpi(item)["full_name"] or "").lower()
                or q in (item.username or "").lower()
                or q in (item.email or "").lower()
            ]

        if role_type in ["SA", "SUP"]:
            users = [item for item in users if serialize_user_for_kpi(item)["role_type"] == role_type]

        summaries = get_summary_map(period, profile, users)
        part_scores = get_part_score_map(period, profile, users)
        metric_results = get_metric_result_map(period, profile, users, metrics)

        rows = []
        for user in users:
            summary = summaries.get(user.id)
            user_info = serialize_user_for_kpi(user)
            row_metrics = []
            for metric in metrics:
                result = metric_results.get((user.id, metric.id))
                row_metrics.append(
                    {
                        "metric_id": metric.id,
                        "metric_code": metric.metric_code,
                        "metric_name": metric.metric_name,
                        "group_code": metric.group.group_code if metric.group else None,
                        "actual_value": decimal_to_string(getattr(result, "actual_value", None), None),
                        "target_value": decimal_to_string(getattr(result, "target_value", None), None),
                        "score": decimal_to_string(getattr(result, "score", None), "0"),
                        "weighted_score": decimal_to_string(getattr(result, "weighted_score", None), "0"),
                        "result_status": getattr(result, "result_status", None),
                    }
                )

            rows.append(
                {
                    "user": user_info,
                    "summary_id": getattr(summary, "id", None),
                    "manual_score": decimal_to_string(getattr(summary, "manual_score", None), "0"),
                    "auto_score": decimal_to_string(getattr(summary, "auto_score", None), "0"),
                    "total_score": decimal_to_string(getattr(summary, "total_score", None), "0"),
                    "part_a_score": decimal_to_string(part_scores[user.id]["part_a_score"], "0"),
                    "part_b_score": decimal_to_string(part_scores[user.id]["part_b_score"], "0"),
                    "reward_tier_code": getattr(summary, "reward_tier_code", None),
                    "reward_tier_name": getattr(summary, "reward_tier_name", None),
                    "rank_overall": getattr(summary, "rank_overall", None),
                    "rank_branch": getattr(summary, "rank_branch", None),
                    "metrics": row_metrics,
                }
            )

        rows.sort(key=lambda item: Decimal(str(item["total_score"] or "0")), reverse=True)
        for index, row in enumerate(rows, start=1):
            row["rank"] = index

        return Response(
            {
                "period": serialize_period(period),
                "profile": {
                    "id": profile.id,
                    "profile_code": profile.profile_code,
                    "profile_name": profile.profile_name,
                },
                "metrics": [serialize_metric(item) for item in metrics],
                "count": len(rows),
                "results": rows,
            }
        )


def calculate_rate(numerator, denominator):
    numerator = Decimal(str(numerator or 0))
    denominator = Decimal(str(denominator or 0))
    if denominator <= 0:
        return Decimal("0.00")
    return ((numerator / denominator) * Decimal("100")).quantize(Decimal("0.01"))


def calculate_per_call(value, call_count):
    value = Decimal(str(value or 0))
    call_count = Decimal(str(call_count or 0))
    if call_count <= 0:
        return Decimal("0.00")
    return (value / call_count).quantize(Decimal("0.01"))


def get_sa_records_for_operational_report(period, users):
    user_ids = [item.id for item in users]
    if not user_ids:
        return SaRecord.objects.none()

    queryset = (
        SaRecord.objects.select_related(
            "pic_user",
            "pic_user__employee",
            "pic_user__employee__branch",
            "branch",
        )
        .filter(
            pic_user_id__in=user_ids,
            call_date__gte=period.start_date,
            call_date__lte=period.end_date,
        )
    )

    # Báo cáo KPI Admin là báo cáo vận hành nên không tính các record bị đánh dấu invalid/duplicated.
    if hasattr(SaRecord, "STATUS_VALID"):
        queryset = queryset.filter(data_status=SaRecord.STATUS_VALID)

    return queryset


def get_distinct_activated_filter():
    return Q(reactivation=True) & ~Q(account_no="") & Q(account_no__isnull=False)


def get_operational_user_rows(period, users):
    records = get_sa_records_for_operational_report(period, users)
    activated_filter = get_distinct_activated_filter()

    aggregates = {
        row["pic_user_id"]: row
        for row in records.values("pic_user_id").annotate(
            call_count=Count("id"),
            activated_account_count=Count("account_no", filter=activated_filter, distinct=True),
            transaction_fee=Sum("transaction_fee_snapshot"),
            transaction_value=Sum("transaction_value_snapshot"),
        )
    }

    rows = []
    for user in users:
        employee = getattr(user, "employee", None)
        branch = getattr(employee, "branch", None) if employee else None
        row = aggregates.get(user.id, {})
        call_count = int(row.get("call_count") or 0)
        activated_count = int(row.get("activated_account_count") or 0)
        fee = row.get("transaction_fee") or Decimal("0")
        value = row.get("transaction_value") or Decimal("0")

        rows.append(
            {
                "user": serialize_user_for_kpi(user),
                "branch_id": getattr(branch, "id", None),
                "branch_name": getattr(branch, "branch_name", None) or "Chưa có chi nhánh",
                "call_count": call_count,
                "activated_account_count": activated_count,
                "transaction_fee": decimal_to_string(fee, "0"),
                "transaction_value": decimal_to_string(value, "0"),
                "activation_rate": decimal_to_string(calculate_rate(activated_count, call_count), "0"),
                "fee_per_call": decimal_to_string(calculate_per_call(fee, call_count), "0"),
                "value_per_call": decimal_to_string(calculate_per_call(value, call_count), "0"),
            }
        )

    return rows


def get_operational_branch_rows(employee_rows):
    branch_map = {}
    for row in employee_rows:
        key = str(row.get("branch_id") or row.get("branch_name") or "unknown")
        current = branch_map.get(key)
        if not current:
            current = {
                "branch_id": row.get("branch_id"),
                "branch_name": row.get("branch_name") or "Chưa có chi nhánh",
                "employee_count": 0,
                "call_count": 0,
                "activated_account_count": 0,
                "transaction_fee": Decimal("0"),
                "transaction_value": Decimal("0"),
            }
        current["employee_count"] += 1
        current["call_count"] += int(row.get("call_count") or 0)
        current["activated_account_count"] += int(row.get("activated_account_count") or 0)
        current["transaction_fee"] += Decimal(str(row.get("transaction_fee") or 0))
        current["transaction_value"] += Decimal(str(row.get("transaction_value") or 0))
        branch_map[key] = current

    rows = []
    for row in branch_map.values():
        call_count = row["call_count"]
        activated_count = row["activated_account_count"]
        fee = row["transaction_fee"]
        value = row["transaction_value"]
        rows.append(
            {
                "branch_id": row["branch_id"],
                "branch_name": row["branch_name"],
                "employee_count": row["employee_count"],
                "call_count": call_count,
                "activated_account_count": activated_count,
                "transaction_fee": decimal_to_string(fee, "0"),
                "transaction_value": decimal_to_string(value, "0"),
                "activation_rate": decimal_to_string(calculate_rate(activated_count, call_count), "0"),
                "fee_per_call": decimal_to_string(calculate_per_call(fee, call_count), "0"),
                "value_per_call": decimal_to_string(calculate_per_call(value, call_count), "0"),
            }
        )

    return sorted(rows, key=lambda item: (item["call_count"], Decimal(str(item["transaction_fee"] or 0))), reverse=True)


def get_operational_report_payload(period, users):
    employee_rows = get_operational_user_rows(period, users)
    branch_rows = get_operational_branch_rows(employee_rows)

    total_calls = sum(int(row.get("call_count") or 0) for row in employee_rows)
    total_activated = sum(int(row.get("activated_account_count") or 0) for row in employee_rows)
    total_fee = sum(Decimal(str(row.get("transaction_fee") or 0)) for row in employee_rows)
    total_value = sum(Decimal(str(row.get("transaction_value") or 0)) for row in employee_rows)

    return {
        "overview": {
            "call_count": total_calls,
            "activated_account_count": total_activated,
            "transaction_fee": decimal_to_string(total_fee, "0"),
            "transaction_value": decimal_to_string(total_value, "0"),
            "activation_rate": decimal_to_string(calculate_rate(total_activated, total_calls), "0"),
            "fee_per_call": decimal_to_string(calculate_per_call(total_fee, total_calls), "0"),
            "value_per_call": decimal_to_string(calculate_per_call(total_value, total_calls), "0"),
        },
        "employees": employee_rows,
        "branches": branch_rows,
    }


class KpiAdminReportAPIView(KpiAdminBaseAPIView):
    def get(self, request):
        period, profile, branch_id, users, metrics = self.get_context(request)
        user_ids = [item.id for item in users]

        summaries = KpiUserSummary.objects.filter(period=period, profile=profile, user_id__in=user_ids)
        metric_results = KpiUserMetricResult.objects.filter(period=period, profile=profile, user_id__in=user_ids)

        overview = summaries.aggregate(
            employee_count=Count("id"),
            avg_total_score=Avg("total_score"),
            avg_manual_score=Avg("manual_score"),
            avg_auto_score=Avg("auto_score"),
        )

        branch_rows = (
            summaries.values("branch_id", "branch__branch_name")
            .annotate(
                employee_count=Count("user_id", distinct=True),
                avg_total_score=Avg("total_score"),
                total_score=Sum("total_score"),
            )
            .order_by("branch__branch_name")
        )

        metric_rows = (
            metric_results.filter(metric_id__in=[item.id for item in metrics])
            .values("metric_id", "metric__metric_code", "metric__metric_name", "metric__group__group_code")
            .annotate(
                avg_score=Avg("score"),
                avg_actual_value=Avg("actual_value"),
                avg_target_value=Avg("target_value"),
                employee_count=Count("user_id", distinct=True),
            )
            .order_by("metric__group__group_code", "metric__metric_code")
        )

        return Response(
            {
                "period": serialize_period(period),
                "profile": {
                    "id": profile.id,
                    "profile_code": profile.profile_code,
                    "profile_name": profile.profile_name,
                },
                "overview": {
                    "employee_count": len(users),
                    "summary_count": overview["employee_count"] or 0,
                    "avg_total_score": decimal_to_string(overview["avg_total_score"], "0"),
                    "avg_manual_score": decimal_to_string(overview["avg_manual_score"], "0"),
                    "avg_auto_score": decimal_to_string(overview["avg_auto_score"], "0"),
                },
                "by_branch": [
                    {
                        "branch_id": row["branch_id"],
                        "branch_name": row["branch__branch_name"] or "Chưa có chi nhánh",
                        "employee_count": row["employee_count"],
                        "avg_total_score": decimal_to_string(row["avg_total_score"], "0"),
                        "total_score": decimal_to_string(row["total_score"], "0"),
                    }
                    for row in branch_rows
                ],
                "by_metric": [
                    {
                        "metric_id": row["metric_id"],
                        "metric_code": row["metric__metric_code"],
                        "metric_name": row["metric__metric_name"],
                        "group_code": row["metric__group__group_code"],
                        "employee_count": row["employee_count"],
                        "avg_score": decimal_to_string(row["avg_score"], "0"),
                        "avg_actual_value": decimal_to_string(row["avg_actual_value"], None),
                        "avg_target_value": decimal_to_string(row["avg_target_value"], None),
                    }
                    for row in metric_rows
                ],
                # Số liệu vận hành lấy trực tiếp từ sa_records trong kỳ KPI.
                # Không lấy từ điểm/score KPI để tránh cộng nhầm các chỉ tiêu tỷ lệ như "Tỷ lệ liên lạc".
                "operational": get_operational_report_payload(period, users),
            }
        )

class KpiAdminTargetMatrixAPIView(KpiAdminBaseAPIView):
    def get(self, request):
        period, profile, branch_id, users, metrics = self.get_context(request, require_manage=True)
        targets = get_target_map(period, profile, users, metrics)
        target_rows = []
        for user in users:
            target_rows.append(
                {
                    "user": serialize_user_for_kpi(user),
                    "targets": {
                        str(metric.id): serialize_target(targets.get((user.id, metric.id)))
                        for metric in metrics
                    },
                }
            )

        return Response(
            {
                "period": serialize_period(period),
                "profile": {
                    "id": profile.id,
                    "profile_code": profile.profile_code,
                    "profile_name": profile.profile_name,
                    "target_role_code": profile.target_role_code,
                },
                "branches": [serialize_branch(item) for item in get_accessible_branch_queryset(request.user)],
                "metrics": [serialize_metric(item) for item in metrics],
                "employees": [serialize_user_for_kpi(item) for item in users],
                "rows": target_rows,
                "can_select_all": True,
                "can_copy_from_previous_period": True,
                "can_copy_from_first_employee": True,
            }
        )


class KpiAdminBulkTargetUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        period = get_period_from_request(request)
        ensure_period_is_editable(period)
        profile = get_profile_for_admin_page(period, request.user, request.data.get("profile_code"), require_manage=True)
        items = request.data.get("targets") or []

        if not isinstance(items, list) or not items:
            raise ValidationError({"targets": "Danh sách chỉ tiêu không được để trống."})

        changed = []
        for item in items:
            target_user = User.objects.filter(pk=item.get("user") or item.get("user_id")).first()
            if not target_user:
                raise ValidationError({"user": "Không tìm thấy nhân viên cần set chỉ tiêu."})
            ensure_target_user_allowed(request.user, target_user, profile)
            metric = get_part_b_metric_or_404(period, profile, item.get("metric") or item.get("metric_id"))
            target, created = upsert_user_target(
                period=period,
                profile=profile,
                metric=metric,
                target_user=target_user,
                request_user=request.user,
                target_value=parse_decimal_or_none(item.get("target_value")),
                target_text=item.get("target_text") or "",
                target_unit=item.get("target_unit") or metric.target_unit or "",
                note=item.get("note") or "",
            )
            changed.append({"target": serialize_target(target), "created": created})

        return Response(
            {
                "detail": "Lưu chỉ tiêu KPI thành công.",
                "changed_count": len(changed),
                "results": changed,
            },
            status=status.HTTP_200_OK,
        )


class KpiAdminCopyPreviousPeriodTargetsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        period = get_period_from_request(request)
        ensure_period_is_editable(period)
        profile = get_profile_for_admin_page(period, request.user, request.data.get("profile_code"), require_manage=True)

        previous_period = (
            KpiPeriod.objects.filter(end_date__lt=period.start_date, period_type=period.period_type)
            .order_by("-end_date", "-id")
            .first()
        )
        if not previous_period:
            raise NotFound("Không tìm thấy kỳ KPI trước đó.")

        previous_profile = KpiProfile.objects.filter(
            period=previous_period,
            profile_code=profile.profile_code,
            is_active=True,
        ).first()
        if not previous_profile:
            raise NotFound("Không tìm thấy bộ KPI tương ứng ở kỳ trước.")

        user_ids = request.data.get("user_ids") or []
        metric_ids = request.data.get("metric_ids") or []
        users = list(get_accessible_target_users(request.user, profile, include_self=True).filter(id__in=user_ids))
        current_metrics = list(get_part_b_metrics(period, profile))
        if metric_ids:
            current_metrics = [item for item in current_metrics if item.id in set(map(int, metric_ids))]

        previous_metrics_by_code = {
            item.metric_code: item
            for item in get_part_b_metrics(previous_period, previous_profile)
        }

        copied = []
        for target_user in users:
            ensure_target_user_allowed(request.user, target_user, profile)
            for metric in current_metrics:
                previous_metric = previous_metrics_by_code.get(metric.metric_code)
                if not previous_metric:
                    continue
                previous_target = KpiUserTarget.objects.filter(
                    period=previous_period,
                    profile=previous_profile,
                    metric=previous_metric,
                    user=target_user,
                ).first()
                if not previous_target:
                    continue
                target, created = upsert_user_target(
                    period=period,
                    profile=profile,
                    metric=metric,
                    target_user=target_user,
                    request_user=request.user,
                    target_value=previous_target.target_value,
                    target_text=previous_target.target_text or "",
                    target_unit=previous_target.target_unit or metric.target_unit or "",
                    note="Copy chỉ tiêu từ tháng trước.",
                )
                copied.append({"target": serialize_target(target), "created": created})

        return Response(
            {
                "detail": "Copy chỉ tiêu từ kỳ trước thành công.",
                "previous_period": serialize_period(previous_period),
                "copied_count": len(copied),
                "results": copied,
            }
        )


class KpiAdminCopyEmployeeTargetsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        period = get_period_from_request(request)
        ensure_period_is_editable(period)
        profile = get_profile_for_admin_page(period, request.user, request.data.get("profile_code"), require_manage=True)

        source_user_id = request.data.get("source_user") or request.data.get("source_user_id")
        target_user_ids = request.data.get("target_user_ids") or []
        metric_ids = request.data.get("metric_ids") or []

        source_user = User.objects.filter(pk=source_user_id).first()
        if not source_user:
            raise ValidationError({"source_user": "Không tìm thấy nhân viên nguồn."})

        ensure_target_user_allowed(request.user, source_user, profile)

        metrics = list(get_part_b_metrics(period, profile))
        if metric_ids:
            metrics = [item for item in metrics if item.id in set(map(int, metric_ids))]

        source_targets = {
            item.metric_id: item
            for item in KpiUserTarget.objects.filter(
                period=period,
                profile=profile,
                user=source_user,
                metric_id__in=[metric.id for metric in metrics],
            )
        }

        if not source_targets:
            raise ValidationError({"source_user": "Nhân viên nguồn chưa có chỉ tiêu để copy."})

        copied = []
        target_users = list(get_accessible_target_users(request.user, profile, include_self=True).filter(id__in=target_user_ids))
        for target_user in target_users:
            if target_user.id == source_user.id:
                continue
            ensure_target_user_allowed(request.user, target_user, profile)
            for metric in metrics:
                source_target = source_targets.get(metric.id)
                if not source_target:
                    continue
                target, created = upsert_user_target(
                    period=period,
                    profile=profile,
                    metric=metric,
                    target_user=target_user,
                    request_user=request.user,
                    target_value=source_target.target_value,
                    target_text=source_target.target_text or "",
                    target_unit=source_target.target_unit or metric.target_unit or "",
                    note=f"Copy chỉ tiêu từ nhân viên {serialize_user_for_kpi(source_user)['full_name']}.",
                )
                copied.append({"target": serialize_target(target), "created": created})

        return Response(
            {
                "detail": "Copy chỉ tiêu từ nhân viên nguồn thành công.",
                "copied_count": len(copied),
                "results": copied,
            }
        )


class KpiAdminDashboardAPIView(KpiAdminBaseAPIView):
    def get(self, request):
        meta_response = KpiAdminMetaAPIView().get(request).data
        ranking_response = KpiAdminRankingAPIView().get(request).data
        report_response = KpiAdminReportAPIView().get(request).data
        targets_response = None
        try:
            targets_response = KpiAdminTargetMatrixAPIView().get(request).data
        except PermissionDenied:
            targets_response = None

        return Response(
            {
                "meta": meta_response,
                "ranking": ranking_response,
                "report": report_response,
                "targets": targets_response,
            }
        )
