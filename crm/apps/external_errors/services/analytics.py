from django.db.models import Count, F, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
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


def get_date_param(params, name):
    value = params.get(name)
    if not value:
        return None
    return parse_date(value)


def apply_external_error_filters(queryset, params):
    date_field = params.get("date_field") or "received_date"
    date_field_name = DATE_FIELD_MAP.get(date_field, "received_date")

    date_from = get_date_param(params, "date_from")
    date_to = get_date_param(params, "date_to")

    # received_date/completed_date là DateTimeField. Lọc theo __date để
    # date_to vẫn bao gồm toàn bộ dữ liệu đến 23:59:59 của ngày được chọn.
    if date_from:
        queryset = queryset.filter(
            **{f"{date_field_name}__date__gte": date_from}
        )
    if date_to:
        queryset = queryset.filter(
            **{f"{date_field_name}__date__lte": date_to}
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
        if value is not None and str(value).strip().lower() not in {"", "all"}:
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


def base_queryset(params):
    queryset = ExternalErrorRecord.objects.select_related(
        "batch",
        "error_code",
        "error_code__group",
        "cause_group",
    )
    return apply_external_error_filters(queryset, params)


def safe_percent(value, total):
    if not total:
        return 0
    return round((value / total) * 100, 1)


def build_summary(params):
    queryset = base_queryset(params)
    total = queryset.count()

    classified = queryset.filter(
        classification_status__in=[
            ExternalErrorRecord.STATUS_CLASSIFIED,
            ExternalErrorRecord.STATUS_CONFIRMED,
            ExternalErrorRecord.STATUS_NEED_REVIEW,
        ]
    ).count()

    need_review = queryset.filter(need_review=True).count()
    failed = queryset.filter(
        classification_status=ExternalErrorRecord.STATUS_FAILED
    ).count()

    cause_classified = queryset.filter(
        cause_classification_status__in=[
            ExternalErrorRecord.STATUS_CLASSIFIED,
            ExternalErrorRecord.STATUS_CONFIRMED,
            ExternalErrorRecord.STATUS_NEED_REVIEW,
        ]
    ).count()
    cause_need_review = queryset.filter(
        cause_need_review=True
    ).count()
    cause_failed = queryset.filter(
        cause_classification_status=ExternalErrorRecord.STATUS_FAILED
    ).count()

    by_source = list(group_by(params, "source", limit=10)["data"])
    by_device = list(group_by(params, "device", limit=10)["data"])
    by_error_group = list(
        group_by(params, "error_group", limit=10)["data"]
    )
    by_error_code = list(
        group_by(params, "error_code_name", limit=10)["data"]
    )
    by_cause_group = list(
        group_by(params, "cause_group", limit=20)["data"]
    )

    recurring_count = (
        queryset.exclude(normalized_issue__isnull=True)
        .exclude(normalized_issue="")
        .values("normalized_issue")
        .annotate(count=Count("id"))
        .filter(count__gte=2)
        .count()
    )

    return {
        "total_errors": total,
        "classified_errors": classified,
        "unclassified_errors": max(total - classified - failed, 0),
        "need_review_errors": need_review,
        "failed_errors": failed,
        "recurring_issue_count": recurring_count,
        "classification_rate": safe_percent(classified, total),
        "cause_classified_errors": cause_classified,
        "cause_unclassified_errors": max(
            total - cause_classified - cause_failed,
            0,
        ),
        "cause_need_review_errors": cause_need_review,
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


def group_by(params, group_key=None, *, limit=None):
    group_key = group_key or params.get("group_by") or "device"
    field_name = GROUP_BY_FIELD_MAP.get(group_key)

    if not field_name:
        valid_values = ", ".join(sorted(GROUP_BY_FIELD_MAP))
        raise ValueError(
            f"group_by không hợp lệ: {group_key!r}. "
            f"Giá trị hợp lệ: {valid_values}."
        )

    queryset = base_queryset(params)
    total = queryset.count()
    limit_value = int(limit or params.get("limit") or 20)

    rows = (
        queryset.values(field_name)
        .annotate(count=Count("id"))
        .order_by("-count", field_name)[:limit_value]
    )

    data = []
    for row in rows:
        label = row[field_name] or "Không xác định"
        count = row["count"]
        data.append(
            {
                "label": label,
                "value": count,
                "count": count,
                "percent": safe_percent(count, total),
            }
        )

    return {
        "chart_type": params.get("chart_type") or "BAR",
        "group_by": group_key,
        "breakdown_by": None,
        "total": total,
        "data": data,
    }


def trend(params):
    queryset = base_queryset(params)
    interval = params.get("interval") or "month"
    date_field = params.get("date_field") or "received_date"
    date_field_name = DATE_FIELD_MAP.get(date_field, "received_date")

    if interval == "day":
        trunc = TruncDay(date_field_name)
        label_format = "%d/%m/%Y"
    elif interval == "week":
        trunc = TruncWeek(date_field_name)
        label_format = "Tuần %W/%Y"
    else:
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


def stacked(params):
    group_key = params.get("group_by") or "month"
    breakdown_key = params.get("breakdown_by") or "device"
    breakdown_field = GROUP_BY_FIELD_MAP.get(breakdown_key)

    if not breakdown_field:
        valid_values = ", ".join(sorted(GROUP_BY_FIELD_MAP))
        raise ValueError(
            f"breakdown_by không hợp lệ: {breakdown_key!r}. "
            f"Giá trị hợp lệ: {valid_values}."
        )

    queryset = base_queryset(params)

    if group_key in {"month", "week", "day"}:
        date_field_name = DATE_FIELD_MAP.get(
            params.get("date_field") or "received_date",
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

    data_map = {}
    categories = set()

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


def recurring(params):
    queryset = base_queryset(params)
    min_count = int(params.get("min_count") or 2)
    limit = int(params.get("limit") or 20)

    rows = (
        queryset.exclude(normalized_issue__isnull=True)
        .exclude(normalized_issue="")
        .values("normalized_issue")
        .annotate(count=Count("id"))
        .filter(count__gte=min_count)
        .order_by("-count", "normalized_issue")[:limit]
    )

    data = []

    for row in rows:
        issue = row["normalized_issue"]
        issue_queryset = queryset.filter(normalized_issue=issue)

        devices = list(
            issue_queryset.exclude(clean_device__isnull=True)
            .exclude(clean_device="")
            .order_by()
            .values_list("clean_device", flat=True)
            .distinct()[:5]
        )

        error_groups = list(
            issue_queryset.exclude(
                error_code__group__group_name__isnull=True
            )
            .exclude(error_code__group__group_name="")
            .order_by()
            .values_list(
                "error_code__group__group_name",
                flat=True,
            )
            .distinct()[:5]
        )

        error_codes = list(
            issue_queryset.exclude(error_code__isnull=True)
            .order_by()
            .values(
                "error_code__error_code",
                "error_code__error_name",
                "error_code__group__group_code",
                "error_code__group__group_name",
            )
            .distinct()[:5]
        )

        data.append(
            {
                "normalized_issue": issue,
                "count": row["count"],
                "devices": devices,

                # Alias cũ.
                "error_types": error_groups,

                # Dữ liệu mới.
                "error_groups": error_groups,
                "error_codes": [
                    {
                        "error_code": item["error_code__error_code"],
                        "error_name": item["error_code__error_name"],
                        "group_code": item[
                            "error_code__group__group_code"
                        ],
                        "group_name": item[
                            "error_code__group__group_name"
                        ],
                    }
                    for item in error_codes
                ],
            }
        )

    return {
        "data": data,
        "min_count": min_count,
    }
