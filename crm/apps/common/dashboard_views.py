from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count, Exists, OuterRef, Q, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Permission, Role
from apps.accounts.scopes import (
    filter_branches_by_user,
    filter_customers_by_user,
    filter_employees_by_user,
    filter_sa_records_by_user,
    filter_tickets_by_user,
)
from apps.accounts.services import PermissionService
from apps.branches.models import Branch, Employee, OrganizationUnit
from apps.customers.models import Customer
from apps.sla.models import SlaPolicy
from apps.tickets.models import (
    Ticket,
    TicketClassification,
    TicketPriority,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)


from apps.common.constants import MATCHED_ORDER_STATUSES

User = get_user_model()


def is_system_manager(user):
    if user.is_superuser:
        return True

    role_codes = set(PermissionService.get_user_role_codes(user))
    return bool(role_codes & {"CS_MANAGER", "BOM"})


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        can_manage_system = is_system_manager(user)

        tickets_qs = filter_tickets_by_user(Ticket.objects.all(), user)
        customers_qs = filter_customers_by_user(Customer.objects.all(), user)
        branches_qs = filter_branches_by_user(Branch.objects.all(), user)
        employees_qs = filter_employees_by_user(Employee.objects.all(), user)

        users_count = User.objects.count() if can_manage_system else 1
        roles_count = Role.objects.count() if can_manage_system else len(
            PermissionService.get_user_roles(user)
        )

        permissions_count = Permission.objects.filter(is_active=True).count()

        modules_count = (
            Permission.objects.filter(is_active=True)
            .exclude(module_code__isnull=True)
            .exclude(module_code="")
            .values("module_code")
            .distinct()
            .count()
        )

        workflow_count = SlaPolicy.objects.filter(is_active=True).count()

        dropdown_values_count = (
            TicketStatus.objects.filter(is_active=True).count()
            + TicketPriority.objects.filter(is_active=True).count()
            + TicketSource.objects.filter(is_active=True).count()
            + TicketSupportCategory.objects.filter(is_active=True).count()
            + TicketClassification.objects.filter(is_active=True).count()
        )

        ticket_status_summary = list(
            tickets_qs.values(
                "current_status__status_code",
                "current_status__status_name",
            )
            .annotate(count=Count("id"))
            .order_by("current_status__sort_order")
        )

        overview = [
            {
                "key": "users",
                "label": "Người dùng",
                "value": users_count,
                "href": "/accounts/users",
            },
            {
                "key": "workflows",
                "label": "Workflows",
                "value": workflow_count,
                "href": "/sla",
            },
            {
                "key": "modules",
                "label": "Modules",
                "value": modules_count,
                "href": "/settings/dropdown-values",
            },
        ]

        quick_settings = [
            {
                "key": "users",
                "title": "Người dùng",
                "description": "Quản lý người truy cập",
                "href": "/accounts/users",
                "value": users_count,
                "icon": "users",
            },
            {
                "key": "branches",
                "title": "Chi nhánh",
                "description": "Quản lý chi nhánh xử lý",
                "href": "/master-data/branches",
                "value": branches_qs.count(),
                "icon": "branch",
            },
            {
                "key": "employees",
                "title": "Nhân viên",
                "description": "Quản lý nhân viên theo chi nhánh",
                "href": "/master-data/employees",
                "value": employees_qs.count(),
                "icon": "employee",
            },
            {
                "key": "customers",
                "title": "Khách hàng",
                "description": "Quản lý khách hàng",
                "href": "/customers",
                "value": customers_qs.count(),
                "icon": "customer",
            },
            {
                "key": "tickets",
                "title": "Ticket",
                "description": "Quản lý ticket chăm sóc khách hàng",
                "href": "/tickets",
                "value": tickets_qs.count(),
                "icon": "ticket",
            },
            {
                "key": "sla",
                "title": "SLA",
                "description": "Quản lý chính sách SLA",
                "href": "/sla",
                "value": workflow_count,
                "icon": "sla",
            },
            {
                "key": "roles",
                "title": "Roles",
                "description": "Quản lý nhóm quyền",
                "href": "/accounts/roles",
                "value": roles_count,
                "icon": "role",
            },
            {
                "key": "permissions",
                "title": "Permissions",
                "description": "Quản lý quyền hệ thống",
                "href": "/accounts/permissions",
                "value": permissions_count,
                "icon": "permission",
            },
            {
                "key": "organization_units",
                "title": "Phòng ban xử lý",
                "description": "Quản lý đơn vị xử lý ticket",
                "href": "/master-data/processing-units",
                "value": OrganizationUnit.objects.filter(is_active=True).count(),
                "icon": "unit",
            },
            {
                "key": "dropdown_values",
                "title": "Giá trị trường Dropdown",
                "description": "Quản lý giá trị dropdown trong các module",
                "href": "/settings/dropdown-values",
                "value": dropdown_values_count,
                "icon": "dropdown",
            },
        ]

        return Response(
            {
                "overview": overview,
                "quick_settings": quick_settings,
                "ticket_status_summary": ticket_status_summary,
            }
        )
    
class HomeDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        tickets_qs = filter_tickets_by_user(
            Ticket.objects.select_related(
                "customer",
                "company",
                "customer_account",
                "handling_branch",
                "support_category",
                "classification",
                "current_status",
                "source",
            ).all(),
            user,
        )

        # Ticket mới chưa xử lý: ưu tiên CREATED
        new_tickets_qs = tickets_qs.filter(
            current_status__status_code="CREATED"
        ).order_by("-created_at")[:10]

        latest_tickets = [
            {
                "id": ticket.id,
                "ticket_code": ticket.ticket_code,
                "branch_name": ticket.handling_branch.branch_name
                if ticket.handling_branch
                else "",
                "classification_name": ticket.classification.classification_name
                if ticket.classification
                else "Khác",
                "company_name": ticket.company.company_name
                if ticket.company
                else "",
                "status_name": ticket.current_status.status_name
                if ticket.current_status
                else "",
                "description": ticket.request_content or ticket.title or "",
                "source_name": ticket.source.source_name if ticket.source else "",
            }
            for ticket in new_tickets_qs
        ]

        source_summary = list(
            tickets_qs.values("source__source_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )

        category_summary = list(
            tickets_qs.values("support_category__category_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:14]
        )

        total_tickets = tickets_qs.count()

        with_account = tickets_qs.filter(customer_account__isnull=False).count()
        without_account = total_tickets - with_account

        return Response(
            {
                "latest_tickets": latest_tickets,
                "source_summary": [
                    {
                        "label": item["source__source_name"] or "Không rõ",
                        "count": item["count"],
                    }
                    for item in source_summary
                ],
                "category_summary": [
                    {
                        "label": item["support_category__category_name"] or "Khác",
                        "count": item["count"],
                    }
                    for item in category_summary
                ],
                "customer_type_summary": [
                    {
                        "label": "KH có tài khoản",
                        "count": with_account,
                    },
                    {
                        "label": "KH không có tài khoản",
                        "count": without_account,
                    },
                ],
                "total_tickets": total_tickets,
            }
        )


def _get_model_field(model_class, field_name):
    try:
        return model_class._meta.get_field(field_name)
    except Exception:
        return None


def _has_model_field(model_class, field_name):
    return _get_model_field(model_class, field_name) is not None


def _first_existing_field(model_class, candidates):
    for field_name in candidates:
        if _has_model_field(model_class, field_name):
            return field_name

    return None


def _apply_date_range(queryset, field_name, date_from=None, date_to=None):
    if not field_name:
        return queryset

    model_field = _get_model_field(queryset.model, field_name)

    if not model_field:
        return queryset

    lookup_field = f"{field_name}__date" if isinstance(model_field, models.DateTimeField) else field_name

    if date_from:
        queryset = queryset.filter(**{f"{lookup_field}__gte": date_from})

    if date_to:
        queryset = queryset.filter(**{f"{lookup_field}__lte": date_to})

    return queryset


def _chart_from_queryset(queryset, label_path, empty_label="Không rõ", limit=None):
    rows = (
        queryset.values(label_path)
        .annotate(value=Count("id"))
        .order_by("-value", label_path)
    )

    if limit:
        rows = rows[:limit]

    return [
        {
            "name": item.get(label_path) or empty_label,
            "value": item["value"],
        }
        for item in rows
    ]


def _sum_field(queryset, field_name):
    if not field_name:
        return 0

    return queryset.aggregate(total=Sum(field_name))["total"] or 0


def _transaction_account_values(transactions_qs):
    return transactions_qs.exclude(customer_account__isnull=True).values_list(
        "customer_account__account_number",
        flat=True,
    )


def _filter_transactions_by_branch(transactions_qs, branch_id):
    if not branch_id:
        return transactions_qs

    return transactions_qs.filter(
        customer_account__customer__branch_id=branch_id
    )


def _filter_valid_matched_transactions(transactions_qs, transaction_model):
    status_field = _first_existing_field(
        transaction_model,
        ["order_status", "status", "transaction_status"],
    )

    if not status_field:
        return transactions_qs

    cancelled_query = (
        Q(**{f"{status_field}__iexact": "CANCELLED"})
        | Q(**{f"{status_field}__iexact": "CANCELED"})
        | Q(**{f"{status_field}__iexact": "REJECTED"})
        | Q(**{f"{status_field}__icontains": "HUY"})
        | Q(**{f"{status_field}__icontains": "HỦY"})
        | Q(**{f"{status_field}__icontains": "CANCEL"})
        | Q(**{f"{status_field}__icontains": "REJECT"})
    )

    return transactions_qs.exclude(cancelled_query)


def _direct_field_chart(queryset, model_class, candidates, empty_label="Không rõ", limit=None):
    field_name = _first_existing_field(model_class, candidates)

    if not field_name:
        return []

    return _chart_from_queryset(queryset, field_name, empty_label, limit=limit)


class GeneralDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = request.query_params.get("branch") or None
        date_from = request.query_params.get("date_from") or None
        date_to = request.query_params.get("date_to") or None

        if branch and branch.lower() == "all":
            branch = None

        from apps.branches.models import Branch
        from apps.customers.models import Customer
        from apps.tickets.models import Ticket
        from apps.sale_admin.models import SaRecord

        from apps.kpis.models import TransactionLog

        scoped_customers_qs = filter_customers_by_user(Customer.objects.all(), request.user)
        tickets_qs = filter_tickets_by_user(Ticket.objects.all(), request.user)
        records_qs = filter_sa_records_by_user(SaRecord.objects.all(), request.user)

        if branch:
            scoped_customers_qs = scoped_customers_qs.filter(branch_id=branch)
            tickets_qs = tickets_qs.filter(handling_branch_id=branch)
            records_qs = records_qs.filter(branch_id=branch)

        customers_qs = _apply_date_range(scoped_customers_qs, "created_at", date_from, date_to)
        tickets_qs = _apply_date_range(tickets_qs, "created_at", date_from, date_to)
        records_qs = _apply_date_range(records_qs, "call_date", date_from, date_to)

        transactions_qs = TransactionLog.objects.filter(
            customer_account__customer_id__in=scoped_customers_qs.values("id")
        )
        transactions_qs = _filter_transactions_by_branch(
            transactions_qs,
            branch,
        )

        transaction_date_field = _first_existing_field(
            TransactionLog,
            ["transaction_date", "trading_date", "order_date", "matched_at", "created_at"],
        )
        transactions_qs = _apply_date_range(
            transactions_qs,
            transaction_date_field,
            date_from,
            date_to,
        )

        total_customers = customers_qs.count()
        total_tickets = tickets_qs.count()
        unlinked_tickets = tickets_qs.filter(customer_account__isnull=True).count()

        total_transactions = transactions_qs.count()

        active_customer_ids = transactions_qs.exclude(
            customer_account__isnull=True
        ).values_list(
            "customer_account__customer_id",
            flat=True,
        )

        active_customers = customers_qs.filter(
            id__in=active_customer_ids
        ).distinct().count()

        fee_field = _first_existing_field(
            TransactionLog,
            ["transaction_fee", "fee", "matched_fee", "commission_fee"],
        )
        value_field = _first_existing_field(
            TransactionLog,
            ["transaction_value", "matched_value", "value", "amount"],
        )

        valid_transactions_qs = _filter_valid_matched_transactions(
            transactions_qs, TransactionLog
        )
        total_fees = _sum_field(valid_transactions_qs, fee_field)
        matched_value_sum = _sum_field(valid_transactions_qs, value_field)

        grouped_customers_count = customers_qs.filter(
            sa_records__icp_group__isnull=False
        ).distinct().count()
        icp_score = round((grouped_customers_count / total_customers * 100), 1) if total_customers else 0

        avg_ltv = round(float(total_fees) / active_customers, 2) if active_customers else 0

        reactivated_records_qs = records_qs.filter(
            reactivation=True,
            customer_account__isnull=False,
        )

        matched_after_call = transactions_qs.filter(
            customer_account_id=OuterRef("customer_account_id"),
            transaction_date__gte=OuterRef("call_date"),
            order_status__in=MATCHED_ORDER_STATUSES,
        )

        reactivated_records_qs = reactivated_records_qs.annotate(
            has_matched_after_call=Exists(matched_after_call)
        )

        total_reactivated_records = reactivated_records_qs.values(
            "customer_account_id"
        ).distinct().count()
        reactivated_with_trades = reactivated_records_qs.filter(
            has_matched_after_call=True
        ).values(
            "customer_account_id"
        ).distinct().count()

        aar_score = (
            round((reactivated_with_trades / total_reactivated_records * 100), 1)
            if total_reactivated_records
            else 0
        )

        churn_count = max(total_customers - active_customers, 0)
        churn_rate = round((churn_count / total_customers * 100), 1) if total_customers else 0

        referral_count = customers_qs.filter(source__source_code__iexact="REFERRAL").count()
        referral_rate = round((referral_count / total_customers * 100), 1) if total_customers else 0

        product_type_dist = _direct_field_chart(
            transactions_qs,
            TransactionLog,
            ["product_code", "product_type", "product_name", "product"],
            "Khác",
            limit=12,
        )
        channel_dist = _direct_field_chart(
            transactions_qs,
            TransactionLog,
            ["source_system", "channel", "source"],
            "Không rõ",
            limit=12,
        )
        order_status_dist = _direct_field_chart(
            transactions_qs,
            TransactionLog,
            ["order_status", "status", "transaction_status"],
            "Không rõ",
            limit=12,
        )
        top_tickers_dist = _direct_field_chart(
            transactions_qs,
            TransactionLog,
            ["ticker", "stock_code", "symbol", "security_code"],
            "Không rõ",
            limit=10,
        )

        side_field = _first_existing_field(
            TransactionLog,
            ["side", "order_side", "buy_sell", "transaction_type"],
        )
        buy_sell_dist = (
            _chart_from_queryset(transactions_qs, side_field, "Không rõ", limit=8)
            if side_field
            else []
        )
        branch_options = [
            {
                "id": "all",
                "name": "Tất cả Chi nhánh",
            }
        ] + [
            {
                "id": str(item["id"]),
                "name": item["branch_name"],
            }
            for item in filter_branches_by_user(
                Branch.objects.order_by("branch_name"), request.user
            ).values("id", "branch_name")
        ]

        return Response(
            {
                "filters": {
                    "branch": branch or "all",
                    "date_from": date_from or "",
                    "date_to": date_to or "",
                    "branch_options": branch_options,
                },
                "overview": {
                    "total_customers": total_customers,
                    "active_customers": active_customers,
                    "total_tickets": total_tickets,
                    "unlinked_tickets": unlinked_tickets,
                    "total_transactions": total_transactions,
                    "matched_value": float(matched_value_sum or 0),
                },
                "portfolio_health": {
                    "icp_score": icp_score,
                    "grouped_customers": grouped_customers_count,
                    "total_customers_health": total_customers,
                    "avg_ltv": avg_ltv,
                    "avg_ltv_fees": float(total_fees or 0),
                    "active_customers_ltv": active_customers,
                    "aar": aar_score,
                    "reactivated_with_trades": reactivated_with_trades,
                    "total_reactivated_records": total_reactivated_records,
                    "churn": churn_rate,
                    "churn_count": churn_count,
                    "referral": referral_rate,
                    "referral_count": referral_count,
                },
                "charts": {
                    "vip_tier_distribution": _chart_from_queryset(
                        customers_qs,
                        "membership_tier__tier_name",
                        "Chưa phân hạng",
                        limit=12,
                    ),
                    "branch_distribution": _chart_from_queryset(
                        customers_qs,
                        "branch__branch_name",
                        "Chưa có chi nhánh",
                        limit=12,
                    ),
                    "customer_type_distribution": _chart_from_queryset(
                        customers_qs,
                        "customer_type__type_name",
                        "Chưa phân loại",
                        limit=12,
                    ),
                    "ticket_status_distribution": _chart_from_queryset(
                        tickets_qs,
                        "current_status__status_name",
                        "Chưa có trạng thái",
                        limit=12,
                    ),
                    "ticket_category_distribution": _chart_from_queryset(
                        tickets_qs,
                        "support_category__category_name",
                        "Khác",
                        limit=14,
                    ),
                    "ticket_source_distribution": _chart_from_queryset(
                        tickets_qs,
                        "source__source_name",
                        "Không rõ",
                        limit=12,
                    ),
                    "ticket_priority_distribution": _chart_from_queryset(
                        tickets_qs,
                        "priority__priority_name",
                        "Chưa có mức ưu tiên",
                        limit=12,
                    ),
                    "ticket_classification_distribution": _chart_from_queryset(
                        tickets_qs,
                        "classification__classification_name",
                        "Khác",
                        limit=20,
                    ),
                    "customer_group_distribution": _chart_from_queryset(
                        records_qs,
                        "icp_group__icp_name",
                        "Chưa phân nhóm",
                        limit=12,
                    ),
                    "call_result_distribution": _chart_from_queryset(
                        records_qs,
                        "call_result__result_name",
                        "Không rõ",
                        limit=12,
                    ),
                    "interest_level_distribution": _chart_from_queryset(
                        records_qs,
                        "interest_level__level_name",
                        "Chưa đánh giá",
                        limit=12,
                    ),
                    "pic_distribution": _chart_from_queryset(
                        records_qs,
                        "pic_employee__full_name",
                        "Chưa phân công",
                        limit=12,
                    ),
                    "campaign_distribution": [
                        {
                            "name": "Tái kích hoạt",
                            "value": records_qs.filter(reactivation=True).count(),
                        },
                        {
                            "name": "Liên hệ khác",
                            "value": records_qs.filter(reactivation=False).count(),
                        },
                    ],
                    "product_type_distribution": product_type_dist,
                    "channel_distribution": channel_dist,
                    "order_status_distribution": order_status_dist,
                    "buy_sell_distribution": buy_sell_dist,
                    "top_tickers_distribution": top_tickers_dist,
                },
            }
        )
