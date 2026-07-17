from collections import defaultdict
from datetime import date

from django.db.models import Count, F, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils.dateparse import parse_date

from apps.external_errors.models import ExternalErrorRecord

GROUP_FIELD_MAP = {
    "device": "clean_device",
    "source": "clean_source",
    "error_type": "error_type_name",
    "error_type_code": "error_type_code",
    "cause": "clean_cause",
    "issue": "normalized_issue",
    "result": "clean_result",
    "status": "classification_status",
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
    if date_field not in DATE_FIELD_MAP:
        date_field = "received_date"
    date_field_name = DATE_FIELD_MAP[date_field]

    date_from = get_date_param(params, "date_from")
    date_to = get_date_param(params, "date_to")

    if date_from:
        queryset = queryset.filter(**{f"{date_field_name}__gte": date_from})
    if date_to:
        queryset = queryset.filter(**{f"{date_field_name}__lte": date_to})

    for param_name, field_name in [
        ("device", "clean_device"),
        ("source", "clean_source"),
        ("error_type", "error_type_code"),
        ("issue", "normalized_issue"),
        ("status", "classification_status"),
        ("batch", "batch_id"),
    ]:
        value = params.get(param_name)
        if value and str(value).lower() not in ["all", ""]:
            queryset = queryset.filter(**{field_name: value})

    need_review = params.get("need_review")
    if str(need_review).lower() in ["true", "1", "yes"]:
        queryset = queryset.filter(need_review=True)
    elif str(need_review).lower() in ["false", "0", "no"]:
        queryset = queryset.filter(need_review=False)

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
        )

    return queryset


def base_queryset(params):
    queryset = ExternalErrorRecord.objects.select_related("batch")
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
    failed = queryset.filter(classification_status=ExternalErrorRecord.STATUS_FAILED).count()

    by_source = list(group_by(params, "source", limit=10)["data"])
    by_device = list(group_by(params, "device", limit=10)["data"])
    by_error_type = list(group_by(params, "error_type", limit=10)["data"])

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
        "by_source": by_source,
        "by_device": by_device,
        "by_error_type": by_error_type,
    }


def group_by(params, group_key=None, *, limit=None):
    group_key = group_key or params.get("group_by") or "device"
    field_name = GROUP_FIELD_MAP.get(group_key)
    if not field_name:
        raise ValueError("group_by không hợp lệ.")

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
        data.append({"label": label, "value": count, "count": count, "percent": safe_percent(count, total)})

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
        label = period_value.strftime(label_format) if period_value else "Không xác định"
        data.append({"label": label, "value": row["count"], "count": row["count"]})

    return {
        "chart_type": "LINE",
        "interval": interval,
        "date_field": date_field,
        "data": data,
    }


def stacked(params):
    group_key = params.get("group_by") or "month"
    breakdown_key = params.get("breakdown_by") or "device"
    breakdown_field = GROUP_FIELD_MAP.get(breakdown_key)
    if not breakdown_field:
        raise ValueError("breakdown_by không hợp lệ.")

    queryset = base_queryset(params)

    if group_key in ["month", "week", "day"]:
        date_field_name = DATE_FIELD_MAP.get(params.get("date_field") or "received_date", "received_date")
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
        label_getter = lambda value: value.strftime(label_format) if value else "Không xác định"
    else:
        group_field = GROUP_FIELD_MAP.get(group_key)
        if not group_field:
            raise ValueError("group_by không hợp lệ.")
        rows = (
            queryset.values(group_value=F(group_field), breakdown_value=F(breakdown_field))
            .annotate(count=Count("id"))
            .order_by("group_value")
        )
        label_getter = lambda value: value or "Không xác định"

    data_map = {}
    categories = set()
    for row in rows:
        label = label_getter(row["group_value"])
        category = row.get("breakdown_value") if "breakdown_value" in row else row.get(breakdown_field)
        category = category or "Không xác định"
        categories.add(category)
        data_map.setdefault(label, {"label": label})[category] = row["count"]

    data = list(data_map.values())
    return {
        "chart_type": params.get("chart_type") or "STACKED_BAR",
        "group_by": group_key,
        "breakdown_by": breakdown_key,
        "categories": sorted(categories),
        "data": data,
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
            .values_list("clean_device", flat=True)
            .distinct()[:5]
        )
        error_types = list(
            issue_queryset.exclude(error_type_name__isnull=True)
            .exclude(error_type_name="")
            .values_list("error_type_name", flat=True)
            .distinct()[:5]
        )
        data.append(
            {
                "normalized_issue": issue,
                "count": row["count"],
                "devices": devices,
                "error_types": error_types,
            }
        )

    return {"data": data, "min_count": min_count}
