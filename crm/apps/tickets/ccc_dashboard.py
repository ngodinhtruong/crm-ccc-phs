import calendar
from datetime import date

from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.scopes import filter_tickets_by_user
from apps.common.constants import SlaStatus, TicketStatusCode
from apps.tickets.models import (
    Ticket,
    TicketAccountLinkStatus,
    TicketUpdateLog,
)


DEFAULT_RECENT_LIMIT = 10
DEFAULT_TOP_LIMIT = 10


def _safe_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _percent(value, total):
    if not total:
        return 0

    return round((value / total) * 100, 2)


def _display_user(user):
    if not user:
        return None

    full_name = user.get_full_name()
    return full_name or user.username or user.email


def _date_range_from_params(params):
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
        try:
            year_text, month_text = str(period).split("-", 1)
            year = int(year_text)
            month = int(month_text)
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])
        except (TypeError, ValueError):
            pass

    date_from = (
        params.get("date_from")
        or params.get("created_from")
        or params.get("from")
    )
    date_to = (
        params.get("date_to")
        or params.get("created_to")
        or params.get("to")
    )

    parsed_from = parse_date(date_from) if date_from else None
    parsed_to = parse_date(date_to) if date_to else None

    if parsed_from:
        start_date = parsed_from

    if parsed_to:
        end_date = parsed_to

    return start_date, end_date


def _base_ticket_queryset(request):
    params = request.query_params
    date_from, date_to = _date_range_from_params(params)

    queryset = Ticket.objects.select_related(
        "customer",
        "company",
        "customer_account",
        "handling_branch",
        "assigned_unit",
        "assigned_employee",
        "owner_user",
        "support_category",
        "classification",
        "current_status",
        "priority",
        "source",
        "sla_policy",
        "error_group",
        "error_type",
    ).all()

    queryset = filter_tickets_by_user(queryset, request.user)
    queryset = queryset.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)

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

    return queryset.distinct(), date_from, date_to


def _duration_minutes(ticket):
    end_at = ticket.closed_at or ticket.done_at

    if not ticket.created_at or not end_at:
        return None

    return int((end_at - ticket.created_at).total_seconds() // 60)


def _average_resolution_minutes(queryset):
    values = []

    for ticket in queryset.filter(
        Q(current_status__status_code=TicketStatusCode.CLOSED)
        | Q(closed_at__isnull=False)
    ):
        duration = _duration_minutes(ticket)

        if duration is not None:
            values.append(duration)

    if not values:
        return None

    return round(sum(values) / len(values), 2)


def _group_with_percent(rows, total):
    result = []

    for row in rows:
        row = dict(row)
        row["percentage"] = _percent(row.get("count") or 0, total)
        result.append(row)

    return result


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


class TicketCccDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset, date_from, date_to = _base_ticket_queryset(request)
        total_tickets = queryset.count()
        now = timezone.now()
        recent_limit = _safe_int(request.query_params.get("recent_limit"), DEFAULT_RECENT_LIMIT)

        resolved_tickets = queryset.filter(
            Q(current_status__status_code=TicketStatusCode.CLOSED)
            | Q(closed_at__isnull=False)
        ).distinct().count()

        cancelled_tickets = queryset.filter(
            Q(current_status__status_code=TicketStatusCode.CANCELLED)
            | Q(cancelled_at__isnull=False)
        ).distinct().count()

        pending_processing = queryset.exclude(
            current_status__status_code__in=[
                TicketStatusCode.CLOSED,
                TicketStatusCode.CANCELLED,
            ]
        ).count()

        linked_tickets = queryset.filter(
            account_link_status=TicketAccountLinkStatus.LINKED,
        ).count()
        unlinked_tickets = queryset.filter(
            account_link_status=TicketAccountLinkStatus.UNLINKED,
        ).count()

        error_tickets = queryset.filter(
            Q(error_group__isnull=False) | Q(error_type__isnull=False),
        ).count()

        overdue_sla = queryset.filter(
            Q(sla_tracking__sla_status=SlaStatus.OVERDUE)
            | Q(
                sla_tracking__resolution_due_at__lt=now,
                closed_at__isnull=True,
                current_status__status_code__in=[
                    TicketStatusCode.CREATED,
                    TicketStatusCode.ACCEPTED,
                    TicketStatusCode.PROCESSING,
                    TicketStatusCode.DONE_WAIT_CLOSE,
                ],
            )
        ).distinct().count()

        average_resolution_minutes = _average_resolution_minutes(queryset)

        tickets_by_category = _group_with_percent(
            queryset.values(
                "support_category_id",
                "support_category__category_code",
                "support_category__category_name",
            ).annotate(
                count=Count("id"),
            ).order_by("-count", "support_category__category_name"),
            total_tickets,
        )

        tickets_by_source = _group_with_percent(
            queryset.values(
                "source_id",
                "source__source_code",
                "source__source_name",
            ).annotate(
                count=Count("id"),
            ).order_by("-count", "source__source_name"),
            total_tickets,
        )

        tickets_by_status = _group_with_percent(
            queryset.values(
                "current_status_id",
                "current_status__status_code",
                "current_status__status_name",
                "current_status__sort_order",
            ).annotate(
                count=Count("id"),
            ).order_by("current_status__sort_order", "current_status__status_name"),
            total_tickets,
        )

        tickets_by_branch = _group_with_percent(
            queryset.values(
                "handling_branch_id",
                "handling_branch__branch_code",
                "handling_branch__branch_name",
            ).annotate(
                count=Count("id"),
            ).order_by("-count", "handling_branch__branch_name"),
            total_tickets,
        )

        linked_vs_unlinked = [
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

        trend_by_day = list(
            queryset.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        recurring_issues = _build_recurring_issues(queryset)
        root_cause_breakdown = _build_root_cause_breakdown(queryset, total_tickets)
        audit_trail = _build_audit_trail(queryset, recent_limit)

        recent_tickets = [
            _ticket_summary(ticket)
            for ticket in queryset.order_by("-created_at", "-id")[:recent_limit]
        ]

        payload = {
            "filters": {
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "period": request.query_params.get("period"),
                "status": request.query_params.get("status") or request.query_params.get("current_status"),
                "category": request.query_params.get("category") or request.query_params.get("support_category"),
                "source": request.query_params.get("source"),
                "vip_tier": request.query_params.get("vip_tier") or request.query_params.get("membership_tier"),
                "account_link_status": request.query_params.get("account_link_status"),
                "q": request.query_params.get("q"),
            },
            "overview": {
                "total_tickets": total_tickets,
                "resolved_tickets": resolved_tickets,
                "pending_processing": pending_processing,
                "cancelled_tickets": cancelled_tickets,
                "linked_tickets": linked_tickets,
                "unlinked_tickets": unlinked_tickets,
                "error_tickets": error_tickets,
                "recurring_issue_count": sum(item["count"] for item in recurring_issues),
                "overdue_sla": overdue_sla,
                "average_resolution_minutes": average_resolution_minutes,
                "linked_percentage": _percent(linked_tickets, total_tickets),
                "unlinked_percentage": _percent(unlinked_tickets, total_tickets),
                "resolved_percentage": _percent(resolved_tickets, total_tickets),
            },
            "charts": {
                "tickets_by_category": tickets_by_category,
                "tickets_by_source": tickets_by_source,
                "tickets_by_status": tickets_by_status,
                "tickets_by_branch": tickets_by_branch,
                "linked_vs_unlinked": linked_vs_unlinked,
                "trend_by_day": trend_by_day,
                "root_cause_breakdown": root_cause_breakdown,
            },
            "tables": {
                "recurring_issues": recurring_issues,
                "audit_trail": audit_trail,
                "recent_tickets": recent_tickets,
            },
            "my_ticket_tabs": {
                "all": total_tickets,
                "linked": linked_tickets,
                "unlinked": unlinked_tickets,
            },
            "generated_at": timezone.now(),
        }

        return Response(payload)
