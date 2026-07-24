import calendar
import statistics
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db.models import Avg, Count, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.scopes import filter_tickets_by_user
from apps.common.constants import SlaStatus, TicketStatusCode
from apps.tickets.dashboard_cache import (
    build_queryset_scope_fingerprint,
    build_ticket_dashboard_cache_key,
    get_ticket_dashboard_cache,
    is_dashboard_refresh_requested,
    set_ticket_dashboard_cache,
)
from apps.tickets.models import (
    Ticket,
    TicketAccountLinkStatus,
    TicketUpdateLog,
)


DEFAULT_RECENT_LIMIT = 10
DEFAULT_TOP_LIMIT = 10
REPORT_MONTH_COUNT = 5
MAX_RECENT_LIMIT = 50
PENDING_PAGE_SIZE_OPTIONS = (5, 10, 20)
DEFAULT_PENDING_PAGE_SIZE = 10
DEFAULT_MAX_REPORT_MONTHS = 12

REPORT_SECTION_NAMES = frozenset(
    {
        "report_monthly",
        "report_source",
        "report_category",
        "report_unit",
        "report_time",
        "report_sla",
        "report_employee",
        "report_summary",
    }
)
ALL_DASHBOARD_SECTIONS = frozenset(
    {
        "overview",
        "distributions",
        "trend",
        "root_cause",
        "ageing",
        "pending",
        *REPORT_SECTION_NAMES,
    }
)
SECTION_ALIASES = {
    "all": ALL_DASHBOARD_SECTIONS,
    "core": frozenset(
        {"overview", "distributions", "trend", "root_cause", "ageing"}
    ),
    "charts": frozenset(
        {"distributions", "trend", "root_cause", "ageing"}
    ),
    "reports": REPORT_SECTION_NAMES,
    "report": REPORT_SECTION_NAMES,
}

PENDING_TICKET_SELECT_RELATED = (
    "customer",
    "company",
    "customer_account",
    "handling_branch",
    "assigned_employee",
    "current_status",
    "support_category",
    "source",
    "error_group",
    "error_type",
)

REPORT_TICKET_SELECT_RELATED = (
    "source",
    "support_category",
    "classification",
    "current_status",
    "error_group",
    "error_type",
    "assigned_unit",
    "assigned_employee",
    "owner_user",
    "sla_tracking",
)

PENDING_TICKET_ONLY_FIELDS = (
    "id",
    "ticket_code",
    "title",
    "created_at",
    "raw_account_number",
    "account_link_status",
    "customer_id",
    "customer__full_name",
    "company_id",
    "company__company_name",
    "customer_account_id",
    "customer_account__account_number",
    "handling_branch_id",
    "handling_branch__branch_name",
    "assigned_employee_id",
    "assigned_employee__full_name",
    "current_status_id",
    "current_status__status_code",
    "current_status__status_name",
    "support_category_id",
    "support_category__category_name",
    "source_id",
    "source__source_name",
    "error_group_id",
    "error_group__group_name",
    "error_type_id",
    "error_type__type_name",
)

REPORT_TICKET_ONLY_FIELDS = (
    "id",
    "title",
    "request_content",
    "source_ref_id",
    "related_system",
    "cancelled_reason",
    "created_at",
    "accepted_at",
    "processing_started_at",
    "done_at",
    "closed_at",
    "cancelled_at",
    "source_id",
    "source__source_code",
    "source__source_name",
    "support_category_id",
    "support_category__category_code",
    "support_category__category_name",
    "classification_id",
    "classification__classification_code",
    "classification__classification_name",
    "current_status_id",
    "current_status__status_code",
    "error_group_id",
    "error_group__group_name",
    "error_type_id",
    "error_type__type_name",
    "assigned_unit_id",
    "assigned_unit__unit_code",
    "assigned_unit__unit_name",
    "assigned_employee_id",
    "assigned_employee__full_name",
    "owner_user_id",
    "owner_user__username",
    "owner_user__email",
    "owner_user__first_name",
    "owner_user__last_name",
    "sla_tracking__sla_status",
)


def _safe_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_limit(value, default, maximum):
    return max(1, min(_safe_int(value, default), maximum))


def _safe_pending_page_size(value):
    page_size = _safe_int(value, DEFAULT_PENDING_PAGE_SIZE)
    if page_size not in PENDING_PAGE_SIZE_OPTIONS:
        return DEFAULT_PENDING_PAGE_SIZE
    return page_size


def _safe_page(value):
    return max(1, _safe_int(value, 1))


def _requested_sections(params):
    raw_values = params.getlist("sections") or params.getlist("section")
    if not raw_values:
        return set(ALL_DASHBOARD_SECTIONS)

    requested = set()
    for raw_value in raw_values:
        for value in str(raw_value or "").split(","):
            normalized = value.strip().lower()
            if not normalized:
                continue
            alias_sections = SECTION_ALIASES.get(normalized)
            if alias_sections is not None:
                requested.update(alias_sections)
            elif normalized in ALL_DASHBOARD_SECTIONS:
                requested.add(normalized)

    return requested or set(ALL_DASHBOARD_SECTIONS)


def _has_any_section(sections, candidates):
    return bool(set(candidates) & set(sections))


def _max_report_months():
    value = _safe_int(
        getattr(
            settings,
            "TICKET_CCC_DASHBOARD_MAX_REPORT_MONTHS",
            DEFAULT_MAX_REPORT_MONTHS,
        ),
        DEFAULT_MAX_REPORT_MONTHS,
    )
    return max(1, value)


def _percent(value, total):
    if not total:
        return 0

    return round((value / total) * 100, 2)


def _display_user(user):
    if not user:
        return None

    full_name = user.get_full_name()
    return full_name or user.username or user.email


def _ticket_status_code(name, default=None):
    return getattr(TicketStatusCode, name, default or name)


STATUS_CREATED = _ticket_status_code("CREATED", "CREATED")
STATUS_ACCEPTED = _ticket_status_code("ACCEPTED", "ACCEPTED")
STATUS_PROCESSING = _ticket_status_code("PROCESSING", "PROCESSING")
STATUS_DONE_WAIT_CLOSE = _ticket_status_code("DONE_WAIT_CLOSE", "DONE_WAIT_CLOSE")
STATUS_CLOSED = _ticket_status_code("CLOSED", "CLOSED")
STATUS_CANCELLED = _ticket_status_code("CANCELLED", "CANCELLED")

RESOLVED_STATUS_CODES = {STATUS_CLOSED, STATUS_DONE_WAIT_CLOSE, "DONE", "RESOLVED"}
CANCELLED_STATUS_CODES = {
    STATUS_CANCELLED,
    "CANCELED",
    "SPAM",
    "HUY",
    "HỦY",
    "DA_HUY",
    "ĐÃ HỦY",
}
OPEN_STATUS_CODES = {
    STATUS_CREATED,
    STATUS_ACCEPTED,
    STATUS_PROCESSING,
    STATUS_DONE_WAIT_CLOSE,
}


def _month_start(value):
    return date(value.year, value.month, 1)


def _add_months(value, months):
    month_index = (value.year * 12 + value.month - 1) + months
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _month_end(value):
    return date(value.year, value.month, calendar.monthrange(value.year, value.month)[1])


def _month_label(value):
    return f"Tháng {value.month:02d}"


def _month_key(value):
    return f"{value.year}-{value.month:02d}"


def _period_label(value):
    return f"{value.month:02d}/{value.year}"


def dashboard_date_range_from_params(params):
    """
    Dashboard CCC mặc định lấy tháng hiện tại.
    Hỗ trợ:
    - period=YYYY-MM
    - date_from/date_to
    - created_from/created_to
    """
    today = timezone.localdate()
    start_date = today.replace(day=1)
    end_date = today

    period = params.get("period")
    if period:
        periods = str(period).split(",")
        try:
            min_date = None
            max_date = None
            for p in periods:
                year_text, month_text = p.split("-", 1)
                year = int(year_text)
                month = int(month_text)
                p_start = date(year, month, 1)
                p_end = _month_end(p_start)
                if not min_date or p_start < min_date:
                    min_date = p_start
                if not max_date or p_end > max_date:
                    max_date = p_end
            if min_date and max_date:
                start_date = min_date
                end_date = max_date
        except (TypeError, ValueError):
            pass

    date_from = (
        params.get("date_from")
        or params.get("start_date")
        or params.get("created_from")
        or params.get("from")
    )
    date_to = (
        params.get("date_to")
        or params.get("end_date")
        or params.get("created_to")
        or params.get("to")
    )

    parsed_from = parse_date(date_from) if date_from else None
    parsed_to = parse_date(date_to) if date_to else None

    if parsed_from:
        start_date = parsed_from

    if parsed_to:
        end_date = parsed_to

    # Dashboard chatbot dùng bộ lọc year/month thay cho period. Chỉ áp dụng
    # khi người dùng không truyền khoảng ngày cụ thể, để quy tắc ưu tiên
    # start_date/end_date vẫn giống filter_summaries().
    if not parsed_from and not parsed_to and not period:
        year = _safe_int(params.get("year"), 0)
        month = _safe_int(params.get("month"), 0)

        if year > 0 and 1 <= month <= 12:
            start_date = date(year, month, 1)
            end_date = _month_end(start_date)
        elif year > 0:
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    return start_date, end_date


def _datetime_range(date_from, date_to):
    """Return an index-friendly [start, end) datetime range."""
    start_at = datetime.combine(date_from, time.min)
    end_at = datetime.combine(date_to + timedelta(days=1), time.min)

    if settings.USE_TZ:
        current_tz = timezone.get_current_timezone()
        start_at = timezone.make_aware(start_at, current_tz)
        end_at = timezone.make_aware(end_at, current_tz)

    return start_at, end_at


def _selected_report_months(date_from, date_to, max_months=None):
    first_month = _month_start(date_from)
    last_month = _month_start(date_to)

    months = []
    current = first_month

    while current <= last_month:
        months.append(current)
        current = _add_months(current, 1)

    if max_months and len(months) > max_months:
        months = months[-max_months:]

    return months


def build_report_tickets(queryset, date_from, date_to):
    """
    Chuẩn hóa danh sách ticket dùng cho báo cáo tháng.

    Hàm này được dùng chung bởi dashboard ticket và dashboard chatbot để
    bảo đảm cùng một quy tắc khoảng thời gian, timezone và select_related.
    """
    report_months = _selected_report_months(date_from, date_to)
    report_from = report_months[0]
    report_to = _month_end(report_months[-1])
    start_at, end_at = _datetime_range(report_from, report_to)

    report_queryset = (
        queryset.filter(
            created_at__gte=start_at,
            created_at__lt=end_at,
        )
        .select_related(*REPORT_TICKET_SELECT_RELATED)
        .distinct()
    )

    return list(report_queryset), report_months, report_from, report_to


def _base_queryset_without_date(request):
    params = request.query_params

    queryset = Ticket.objects.all()

    queryset = filter_tickets_by_user(queryset, request.user)

    q = params.get("q")
    ticket_code = params.get("ticket_code")
    account_number = params.get("account_number") or params.get("customer_account_no")
    branch = params.get("branch") or params.get("handling_branch")
    status = params.get("status") or params.get("current_status")
    category = params.get("category") or params.get("support_category")
    classification = params.get("classification")
    source = params.get("source")
    priority = params.get("priority")
    account_link_status = params.get("account_link_status")
    vip_tier = params.get("vip_tier") or params.get("membership_tier")
    error_group = params.get("error_group")
    error_type = params.get("error_type")
    related_system = params.get("related_system")

    if q:
        queryset = queryset.filter(
            Q(ticket_code__icontains=q)
            | Q(title__icontains=q)
            | Q(request_content__icontains=q)
            | Q(source_ref_id__icontains=q)
            | Q(error_note__icontains=q)
            | Q(related_system__icontains=q)
            | Q(customer__full_name__icontains=q)
            | Q(customer__phone__icontains=q)
            | Q(customer__email__icontains=q)
            | Q(company__company_name__icontains=q)
            | Q(customer_account__account_number__icontains=q)
            | Q(raw_account_number__icontains=q)
            | Q(support_category__category_name__icontains=q)
            | Q(classification__classification_name__icontains=q)
            | Q(source__source_name__icontains=q)
            | Q(error_group__group_name__icontains=q)
            | Q(error_type__type_name__icontains=q)
        )

    if ticket_code:
        queryset = queryset.filter(ticket_code__icontains=ticket_code)

    if account_number:
        queryset = queryset.filter(
            Q(customer_account__account_number__icontains=account_number)
            | Q(raw_account_number__icontains=account_number)
        )

    if branch:
        queryset = queryset.filter(handling_branch_id=branch)

    if status:
        if str(status).isdigit():
            queryset = queryset.filter(current_status_id=status)
        else:
            queryset = queryset.filter(current_status__status_code=status)

    if category:
        queryset = queryset.filter(support_category_id=category)

    if classification:
        queryset = queryset.filter(classification_id=classification)

    if source:
        queryset = queryset.filter(source_id=source)

    if priority:
        queryset = queryset.filter(priority_id=priority)

    if account_link_status in {
        TicketAccountLinkStatus.LINKED,
        TicketAccountLinkStatus.UNLINKED,
    }:
        queryset = queryset.filter(account_link_status=account_link_status)

    if vip_tier:
        if str(vip_tier).isdigit():
            queryset = queryset.filter(
                Q(customer__membership_tier_id=vip_tier)
                | Q(company__membership_tier_id=vip_tier)
            )
        else:
            queryset = queryset.filter(
                Q(customer__membership_tier__tier_code__icontains=vip_tier)
                | Q(customer__membership_tier__tier_name__icontains=vip_tier)
                | Q(company__membership_tier__tier_code__icontains=vip_tier)
                | Q(company__membership_tier__tier_name__icontains=vip_tier)
            )

    if error_group:
        queryset = queryset.filter(error_group_id=error_group)

    if error_type:
        queryset = queryset.filter(error_type_id=error_type)

    if related_system:
        queryset = queryset.filter(related_system__icontains=related_system)

    month_key = params.get("month_key") or params.get("selected_month")
    if month_key:
        try:
            parts = str(month_key).split("-")
            if len(parts) == 2:
                year_val = int(parts[0])
                month_val = int(parts[1])
                if 1 <= month_val <= 12:
                    month_start = date(year_val, month_val, 1)
                    month_end = _month_end(month_start)
                    start_at, end_at = _datetime_range(month_start, month_end)
                    queryset = queryset.filter(
                        created_at__gte=start_at,
                        created_at__lt=end_at,
                    )
        except (TypeError, ValueError):
            pass

    # Do not force DISTINCT for every dashboard query. The filters above use
    # foreign-key joins and do not duplicate ticket rows. If the permission
    # scope itself needs DISTINCT, filter_tickets_by_user can retain it.
    return queryset


def _ticket_queryset_for_range(request, start_date, end_date):
    queryset = _base_queryset_without_date(request)
    start_at, end_at = _datetime_range(start_date, end_date)
    return queryset.filter(
        created_at__gte=start_at,
        created_at__lt=end_at,
    )


def _base_ticket_queryset(request):
    date_from, date_to = dashboard_date_range_from_params(request.query_params)
    return _ticket_queryset_for_range(request, date_from, date_to), date_from, date_to


def _memoized_ticket_value(ticket, attribute, builder):
    if hasattr(ticket, attribute):
        return getattr(ticket, attribute)

    value = builder()
    setattr(ticket, attribute, value)
    return value


def _status_code(ticket):
    return _memoized_ticket_value(
        ticket,
        "_dashboard_status_code",
        lambda: ticket.current_status.status_code if ticket.current_status else "",
    )


def _is_cancelled_ticket(ticket):
    return _memoized_ticket_value(
        ticket,
        "_dashboard_is_cancelled",
        lambda: bool(
            ticket.cancelled_at
            or (_status_code(ticket) or "").upper() in CANCELLED_STATUS_CODES
        ),
    )


def _is_resolved_ticket(ticket):
    return _memoized_ticket_value(
        ticket,
        "_dashboard_is_resolved",
        lambda: bool(
            (
                ticket.closed_at
                or ticket.done_at
                or (_status_code(ticket) or "").upper() in RESOLVED_STATUS_CODES
            )
            and not _is_cancelled_ticket(ticket)
        ),
    )


def _text_contains_any(value, keywords):
    text = str(value or "").lower()
    return any(keyword in text for keyword in keywords)


def _is_ekyc_ticket(ticket):
    def calculate():
        values = [
            ticket.title,
            ticket.request_content,
            ticket.source_ref_id,
            ticket.related_system,
            ticket.support_category.category_name if ticket.support_category else "",
            ticket.support_category.category_code if ticket.support_category else "",
            ticket.classification.classification_name if ticket.classification else "",
            ticket.classification.classification_code if ticket.classification else "",
            ticket.error_group.group_name if ticket.error_group else "",
            ticket.error_type.type_name if ticket.error_type else "",
        ]
        return _text_contains_any(
            " ".join(str(value or "") for value in values),
            ["ekyc", "e-kyc", "e kyc"],
        )

    return _memoized_ticket_value(ticket, "_dashboard_is_ekyc", calculate)


def _is_spam_ticket(ticket):
    def calculate():
        values = [
            ticket.title,
            ticket.request_content,
            ticket.cancelled_reason,
            ticket.support_category.category_name if ticket.support_category else "",
            ticket.classification.classification_name if ticket.classification else "",
            ticket.error_group.group_name if ticket.error_group else "",
            ticket.error_type.type_name if ticket.error_type else "",
            _status_code(ticket),
        ]
        return _text_contains_any(
            " ".join(str(value or "") for value in values),
            ["spam", "rác", "rac"],
        )

    return _memoized_ticket_value(ticket, "_dashboard_is_spam", calculate)


def _is_report_processed_ticket(ticket):
    return _memoized_ticket_value(
        ticket,
        "_dashboard_is_report_processed",
        lambda: (
            _is_resolved_ticket(ticket)
            and not _is_ekyc_ticket(ticket)
            and not _is_spam_ticket(ticket)
        ),
    )


def _ticket_finish_at(ticket):
    return ticket.closed_at or ticket.done_at or ticket.cancelled_at


def _ticket_start_at(ticket):
    return ticket.accepted_at or ticket.processing_started_at or ticket.created_at


def _duration_minutes(ticket):
    end_at = _ticket_finish_at(ticket)

    if not ticket.created_at or not end_at:
        return None

    return int((end_at - ticket.created_at).total_seconds() // 60)


def _handling_days(ticket, prefer_related=False):
    cache_attribute = (
        "_dashboard_related_handling_days"
        if prefer_related
        else "_dashboard_cs_handling_days"
    )

    def calculate():
        end_at = _ticket_finish_at(ticket)
        if not end_at:
            return None

        if prefer_related:
            start_at = (
                ticket.processing_started_at
                or ticket.accepted_at
                or ticket.created_at
            )
        else:
            start_at = (
                ticket.accepted_at
                or ticket.processing_started_at
                or ticket.created_at
            )

        if not start_at:
            return None

        return round(max((end_at - start_at).total_seconds(), 0) / 86400, 3)

    return _memoized_ticket_value(ticket, cache_attribute, calculate)


def _average(values):
    cleaned = [value for value in values if value is not None]
    if not cleaned:
        return None

    return round(sum(cleaned) / len(cleaned), 3)


def _overview_counts(queryset, now):
    resolved_filter = (
        Q(current_status__status_code__in=list(RESOLVED_STATUS_CODES))
        | Q(closed_at__isnull=False)
        | Q(done_at__isnull=False)
    ) & ~Q(current_status__status_code__in=list(CANCELLED_STATUS_CODES))

    cancelled_filter = (
        Q(current_status__status_code__in=list(CANCELLED_STATUS_CODES))
        | Q(cancelled_at__isnull=False)
    )

    return queryset.aggregate(
        total=Count("id", distinct=True),
        resolved=Count("id", filter=resolved_filter, distinct=True),
        cancelled=Count("id", filter=cancelled_filter, distinct=True),
        pending=Count(
            "id",
            filter=~Q(
                current_status__status_code__in=list(
                    RESOLVED_STATUS_CODES | CANCELLED_STATUS_CODES
                )
            ),
            distinct=True,
        ),
        linked=Count(
            "id",
            filter=Q(account_link_status=TicketAccountLinkStatus.LINKED),
            distinct=True,
        ),
        unlinked=Count(
            "id",
            filter=Q(account_link_status=TicketAccountLinkStatus.UNLINKED),
            distinct=True,
        ),
        error=Count(
            "id",
            filter=Q(error_group__isnull=False) | Q(error_type__isnull=False),
            distinct=True,
        ),
        overdue_sla=Count(
            "id",
            filter=(
                Q(sla_tracking__sla_status=SlaStatus.OVERDUE)
                | Q(
                    sla_tracking__resolution_due_at__lt=now,
                    closed_at__isnull=True,
                    current_status__status_code__in=list(OPEN_STATUS_CODES),
                )
            ),
            distinct=True,
        ),
    )


def _resolution_metrics(queryset):
    values = sorted(_resolution_minutes_list(queryset))

    if not values:
        return {
            "average": None,
            "median": None,
            "p75": None,
            "p90": None,
        }

    count = len(values)
    p75_index = min(int(count * 0.75), count - 1)
    p90_index = min(int(count * 0.90), count - 1)

    return {
        "average": round(sum(values) / count, 2),
        "median": round(statistics.median(values), 2),
        "p75": round(values[p75_index], 2),
        "p90": round(values[p90_index], 2),
    }


def _average_resolution_minutes(queryset):
    values = _resolution_minutes_list(queryset)

    if not values:
        return None

    return round(sum(values) / len(values), 2)


def _resolution_minutes_list(queryset):
    values = []
    rows = queryset.filter(
        Q(current_status__status_code__in=list(RESOLVED_STATUS_CODES))
        | Q(closed_at__isnull=False)
        | Q(done_at__isnull=False)
    ).values_list(
        "created_at",
        "closed_at",
        "done_at",
        "cancelled_at",
    )

    for created_at, closed_at, done_at, cancelled_at in rows.iterator(
        chunk_size=2000
    ):
        end_at = closed_at or done_at or cancelled_at
        if created_at and end_at:
            values.append(int((end_at - created_at).total_seconds() // 60))

    return values


def _resolution_percentiles(queryset):
    """Return median (P50), P75, P90 resolution times in minutes."""
    values = sorted(_resolution_minutes_list(queryset))

    if not values:
        return {"median": None, "p75": None, "p90": None}

    median_val = statistics.median(values)
    n = len(values)
    p75_idx = int(n * 0.75)
    p90_idx = int(n * 0.90)

    return {
        "median": round(median_val, 2),
        "p75": round(values[min(p75_idx, n - 1)], 2),
        "p90": round(values[min(p90_idx, n - 1)], 2),
    }


def _sla_stats(queryset):
    """Compute SLA achievement rates with one aggregate query."""
    from apps.sla.models import TicketSlaTracking

    stats = TicketSlaTracking.objects.filter(ticket__in=queryset).aggregate(
        total=Count("id"),
        on_time=Count("id", filter=Q(sla_status=SlaStatus.ON_TIME)),
        overdue=Count("id", filter=Q(sla_status=SlaStatus.OVERDUE)),
        processing=Count("id", filter=Q(sla_status="PROCESSING")),
    )

    total_sla = stats["total"] or 0
    on_time = stats["on_time"] or 0

    return {
        "total_with_sla": total_sla,
        "on_time": on_time,
        "overdue": stats["overdue"] or 0,
        "processing": stats["processing"] or 0,
        "sla_rate": _percent(on_time, total_sla),
    }


def _csat_stats(queryset):
    """Compute CSAT with one aggregate query."""
    from apps.tickets.models import TicketFeedback

    stats = TicketFeedback.objects.filter(
        ticket__in=queryset,
        survey_sent=True,
    ).aggregate(
        total_sent=Count("id"),
        responded=Count(
            "id",
            filter=Q(survey_status="RESPONDED"),
        ),
        rated=Count(
            "id",
            filter=Q(
                survey_status="RESPONDED",
                rating_score__isnull=False,
            ),
        ),
        satisfied=Count(
            "id",
            filter=Q(
                survey_status="RESPONDED",
                rating_score__gte=4,
            ),
        ),
        avg_score=Avg(
            "rating_score",
            filter=Q(
                survey_status="RESPONDED",
                rating_score__isnull=False,
            ),
        ),
    )

    total_sent = stats["total_sent"] or 0
    responded = stats["responded"] or 0
    rated = stats["rated"] or 0
    satisfied = stats["satisfied"] or 0
    avg_score = stats["avg_score"]

    return {
        "survey_sent": total_sent,
        "survey_responded": responded,
        "response_rate": _percent(responded, total_sent),
        "avg_score": round(avg_score, 2) if avg_score is not None else None,
        "csat_percentage": _percent(satisfied, rated) if rated else None,
    }


def _previous_period_overview(request, date_from, date_to):
    """Calculate previous-period overview with one aggregate query."""
    delta = date_to - date_from
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - delta
    prev_queryset = _ticket_queryset_for_range(request, prev_from, prev_to)

    resolved_filter = (
        Q(current_status__status_code__in=list(RESOLVED_STATUS_CODES))
        | Q(closed_at__isnull=False)
        | Q(done_at__isnull=False)
    ) & ~Q(current_status__status_code__in=list(CANCELLED_STATUS_CODES))

    stats = prev_queryset.aggregate(
        total=Count("id", distinct=True),
        resolved=Count("id", filter=resolved_filter, distinct=True),
        cancelled=Count(
            "id",
            filter=(
                Q(current_status__status_code__in=list(CANCELLED_STATUS_CODES))
                | Q(cancelled_at__isnull=False)
            ),
            distinct=True,
        ),
        pending=Count(
            "id",
            filter=~Q(
                current_status__status_code__in=list(
                    RESOLVED_STATUS_CODES | CANCELLED_STATUS_CODES
                )
            ),
            distinct=True,
        ),
    )

    return {
        "period_from": prev_from.isoformat(),
        "period_to": prev_to.isoformat(),
        "total_tickets": stats["total"] or 0,
        "resolved_tickets": stats["resolved"] or 0,
        "cancelled_tickets": stats["cancelled"] or 0,
        "pending_processing": stats["pending"] or 0,
    }


def _ageing_backlog(queryset):
    """Group pending tickets with one filtered aggregate query."""
    now = timezone.now()
    pending = queryset.exclude(
        current_status__status_code__in=list(
            RESOLVED_STATUS_CODES | CANCELLED_STATUS_CODES
        )
    )

    h4 = now - timedelta(hours=4)
    h8 = now - timedelta(hours=8)
    h48 = now - timedelta(hours=48)
    h120 = now - timedelta(hours=120)

    stats = pending.aggregate(
        lt_4h=Count(
            "id",
            filter=Q(created_at__gte=h4, created_at__lte=now),
            distinct=True,
        ),
        h4_8=Count(
            "id",
            filter=Q(created_at__gte=h8, created_at__lt=h4),
            distinct=True,
        ),
        h8_48=Count(
            "id",
            filter=Q(created_at__gte=h48, created_at__lt=h8),
            distinct=True,
        ),
        h48_120=Count(
            "id",
            filter=Q(created_at__gte=h120, created_at__lt=h48),
            distinct=True,
        ),
        gt_120=Count(
            "id",
            filter=Q(created_at__lt=h120),
            distinct=True,
        ),
    )

    return [
        {"key": "lt_4h", "label": "< 4 giờ", "count": stats["lt_4h"] or 0},
        {"key": "4_8h", "label": "4–8 giờ", "count": stats["h4_8"] or 0},
        {"key": "1_2d", "label": "1–2 ngày", "count": stats["h8_48"] or 0},
        {"key": "3_5d", "label": "3–5 ngày", "count": stats["h48_120"] or 0},
        {"key": "gt_5d", "label": "> 5 ngày", "count": stats["gt_120"] or 0},
    ]


def _group_with_percent(rows, total):
    result = []

    for row in rows:
        row = dict(row)
        row["percentage"] = _percent(row.get("count") or 0, total)
        result.append(row)

    return result


def _pending_ticket_page(queryset, page, page_size):
    pending_queryset = queryset.exclude(
        current_status__status_code__in=list(
            RESOLVED_STATUS_CODES | CANCELLED_STATUS_CODES
        )
    ).select_related(*PENDING_TICKET_SELECT_RELATED).only(*PENDING_TICKET_ONLY_FIELDS)

    count = pending_queryset.count()
    total_pages = (count + page_size - 1) // page_size if count else 0
    normalized_page = min(page, total_pages) if total_pages else 1
    offset = (normalized_page - 1) * page_size

    tickets = [
        _ticket_summary(ticket)
        for ticket in pending_queryset.order_by("-created_at", "-id")[
            offset : offset + page_size
        ]
    ]

    return {
        "count": count,
        "page": normalized_page,
        "page_size": page_size,
        "total_pages": total_pages,
        "from_record": offset + 1 if count else 0,
        "to_record": min(offset + len(tickets), count),
        "results": tickets,
    }


def _ticket_summary(ticket):
    account_number = None

    if ticket.customer_account:
        account_number = getattr(ticket.customer_account, "account_number", None)

    if not account_number:
        account_number = ticket.raw_account_number

    return {
        "id": ticket.id,
        "ticket_code": ticket.ticket_code,
        "title": ticket.title,
        "created_at": ticket.created_at,
        "customer_name": ticket.customer.full_name if ticket.customer else None,
        "company_name": ticket.company.company_name if ticket.company else None,
        "display_account_number": account_number,
        "account_link_status": ticket.account_link_status,
        "status_code": ticket.current_status.status_code if ticket.current_status else None,
        "status_name": ticket.current_status.status_name if ticket.current_status else None,
        "category_name": ticket.support_category.category_name if ticket.support_category else None,
        "source_name": ticket.source.source_name if ticket.source else None,
        "handling_branch_name": ticket.handling_branch.branch_name if ticket.handling_branch else None,
        "assigned_employee_name": ticket.assigned_employee.full_name if ticket.assigned_employee else None,
        "is_error_ticket": bool(ticket.error_group_id or ticket.error_type_id),
        "error_group_name": ticket.error_group.group_name if ticket.error_group else None,
        "error_type_name": ticket.error_type.type_name if ticket.error_type else None,
    }


def _build_root_cause_breakdown(queryset, total):
    """
    Ưu tiên root cause theo tag nếu TicketTag đã có dữ liệu.
    Nếu chưa gắn tag, fallback về nhóm lỗi/loại lỗi để dashboard vẫn có số liệu.
    """
    root_causes = []

    try:
        tag_rows = queryset.filter(
            ticket_tags__tag__isnull=False,
        ).values(
            "ticket_tags__tag_id",
            "ticket_tags__tag__tag_code",
            "ticket_tags__tag__tag_name",
            "ticket_tags__tag__color",
        ).annotate(
            count=Count("id", distinct=True),
        ).order_by("-count", "ticket_tags__tag__tag_name")[:DEFAULT_TOP_LIMIT]

        root_causes = [
            {
                "root_cause_type": "TAG",
                "id": row["ticket_tags__tag_id"],
                "code": row["ticket_tags__tag__tag_code"],
                "name": row["ticket_tags__tag__tag_name"] or "Chưa đặt tên tag",
                "color": row["ticket_tags__tag__color"],
                "count": row["count"],
                "percentage": _percent(row["count"], total),
            }
            for row in tag_rows
        ]
    except Exception:
        root_causes = []

    if root_causes:
        return root_causes

    rows = queryset.values(
        "error_group_id",
        "error_group__group_code",
        "error_group__group_name",
        "error_type_id",
        "error_type__type_code",
        "error_type__type_name",
    ).annotate(
        count=Count("id"),
    ).order_by("-count", "error_group__group_name", "error_type__type_name")[:DEFAULT_TOP_LIMIT]

    return [
        {
            "root_cause_type": "ERROR_TYPE" if row["error_type_id"] else "ERROR_GROUP",
            "error_group": row["error_group_id"],
            "error_group_code": row["error_group__group_code"],
            "error_group_name": row["error_group__group_name"] or "Chưa phân nhóm",
            "error_type": row["error_type_id"],
            "error_type_code": row["error_type__type_code"],
            "error_type_name": row["error_type__type_name"] or "Chưa phân loại",
            "name": row["error_type__type_name"] or row["error_group__group_name"] or "Chưa xác định",
            "count": row["count"],
            "percentage": _percent(row["count"], total),
        }
        for row in rows
    ]


def _build_recurring_issues(queryset):
    rows = queryset.values(
        "source_id",
        "source__source_code",
        "source__source_name",
        "support_category_id",
        "support_category__category_code",
        "support_category__category_name",
        "classification_id",
        "classification__classification_code",
        "classification__classification_name",
        "error_group_id",
        "error_group__group_code",
        "error_group__group_name",
        "error_type_id",
        "error_type__type_code",
        "error_type__type_name",
    ).annotate(
        count=Count("id"),
        latest_created_at=Max("created_at"),
    ).filter(
        count__gt=1,
    ).order_by("-count", "-latest_created_at")[:DEFAULT_TOP_LIMIT]

    result = []

    for row in rows:
        problem_name = (
            row["error_type__type_name"]
            or row["error_group__group_name"]
            or row["classification__classification_name"]
            or row["support_category__category_name"]
            or "Chưa xác định vấn đề"
        )

        result.append(
            {
                "source": row["source_id"],
                "source_code": row["source__source_code"],
                "source_name": row["source__source_name"] or "Chưa có nguồn",
                "support_category": row["support_category_id"],
                "support_category_code": row["support_category__category_code"],
                "support_category_name": row["support_category__category_name"],
                "classification": row["classification_id"],
                "classification_code": row["classification__classification_code"],
                "classification_name": row["classification__classification_name"],
                "error_group": row["error_group_id"],
                "error_group_code": row["error_group__group_code"],
                "error_group_name": row["error_group__group_name"],
                "error_type": row["error_type_id"],
                "error_type_code": row["error_type__type_code"],
                "error_type_name": row["error_type__type_name"],
                "problem_name": problem_name,
                "count": row["count"],
                "latest_created_at": row["latest_created_at"],
            }
        )

    return result


def _build_audit_trail(queryset, limit):
    logs = TicketUpdateLog.objects.select_related(
        "ticket",
        "ticket__current_status",
        "ticket__customer_account",
        "from_status",
        "to_status",
        "from_branch",
        "to_branch",
        "from_unit",
        "to_unit",
        "from_employee",
        "to_employee",
        "created_by_user",
    ).filter(
        ticket_id__in=queryset.values("id"),
    ).order_by("-created_at", "-id")[:limit]

    return [
        {
            "id": log.id,
            "ticket": log.ticket_id,
            "ticket_code": log.ticket.ticket_code if log.ticket else None,
            "action_type": log.action_type,
            "from_status": log.from_status_id,
            "from_status_code": log.from_status.status_code if log.from_status else None,
            "from_status_name": log.from_status.status_name if log.from_status else None,
            "to_status": log.to_status_id,
            "to_status_code": log.to_status.status_code if log.to_status else None,
            "to_status_name": log.to_status.status_name if log.to_status else None,
            "from_employee_name": log.from_employee.full_name if log.from_employee else None,
            "to_employee_name": log.to_employee.full_name if log.to_employee else None,
            "updated_by": log.created_by_user_id,
            "updated_by_name": _display_user(log.created_by_user),
            "created_at": log.created_at,
            "note": log.note,
        }
        for log in logs
    ]


def _is_cs_unit(unit):
    if not unit:
        return True

    text = f"{getattr(unit, 'unit_code', '')} {getattr(unit, 'unit_name', '')}".lower()
    return any(keyword in text for keyword in ["cs", "cskh", "ccc", "chăm sóc", "cham soc", "tt.cskh"])


def _is_related_unit_ticket(ticket):
    return _memoized_ticket_value(
        ticket,
        "_dashboard_is_related_unit",
        lambda: bool(ticket.assigned_unit and not _is_cs_unit(ticket.assigned_unit)),
    )


def _month_bucket_template(months):
    return {
        _month_key(month): {
            "month": month.isoformat(),
            "month_key": _month_key(month),
            "month_label": _month_label(month),
            "period_label": _period_label(month),
        }
        for month in months
    }


def _month_from_ticket(ticket):
    def calculate():
        if not ticket.created_at:
            return None
        local_date = timezone.localdate(ticket.created_at)
        return date(local_date.year, local_date.month, 1)

    return _memoized_ticket_value(ticket, "_dashboard_month", calculate)


def _ticket_month_key(ticket):
    month = _month_from_ticket(ticket)
    return _month_key(month) if month else None


def build_monthly_processing_report(tickets, months):
    month_rows = _month_bucket_template(months)

    for row in month_rows.values():
        row.update(
            {
                "total": 0,
                "processed": 0,
                "cancelled": 0,
                "ekyc": 0,
                "spam": 0,
                "transferred_to_related_unit": 0,
            }
        )

    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key not in month_rows:
            continue

        row = month_rows[key]
        row["total"] += 1

        if _is_report_processed_ticket(ticket):
            row["processed"] += 1

        if _is_cancelled_ticket(ticket) or _is_spam_ticket(ticket):
            row["cancelled"] += 1

        if _is_ekyc_ticket(ticket):
            row["ekyc"] += 1

        if _is_related_unit_ticket(ticket):
            row["transferred_to_related_unit"] += 1

    return list(month_rows.values())


def _build_source_report(tickets, months):
    data = {}
    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key is None:
            continue

        source_name = ticket.source.source_name if ticket.source else "Chưa có nguồn"
        source_key = str(ticket.source_id or source_name)
        item_key = (source_key, source_name, key)
        if item_key not in data:
            month = _month_from_ticket(ticket)
            data[item_key] = {
                "source_key": source_key,
                "source_name": source_name,
                "month_key": key,
                "month_label": _month_label(month),
                "period_label": _period_label(month),
                "processed": 0,
                "cancelled": 0,
                "total": 0,
            }

        data[item_key]["total"] += 1
        if _is_report_processed_ticket(ticket):
            data[item_key]["processed"] += 1
        if _is_cancelled_ticket(ticket) or _is_spam_ticket(ticket):
            data[item_key]["cancelled"] += 1

    source_totals = defaultdict(int)
    for item in data.values():
        source_totals[item["source_key"]] += item["total"]

    top_sources = {
        source_key
        for source_key, _ in sorted(source_totals.items(), key=lambda x: x[1], reverse=True)[:8]
    }

    rows = [item for item in data.values() if item["source_key"] in top_sources]
    return sorted(rows, key=lambda x: (x["source_name"], x["month_key"]))


def _build_category_report(tickets, months):
    data = {}
    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key is None:
            continue

        category_name = ticket.support_category.category_name if ticket.support_category else "Chưa có danh mục"
        category_key = str(ticket.support_category_id or category_name)
        item_key = (category_key, category_name, key)

        if item_key not in data:
            month = _month_from_ticket(ticket)
            data[item_key] = {
                "category_key": category_key,
                "category_name": category_name,
                "month_key": key,
                "month_label": _month_label(month),
                "period_label": _period_label(month),
                "processed": 0,
                "cancelled": 0,
                "total": 0,
            }

        data[item_key]["total"] += 1
        if _is_report_processed_ticket(ticket):
            data[item_key]["processed"] += 1
        if _is_cancelled_ticket(ticket) or _is_spam_ticket(ticket):
            data[item_key]["cancelled"] += 1

    category_totals = defaultdict(int)
    for item in data.values():
        category_totals[item["category_key"]] += item["total"]

    top_categories = {
        category_key
        for category_key, _ in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    }

    rows = [item for item in data.values() if item["category_key"] in top_categories]
    return sorted(rows, key=lambda x: (x["month_key"], x["category_name"]))


def _build_unit_report(tickets, months):
    rows = _month_bucket_template(months)

    for row in rows.values():
        row.update(
            {
                "cs_processed": 0,
                "related_processed": 0,
                "cs_cancelled": 0,
                "related_cancelled": 0,
                "total_with_related_unit": 0,
            }
        )

    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key not in rows:
            continue

        is_related = _is_related_unit_ticket(ticket)

        if is_related:
            rows[key]["total_with_related_unit"] += 1

        if _is_report_processed_ticket(ticket):
            if is_related:
                rows[key]["related_processed"] += 1
            else:
                rows[key]["cs_processed"] += 1

        if _is_cancelled_ticket(ticket) or _is_spam_ticket(ticket):
            if is_related:
                rows[key]["related_cancelled"] += 1
            else:
                rows[key]["cs_cancelled"] += 1

    return list(rows.values())


def _category_name(ticket):
    return ticket.support_category.category_name if ticket.support_category else "Chưa có danh mục"


def _employee_name(ticket):
    if ticket.assigned_employee:
        return ticket.assigned_employee.full_name

    if ticket.owner_user:
        return _display_user(ticket.owner_user)

    return "Chưa giao"


def _build_time_report(current_tickets, previous_tickets):
    def aggregate(tickets, related=False):
        grouped = defaultdict(list)

        for ticket in tickets:
            if not _is_report_processed_ticket(ticket):
                continue
            if related and not _is_related_unit_ticket(ticket):
                continue
            if not related and _is_related_unit_ticket(ticket):
                continue

            grouped[_category_name(ticket)].append(_handling_days(ticket, prefer_related=related))

        return {key: _average(values) for key, values in grouped.items()}

    cs_current = aggregate(current_tickets, related=False)
    cs_previous = aggregate(previous_tickets, related=False)
    related_current = aggregate(current_tickets, related=True)
    related_previous = aggregate(previous_tickets, related=True)

    cs_categories = sorted(set(cs_current) | set(cs_previous))
    related_categories = sorted(set(related_current) | set(related_previous))

    return {
        "cs_by_category": [
            {
                "category_name": category,
                "current_avg_days": cs_current.get(category),
                "previous_avg_days": cs_previous.get(category),
            }
            for category in cs_categories
        ],
        "related_by_category": [
            {
                "category_name": category,
                "current_avg_days": related_current.get(category),
                "previous_avg_days": related_previous.get(category),
            }
            for category in related_categories
        ],
        "current_cs_avg_days": _average(list(cs_current.values())),
        "previous_cs_avg_days": _average(list(cs_previous.values())),
        "current_related_avg_days": _average(list(related_current.values())),
        "previous_related_avg_days": _average(list(related_previous.values())),
    }


def _build_sla_report(tickets, months):
    rows = _month_bucket_template(months)

    for row in rows.values():
        row.update(
            {
                "total_sla": 0,
                "on_time": 0,
                "overdue": 0,
                "processing": 0,
                "related_unit_overdue": 0,
            }
        )

    overdue_by_category = defaultdict(lambda: {"category_name": "", "not_overdue": 0, "overdue": 0})
    overdue_task_by_unit_month = defaultdict(
        lambda: {"month_key": "", "month_label": "", "period_label": "", "unit_name": "", "overdue": 0}
    )

    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key not in rows:
            continue

        tracking = getattr(ticket, "sla_tracking", None)
        if not tracking:
            continue

        status = (tracking.sla_status or "").upper()
        rows[key]["total_sla"] += 1

        if status == SlaStatus.ON_TIME:
            rows[key]["on_time"] += 1
        elif status == SlaStatus.OVERDUE:
            rows[key]["overdue"] += 1
            if _is_related_unit_ticket(ticket):
                rows[key]["related_unit_overdue"] += 1
        else:
            rows[key]["processing"] += 1

        category_name = _category_name(ticket)
        overdue_by_category[category_name]["category_name"] = category_name

        if status == SlaStatus.OVERDUE:
            overdue_by_category[category_name]["overdue"] += 1
        else:
            overdue_by_category[category_name]["not_overdue"] += 1

        if status == SlaStatus.OVERDUE and ticket.assigned_unit:
            unit_name = ticket.assigned_unit.unit_name
            item_key = (key, unit_name)
            overdue_task_by_unit_month[item_key].update(
                {
                    "month_key": key,
                    "month_label": rows[key]["month_label"],
                    "period_label": rows[key]["period_label"],
                    "unit_name": unit_name,
                }
            )
            overdue_task_by_unit_month[item_key]["overdue"] += 1

    return {
        "monthly": list(rows.values()),
        "overdue_by_category": sorted(overdue_by_category.values(), key=lambda x: x["category_name"]),
        "overdue_by_unit_month": sorted(
            overdue_task_by_unit_month.values(),
            key=lambda x: (x["month_key"], x["unit_name"]),
        ),
    }


def _build_employee_report(tickets):
    grouped = {}

    for ticket in tickets:
        key = _ticket_month_key(ticket)
        if key is None:
            continue

        month = _month_from_ticket(ticket)
        employee = _employee_name(ticket)
        item_key = (employee, key)

        if item_key not in grouped:
            grouped[item_key] = {
                "employee_name": employee,
                "month_key": key,
                "month_label": _month_label(month),
                "period_label": _period_label(month),
                "total": 0,
                "processed": 0,
                "related_processed": 0,
                "cancelled": 0,
                "ekyc": 0,
                "avg_cs_days_values": [],
                "avg_related_days_values": [],
            }

        row = grouped[item_key]
        row["total"] += 1

        if _is_report_processed_ticket(ticket):
            if _is_related_unit_ticket(ticket):
                row["related_processed"] += 1
                days = _handling_days(ticket, prefer_related=True)
                if days is not None:
                    row["avg_related_days_values"].append(days)
            else:
                row["processed"] += 1
                days = _handling_days(ticket, prefer_related=False)
                if days is not None:
                    row["avg_cs_days_values"].append(days)

        if _is_cancelled_ticket(ticket) or _is_spam_ticket(ticket):
            row["cancelled"] += 1

        if _is_ekyc_ticket(ticket):
            row["ekyc"] += 1

    result = []

    for row in grouped.values():
        result.append(
            {
                "employee_name": row["employee_name"],
                "month_key": row["month_key"],
                "month_label": row["month_label"],
                "period_label": row["period_label"],
                "total": row["total"],
                "processed": row["processed"],
                "related_processed": row["related_processed"],
                "cancelled": row["cancelled"],
                "ekyc": row["ekyc"],
                "avg_cs_days": _average(row["avg_cs_days_values"]),
                "avg_related_days": _average(row["avg_related_days_values"]),
            }
        )

    return sorted(result, key=lambda x: (x["month_key"], x["total"]), reverse=True)


class TicketCccDashboardPendingTicketsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset, date_from, date_to = _base_ticket_queryset(request)
        refresh = is_dashboard_refresh_requested(request.query_params)
        cache_key = build_ticket_dashboard_cache_key(
            request.user,
            request.query_params,
            scope_fingerprint=build_queryset_scope_fingerprint(queryset),
            section="pending-page",
        )

        if not refresh:
            cached_payload = get_ticket_dashboard_cache(cache_key)
            if cached_payload is not None:
                return Response(cached_payload)

        page = _safe_page(request.query_params.get("page"))
        page_size = _safe_pending_page_size(
            request.query_params.get("page_size")
        )

        payload = _pending_ticket_page(queryset, page, page_size)
        payload["date_from"] = date_from.isoformat()
        payload["date_to"] = date_to.isoformat()
        payload["generated_at"] = timezone.now()

        set_ticket_dashboard_cache(cache_key, payload)
        return Response(payload)


class TicketCccDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset, date_from, date_to = _base_ticket_queryset(request)
        sections = _requested_sections(request.query_params)
        refresh = is_dashboard_refresh_requested(request.query_params)
        cache_key = build_ticket_dashboard_cache_key(
            request.user,
            request.query_params,
            scope_fingerprint=build_queryset_scope_fingerprint(queryset),
            section=",".join(sorted(sections)),
        )

        if not refresh:
            cached_payload = get_ticket_dashboard_cache(cache_key)
            if cached_payload is not None:
                return Response(cached_payload)

        now = timezone.now()
        recent_limit = _safe_limit(
            request.query_params.get("recent_limit"),
            DEFAULT_RECENT_LIMIT,
            MAX_RECENT_LIMIT,
        )

        needs_counts = _has_any_section(
            sections,
            {"overview", "distributions", "root_cause"},
        )
        counts = _overview_counts(queryset, now) if needs_counts else {}
        total_tickets = counts.get("total") or 0
        resolved_tickets = counts.get("resolved") or 0
        cancelled_tickets = counts.get("cancelled") or 0
        pending_processing = counts.get("pending") or 0
        linked_tickets = counts.get("linked") or 0
        unlinked_tickets = counts.get("unlinked") or 0
        error_tickets = counts.get("error") or 0
        overdue_sla = counts.get("overdue_sla") or 0

        filters_payload = {
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "period": request.query_params.get("period"),
            "status": request.query_params.get("status")
            or request.query_params.get("current_status"),
            "category": request.query_params.get("category")
            or request.query_params.get("support_category"),
            "source": request.query_params.get("source"),
            "vip_tier": request.query_params.get("vip_tier")
            or request.query_params.get("membership_tier"),
            "account_link_status": request.query_params.get(
                "account_link_status"
            ),
            "q": request.query_params.get("q"),
        }

        overview = {}
        previous_period = None
        report_payload = {}
        charts = {}
        tables = {}
        my_ticket_tabs = {}

        if "overview" in sections:
            resolution_metrics = _resolution_metrics(queryset)
            sla = _sla_stats(queryset)
            csat = _csat_stats(queryset)
            previous_period = _previous_period_overview(
                request,
                date_from,
                date_to,
            )

            overview = {
                "total_tickets": total_tickets,
                "resolved_tickets": resolved_tickets,
                "pending_processing": pending_processing,
                "cancelled_tickets": cancelled_tickets,
                "linked_tickets": linked_tickets,
                "unlinked_tickets": unlinked_tickets,
                "error_tickets": error_tickets,
                "recurring_issue_count": 0,
                "overdue_sla": overdue_sla,
                "average_resolution_minutes": resolution_metrics["average"],
                "resolution_median_minutes": resolution_metrics["median"],
                "resolution_p75_minutes": resolution_metrics["p75"],
                "resolution_p90_minutes": resolution_metrics["p90"],
                "linked_percentage": _percent(linked_tickets, total_tickets),
                "unlinked_percentage": _percent(unlinked_tickets, total_tickets),
                "resolved_percentage": _percent(resolved_tickets, total_tickets),
                "cancelled_percentage": _percent(cancelled_tickets, total_tickets),
                "sla": sla,
                "csat": csat,
                # Report totals are populated below only when a report section
                # is requested. This keeps sections=overview lightweight.
                "report_total_tickets": None,
                "report_processed_tickets": None,
                "report_cancelled_tickets": None,
                "report_transferred_tickets": None,
                "report_ekyc_tickets": None,
            }
            my_ticket_tabs = {
                "all": total_tickets,
                "linked": linked_tickets,
                "unlinked": unlinked_tickets,
            }

        if "distributions" in sections:
            charts["tickets_by_category"] = _group_with_percent(
                queryset.values(
                    "support_category_id",
                    "support_category__category_code",
                    "support_category__category_name",
                )
                .annotate(count=Count("id"))
                .order_by("-count", "support_category__category_name"),
                total_tickets,
            )
            charts["tickets_by_source"] = _group_with_percent(
                queryset.values(
                    "source_id",
                    "source__source_code",
                    "source__source_name",
                )
                .annotate(count=Count("id"))
                .order_by("-count", "source__source_name"),
                total_tickets,
            )
            charts["tickets_by_status"] = _group_with_percent(
                queryset.values(
                    "current_status_id",
                    "current_status__status_code",
                    "current_status__status_name",
                    "current_status__sort_order",
                )
                .annotate(count=Count("id"))
                .order_by(
                    "current_status__sort_order",
                    "current_status__status_name",
                ),
                total_tickets,
            )
            charts["tickets_by_branch"] = _group_with_percent(
                queryset.values(
                    "handling_branch_id",
                    "handling_branch__branch_code",
                    "handling_branch__branch_name",
                )
                .annotate(count=Count("id"))
                .order_by("-count", "handling_branch__branch_name"),
                total_tickets,
            )
            charts["linked_vs_unlinked"] = [
                {
                    "key": TicketAccountLinkStatus.LINKED,
                    "label": "Có TK liên kết",
                    "count": linked_tickets,
                    "percentage": _percent(linked_tickets, total_tickets),
                },
                {
                    "key": TicketAccountLinkStatus.UNLINKED,
                    "label": "Chưa có TK liên kết",
                    "count": unlinked_tickets,
                    "percentage": _percent(unlinked_tickets, total_tickets),
                },
            ]

        if "trend" in sections:
            charts["trend_by_day"] = list(
                queryset.annotate(day=TruncDate("created_at"))
                .values("day")
                .annotate(count=Count("id"))
                .order_by("day")
            )

        if "root_cause" in sections:
            charts["root_cause_breakdown"] = _build_root_cause_breakdown(
                queryset,
                total_tickets,
            )

        if "ageing" in sections:
            charts["ageing_backlog"] = _ageing_backlog(queryset)

        if "pending" in sections:
            pending_queryset = queryset.exclude(
                current_status__status_code__in=list(
                    RESOLVED_STATUS_CODES | CANCELLED_STATUS_CODES
                )
            ).select_related(*PENDING_TICKET_SELECT_RELATED).only(
                *PENDING_TICKET_ONLY_FIELDS
            )
            tables["pending_tickets"] = [
                _ticket_summary(ticket)
                for ticket in pending_queryset.order_by("-created_at", "-id")[
                    :recent_limit
                ]
            ]

        requested_report_sections = sections & REPORT_SECTION_NAMES
        if requested_report_sections:
            max_report_months = _max_report_months()
            all_requested_months = _selected_report_months(date_from, date_to)
            report_months = _selected_report_months(
                date_from,
                date_to,
                max_months=max_report_months,
            )
            report_from = report_months[0]
            report_to = _month_end(report_months[-1])
            report_truncated = len(all_requested_months) > len(report_months)

            report_queryset = _ticket_queryset_for_range(
                request,
                report_from,
                report_to,
            ).select_related(*REPORT_TICKET_SELECT_RELATED).only(
                *REPORT_TICKET_ONLY_FIELDS
            )
            # iterator() prevents Django from keeping a second internal result
            # cache in addition to the list required by the report builders.
            report_tickets = list(
                report_queryset.iterator(chunk_size=2000)
            )

            current_month_start = _month_start(date_to)
            previous_month_start = _add_months(current_month_start, -1)
            current_month_tickets = []
            previous_month_tickets = []
            for ticket in report_tickets:
                ticket_month = _month_from_ticket(ticket)
                if ticket_month == current_month_start:
                    current_month_tickets.append(ticket)
                elif ticket_month == previous_month_start:
                    previous_month_tickets.append(ticket)

            report_monthly_processing = None
            report_total = None
            report_processed = None
            report_cancelled = None
            report_transferred = None
            report_ekyc = None

            if _has_any_section(
                requested_report_sections,
                {"report_monthly", "report_summary"},
            ):
                report_monthly_processing = build_monthly_processing_report(
                    report_tickets,
                    report_months,
                )
                if "report_monthly" in requested_report_sections:
                    charts["report_monthly_processing"] = (
                        report_monthly_processing
                    )

                report_total = sum(
                    item["total"] for item in report_monthly_processing
                )
                report_processed = sum(
                    item["processed"] for item in report_monthly_processing
                )
                report_cancelled = sum(
                    item["cancelled"] for item in report_monthly_processing
                )
                report_transferred = sum(
                    item["transferred_to_related_unit"]
                    for item in report_monthly_processing
                )
                report_ekyc = sum(
                    item["ekyc"] for item in report_monthly_processing
                )

            if "report_source" in requested_report_sections:
                charts["report_source"] = _build_source_report(
                    report_tickets,
                    report_months,
                )
            if "report_category" in requested_report_sections:
                charts["report_category"] = _build_category_report(
                    report_tickets,
                    report_months,
                )
            if "report_unit" in requested_report_sections:
                charts["report_unit"] = _build_unit_report(
                    report_tickets,
                    report_months,
                )
            if "report_time" in requested_report_sections:
                charts["report_time"] = _build_time_report(
                    current_month_tickets,
                    previous_month_tickets,
                )
            if "report_sla" in requested_report_sections:
                charts["report_sla"] = _build_sla_report(
                    report_tickets,
                    report_months,
                )
            if "report_employee" in requested_report_sections:
                charts["report_employee"] = _build_employee_report(
                    report_tickets
                )

            report_payload = {
                "cutoff_date": date_to.isoformat(),
                "range_from": report_from.isoformat(),
                "range_to": report_to.isoformat(),
                "requested_range_from": _month_start(date_from).isoformat(),
                "requested_range_to": _month_end(
                    _month_start(date_to)
                ).isoformat(),
                "range_truncated": report_truncated,
                "max_months": max_report_months,
                "month_count": len(report_months),
                "months": [
                    {
                        "month": month.isoformat(),
                        "month_key": _month_key(month),
                        "month_label": _month_label(month),
                        "period_label": _period_label(month),
                    }
                    for month in report_months
                ],
                "remark": {
                    "total_tickets": report_total,
                    "processed_tickets": report_processed,
                    "cancelled_tickets": report_cancelled,
                    "transferred_tickets": report_transferred,
                    "ekyc_tickets": report_ekyc,
                    "cutoff_date": date_to.isoformat(),
                    "note_processed": "Trừ các ticket gọi khảo sát eKYC/spam.",
                    "note_cancelled": "Bao gồm ticket spam / đã hủy.",
                },
            }

            if overview and report_total is not None:
                overview.update(
                    {
                        "report_total_tickets": report_total,
                        "report_processed_tickets": report_processed,
                        "report_cancelled_tickets": report_cancelled,
                        "report_transferred_tickets": report_transferred,
                        "report_ekyc_tickets": report_ekyc,
                    }
                )

        payload = {
            "filters": filters_payload,
            "loaded_sections": sorted(sections),
            "overview": overview,
            "previous_period": previous_period,
            "report": report_payload,
            "charts": charts,
            "tables": tables,
            "my_ticket_tabs": my_ticket_tabs,
            "generated_at": timezone.now(),
        }

        set_ticket_dashboard_cache(cache_key, payload)
        return Response(payload)
