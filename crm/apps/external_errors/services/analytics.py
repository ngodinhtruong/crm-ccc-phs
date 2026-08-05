from collections.abc import Mapping
from datetime import datetime, time, timedelta
from typing import Any

from django.conf import settings
from django.db.models import Count, F, Q, QuerySet
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.external_errors.models import ExternalErrorRecord


GROUP_BY_FIELD_MAP = {
    "source": "clean_source",
    "device": "clean_device",
    "result": "clean_result",
    "cause": "cause_group__cause_name",
    "cause_group": "cause_group__cause_name",
    "cause_group_code": "cause_group__cause_code",
    "normalized_cause": "normalized_cause",
    "cause_status": "cause_classification_status",
    "cause_text": "clean_cause",
    "solution": "clean_solution",
    "status": "classification_status",
    "issue": "normalized_issue",
    "batch": "batch__batch_code",

    # Alias cũ để frontend hiện tại vẫn hoạt động.
    "error_type": "error_code__group__group_name",
    "error_type_code": "error_code__group__group_code",

    # Cấu trúc mới: nhóm lỗi -> mã lỗi.
    "error_group": "error_code__group__group_name",
    "error_group_code": "error_code__group__group_code",
    "error_code": "error_code__error_code",
    "error_code_name": "error_code__error_name",
}

DATE_FIELD_MAP = {
    "received_date": "received_date",
    "completed_date": "completed_date",
}

SUCCESS_STATUSES = [
    ExternalErrorRecord.STATUS_CLASSIFIED,
    ExternalErrorRecord.STATUS_CONFIRMED,
    ExternalErrorRecord.STATUS_NEED_REVIEW,
]


def get_date_param(params: Mapping[str, Any], name: str):
    value = params.get(name)
    if not value:
        return None
    return parse_date(str(value))


def _database_datetime(value: datetime) -> datetime:
    if not settings.USE_TZ:
        return value
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(
        value,
        timezone.get_current_timezone(),
    )


def _bounded_int(
    value: Any,
    *,
    default: int,
    minimum: int = 1,
    maximum: int = 100,
) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(parsed, maximum))


def apply_external_error_filters(
    queryset: QuerySet,
    params: Mapping[str, Any],
):
    date_field = params.get("date_field") or "received_date"
    date_field_name = DATE_FIELD_MAP.get(
        str(date_field),
        "received_date",
    )

    date_from = get_date_param(params, "date_from")
    date_to = get_date_param(params, "date_to")

    # Dùng khoảng datetime trực tiếp để PostgreSQL/MySQL có thể tận dụng
    # index của DateTimeField. date_to dùng cận trên loại trừ của ngày kế tiếp.
    if date_from:
        start_at = _database_datetime(
            datetime.combine(date_from, time.min)
        )
        queryset = queryset.filter(
            **{f"{date_field_name}__gte": start_at}
        )

    if date_to:
        end_at = _database_datetime(
            datetime.combine(
                date_to + timedelta(days=1),
                time.min,
            )
        )
        queryset = queryset.filter(
            **{f"{date_field_name}__lt": end_at}
        )

    filter_map = {
        "device": "clean_device",
        "source": "clean_source",
        "result": "clean_result",
        "cause": "cause_group__cause_code",
        "cause_group": "cause_group__cause_name",
        "cause_group_code": "cause_group__cause_code",
        "normalized_cause": "normalized_cause",
        "cause_status": "cause_classification_status",
        "cause_text": "clean_cause",
        "solution": "clean_solution",
        "issue": "normalized_issue",
        "status": "classification_status",
        "batch": "batch_id",

        # Alias cũ: error_type vẫn nhận group_code như ORDER, LOGIN...
        "error_type": "error_code__group__group_code",
        "error_type_code": "error_code__group__group_code",

        # Filter mới.
        "error_group": "error_code__group__group_name",
        "error_group_code": "error_code__group__group_code",
        "error_code": "error_code__error_code",
        "error_code_name": "error_code__error_name",
    }

    for param_name, field_name in filter_map.items():
        value = params.get(param_name)
        if (
            value is not None
            and str(value).strip().lower() not in {"", "all"}
        ):
            queryset = queryset.filter(**{field_name: value})

    need_review = params.get("need_review")
    if str(need_review).lower() in {"true", "1", "yes"}:
        queryset = queryset.filter(need_review=True)
    elif str(need_review).lower() in {"false", "0", "no"}:
        queryset = queryset.filter(need_review=False)

    cause_need_review = params.get("cause_need_review")
    if str(cause_need_review).lower() in {"true", "1", "yes"}:
        queryset = queryset.filter(cause_need_review=True)
    elif str(cause_need_review).lower() in {"false", "0", "no"}:
        queryset = queryset.filter(cause_need_review=False)

    q = (params.get("q") or "").strip()
    if q:
        queryset = queryset.filter(
            Q(raw_content__icontains=q)
            | Q(raw_cause__icontains=q)
            | Q(raw_solution__icontains=q)
            | Q(clean_content__icontains=q)
            | Q(clean_cause__icontains=q)
            | Q(clean_solution__icontains=q)
            | Q(normalized_issue__icontains=q)
            | Q(normalized_cause__icontains=q)
            | Q(cause_group__cause_code__icontains=q)
            | Q(cause_group__cause_name__icontains=q)
            | Q(error_code__error_code__icontains=q)
            | Q(error_code__error_name__icontains=q)
            | Q(error_code__group__group_code__icontains=q)
            | Q(error_code__group__group_name__icontains=q)
        )

    return queryset


def base_queryset(params: Mapping[str, Any]):
    # Dashboard chỉ dùng values/aggregate nên không cần select_related.
    return apply_external_error_filters(
        ExternalErrorRecord.objects.all(),
        params,
    )


def safe_percent(value: int, total: int):
    if not total:
        return 0
    return round((value / total) * 100, 1)


def _group_by_queryset(
    queryset: QuerySet,
    group_key: str,
    *,
    total: int,
    limit: int,
):
    field_name = GROUP_BY_FIELD_MAP.get(group_key)
    if not field_name:
        valid_values = ", ".join(sorted(GROUP_BY_FIELD_MAP))
        raise ValueError(
            f"group_by không hợp lệ: {group_key!r}. "
            f"Giá trị hợp lệ: {valid_values}."
        )

    rows = (
        queryset.values(field_name)
        .annotate(count=Count("id"))
        .order_by("-count", field_name)[:limit]
    )

    return [
        {
            "label": row[field_name] or "Không xác định",
            "value": row["count"],
            "count": row["count"],
            "percent": safe_percent(row["count"], total),
        }
        for row in rows
    ]


def _summary_counts(queryset: QuerySet):
    classified_statuses = [
        ExternalErrorRecord.STATUS_CLASSIFIED,
        ExternalErrorRecord.STATUS_CONFIRMED,
    ]
    return queryset.aggregate(
        total=Count("id"),
        classified=Count(
            "id",
            filter=Q(classification_status__in=classified_statuses),
        ),
        unclassified=Count(
            "id",
            filter=Q(
                classification_status=ExternalErrorRecord.STATUS_UNCLASSIFIED
            ),
        ),
        need_review=Count(
            "id",
            filter=Q(need_review=True),
        ),
        failed=Count(
            "id",
            filter=Q(
                classification_status=ExternalErrorRecord.STATUS_FAILED
            ),
        ),
        cause_classified=Count(
            "id",
            filter=Q(cause_classification_status__in=classified_statuses),
        ),
        cause_unclassified=Count(
            "id",
            filter=Q(
                cause_classification_status=ExternalErrorRecord.STATUS_UNCLASSIFIED
            ),
        ),
        cause_need_review=Count(
            "id",
            filter=Q(cause_need_review=True),
        ),
        cause_failed=Count(
            "id",
            filter=Q(
                cause_classification_status=(
                    ExternalErrorRecord.STATUS_FAILED
                )
            ),
        ),
    )


def _recurring_issue_group_count(queryset: QuerySet) -> int:
    return (
        queryset.exclude(normalized_issue__isnull=True)
        .exclude(normalized_issue="")
        .values("normalized_issue")
        .annotate(count=Count("id"))
        .filter(count__gte=2)
        .count()
    )


def _build_summary_from_queryset(queryset: QuerySet):
    counts = _summary_counts(queryset)
    total = counts["total"] or 0

    by_source = _group_by_queryset(
        queryset,
        "source",
        total=total,
        limit=10,
    )
    by_device = _group_by_queryset(
        queryset,
        "device",
        total=total,
        limit=10,
    )
    by_error_group = _group_by_queryset(
        queryset,
        "error_group",
        total=total,
        limit=10,
    )
    by_error_code = _group_by_queryset(
        queryset,
        "error_code_name",
        total=total,
        limit=10,
    )
    by_cause_group = _group_by_queryset(
        queryset,
        "cause_group",
        total=total,
        limit=20,
    )

    classified = counts["classified"] or 0
    unclassified = counts["unclassified"] or 0
    failed = counts["failed"] or 0
    cause_classified = counts["cause_classified"] or 0
    cause_unclassified = counts["cause_unclassified"] or 0
    cause_failed = counts["cause_failed"] or 0

    return {
        "total_errors": total,
        "classified_errors": classified,
        "unclassified_errors": unclassified,
        "need_review_errors": counts["need_review"] or 0,
        "failed_errors": failed,
        "recurring_issue_count": _recurring_issue_group_count(queryset),
        "classification_rate": safe_percent(classified, total),
        "cause_classified_errors": cause_classified,
        "cause_unclassified_errors": cause_unclassified,
        "cause_need_review_errors": counts["cause_need_review"] or 0,
        "cause_failed_errors": cause_failed,
        "cause_classification_rate": safe_percent(
            cause_classified,
            total,
        ),
        "by_source": by_source,
        "by_device": by_device,

        # Alias cũ cho frontend hiện tại.
        "by_error_type": by_error_group,

        # Dữ liệu mới.
        "by_error_group": by_error_group,
        "by_error_code": by_error_code,
        "by_cause": by_cause_group,
        "by_cause_group": by_cause_group,
    }


def build_summary(params: Mapping[str, Any]):
    return _build_summary_from_queryset(base_queryset(params))


def group_by(
    params: Mapping[str, Any],
    group_key=None,
    *,
    limit=None,
):
    group_key = str(
        group_key or params.get("group_by") or "device"
    )
    queryset = base_queryset(params)
    total = queryset.count()
    limit_value = _bounded_int(
        limit or params.get("limit"),
        default=20,
        maximum=100,
    )

    return {
        "chart_type": params.get("chart_type") or "BAR",
        "group_by": group_key,
        "breakdown_by": None,
        "total": total,
        "data": _group_by_queryset(
            queryset,
            group_key,
            total=total,
            limit=limit_value,
        ),
    }


def _trend_queryset(
    queryset: QuerySet,
    params: Mapping[str, Any],
):
    interval = str(params.get("interval") or "month")
    date_field = str(params.get("date_field") or "received_date")
    date_field_name = DATE_FIELD_MAP.get(date_field, "received_date")

    if interval == "day":
        trunc = TruncDay(date_field_name)
        label_format = "%d/%m/%Y"
    elif interval == "week":
        trunc = TruncWeek(date_field_name)
        label_format = "Tuần %W/%Y"
    else:
        interval = "month"
        trunc = TruncMonth(date_field_name)
        label_format = "T%m/%Y"

    rows = (
        queryset.exclude(**{f"{date_field_name}__isnull": True})
        .annotate(period=trunc)
        .values("period")
        .annotate(count=Count("id"))
        .order_by("period")
    )

    data = []
    for row in rows:
        period_value = row["period"]
        label = (
            period_value.strftime(label_format)
            if period_value
            else "Không xác định"
        )
        data.append(
            {
                "label": label,
                "value": row["count"],
                "count": row["count"],
            }
        )

    return {
        "chart_type": "LINE",
        "interval": interval,
        "date_field": date_field,
        "data": data,
    }


def trend(params: Mapping[str, Any]):
    return _trend_queryset(base_queryset(params), params)


def _stacked_queryset(
    queryset: QuerySet,
    params: Mapping[str, Any],
):
    group_key = str(params.get("group_by") or "month")
    breakdown_key = str(params.get("breakdown_by") or "device")
    breakdown_field = GROUP_BY_FIELD_MAP.get(breakdown_key)

    if not breakdown_field:
        valid_values = ", ".join(sorted(GROUP_BY_FIELD_MAP))
        raise ValueError(
            f"breakdown_by không hợp lệ: {breakdown_key!r}. "
            f"Giá trị hợp lệ: {valid_values}."
        )

    if group_key in {"month", "week", "day"}:
        date_field_name = DATE_FIELD_MAP.get(
            str(params.get("date_field") or "received_date"),
            "received_date",
        )

        if group_key == "day":
            trunc = TruncDay(date_field_name)
            label_format = "%d/%m/%Y"
        elif group_key == "week":
            trunc = TruncWeek(date_field_name)
            label_format = "Tuần %W/%Y"
        else:
            trunc = TruncMonth(date_field_name)
            label_format = "T%m/%Y"

        rows = (
            queryset.exclude(**{f"{date_field_name}__isnull": True})
            .annotate(group_value=trunc)
            .values("group_value", breakdown_field)
            .annotate(count=Count("id"))
            .order_by("group_value")
        )

        def label_getter(value):
            return (
                value.strftime(label_format)
                if value
                else "Không xác định"
            )

    else:
        group_field = GROUP_BY_FIELD_MAP.get(group_key)
        if not group_field:
            valid_values = ", ".join(sorted(GROUP_BY_FIELD_MAP))
            raise ValueError(
                f"group_by không hợp lệ: {group_key!r}. "
                f"Giá trị hợp lệ: month, week, day, {valid_values}."
            )

        rows = (
            queryset.values(
                group_value=F(group_field),
                breakdown_value=F(breakdown_field),
            )
            .annotate(count=Count("id"))
            .order_by("group_value")
        )

        def label_getter(value):
            return value or "Không xác định"

    data_map: dict[str, dict[str, Any]] = {}
    categories: set[str] = set()

    for row in rows:
        label = label_getter(row["group_value"])
        category = row.get("breakdown_value")
        if category is None:
            category = row.get(breakdown_field)

        category = category or "Không xác định"
        categories.add(category)
        data_map.setdefault(label, {"label": label})[category] = row["count"]

    return {
        "chart_type": params.get("chart_type") or "STACKED_BAR",
        "group_by": group_key,
        "breakdown_by": breakdown_key,
        "categories": sorted(categories),
        "data": list(data_map.values()),
    }


def stacked(params: Mapping[str, Any]):
    return _stacked_queryset(base_queryset(params), params)


def _append_unique(items: list[Any], value: Any, *, limit: int = 5):
    if value in (None, "") or value in items or len(items) >= limit:
        return
    items.append(value)


def _recurring_queryset(
    queryset: QuerySet,
    params: Mapping[str, Any],
):
    min_count = _bounded_int(
        params.get("min_count"),
        default=2,
        maximum=1_000_000,
    )
    limit = _bounded_int(
        params.get("limit"),
        default=20,
        maximum=100,
    )

    rows = list(
        queryset.exclude(normalized_issue__isnull=True)
        .exclude(normalized_issue="")
        .values("normalized_issue")
        .annotate(count=Count("id"))
        .filter(count__gte=min_count)
        .order_by("-count", "normalized_issue")[:limit]
    )

    if not rows:
        return {"data": [], "min_count": min_count}

    issues = [row["normalized_issue"] for row in rows]
    details_by_issue: dict[str, dict[str, Any]] = {
        issue: {
            "devices": [],
            "error_groups": [],
            "cause_groups": [],
            "solutions": [],
            "error_codes": [],
            "error_code_keys": set(),
        }
        for issue in issues
    }

    # Một truy vấn chi tiết cho toàn bộ top issue, thay vì 3-4 truy vấn/issue.
    detail_rows = (
        queryset.filter(normalized_issue__in=issues)
        .order_by()
        .values(
            "normalized_issue",
            "clean_device",
            "clean_solution",
            "raw_solution",
            "error_code__error_code",
            "error_code__error_name",
            "error_code__group__group_code",
            "error_code__group__group_name",
            "cause_group__cause_code",
            "cause_group__cause_name",
        )
        .distinct()
    )

    for detail in detail_rows:
        issue = detail["normalized_issue"]
        bucket = details_by_issue.get(issue)
        if bucket is None:
            continue

        _append_unique(bucket["devices"], detail["clean_device"])
        _append_unique(
            bucket["error_groups"],
            detail["error_code__group__group_name"],
        )
        _append_unique(
            bucket["cause_groups"],
            detail["cause_group__cause_name"],
        )
        solution = str(detail["clean_solution"] or detail["raw_solution"] or "").strip()
        if solution:
            _append_unique(bucket["solutions"], solution)

        error_code = detail["error_code__error_code"]
        error_name = detail["error_code__error_name"]
        code_key = (
            error_code,
            error_name,
            detail["error_code__group__group_code"],
            detail["error_code__group__group_name"],
        )
        if (
            error_code
            and code_key not in bucket["error_code_keys"]
            and len(bucket["error_codes"]) < 5
        ):
            bucket["error_code_keys"].add(code_key)
            bucket["error_codes"].append(
                {
                    "error_code": error_code,
                    "error_name": error_name,
                    "group_code": detail[
                        "error_code__group__group_code"
                    ],
                    "group_name": detail[
                        "error_code__group__group_name"
                    ],
                }
            )

    data = []
    for row in rows:
        issue = row["normalized_issue"]
        bucket = details_by_issue[issue]
        data.append(
            {
                "normalized_issue": issue,
                "count": row["count"],
                "devices": bucket["devices"],

                # Alias cũ.
                "error_types": bucket["error_groups"],

                # Dữ liệu mới.
                "error_groups": bucket["error_groups"],
                "cause_groups": bucket["cause_groups"],
                "solutions": bucket["solutions"],
                "error_codes": bucket["error_codes"],
            }
        )

    return {"data": data, "min_count": min_count}


def recurring(params: Mapping[str, Any]):
    return _recurring_queryset(base_queryset(params), params)


def _params_with(
    params: Mapping[str, Any],
    **updates: Any,
) -> dict[str, Any]:
    if hasattr(params, "dict"):
        result = params.dict()
    else:
        result = dict(params)
    result.update(updates)
    return result


def _chart_from_summary(
    summary: dict[str, Any],
    *,
    key: str,
    chart_type: str,
    group_by_key: str,
):
    return {
        "chart_type": chart_type,
        "group_by": group_by_key,
        "breakdown_by": None,
        "total": summary["total_errors"],
        "data": summary[key],
    }


def build_overview(params: Mapping[str, Any]):
    """
    Một payload cho toàn bộ dashboard chính.

    Frontend mới có thể thay 10 request summary/chart/recurring bằng một request.
    Các endpoint cũ vẫn được giữ nguyên để không làm gãy frontend hiện tại.
    """
    queryset = base_queryset(params)
    summary = _build_summary_from_queryset(queryset)

    trend_data = _trend_queryset(
        queryset,
        _params_with(params, interval="month"),
    )
    stacked_month_device = _stacked_queryset(
        queryset,
        _params_with(
            params,
            chart_type="STACKED_BAR",
            group_by="month",
            breakdown_by="device",
        ),
    )
    stacked_device_error_type = _stacked_queryset(
        queryset,
        _params_with(
            params,
            chart_type="STACKED_HORIZONTAL_BAR",
            group_by="device",
            breakdown_by="error_group",
        ),
    )
    stacked_device_cause = _stacked_queryset(
        queryset,
        _params_with(
            params,
            chart_type="STACKED_HORIZONTAL_BAR",
            group_by="device",
            breakdown_by="cause_group",
        ),
    )
    recurring_data = _recurring_queryset(
        queryset,
        _params_with(params, min_count=2, limit=10),
    )

    return {
        "summary": summary,
        "charts": {
            "by_device": _chart_from_summary(
                summary,
                key="by_device",
                chart_type="BAR",
                group_by_key="device",
            ),
            "by_source": _chart_from_summary(
                summary,
                key="by_source",
                chart_type="DONUT",
                group_by_key="source",
            ),
            "by_error_type": _chart_from_summary(
                summary,
                key="by_error_group",
                chart_type="BAR",
                group_by_key="error_group",
            ),
            "trend": trend_data,
            "stacked_month_device": stacked_month_device,
            "stacked_device_error_type": stacked_device_error_type,
            "cause_donut": _chart_from_summary(
                summary,
                key="by_cause_group",
                chart_type="DONUT",
                group_by_key="cause_group",
            ),
            "stacked_device_cause": stacked_device_cause,
        },
        "recurring": recurring_data,
    }
