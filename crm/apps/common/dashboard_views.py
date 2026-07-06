from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Permission, Role
from apps.accounts.scopes import (
    filter_branches_by_user,
    filter_customers_by_user,
    filter_employees_by_user,
    filter_tickets_by_user,
)
from apps.accounts.services import PermissionService
from apps.branches.models import Branch, Employee, ProcessingUnit
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
                "key": "processing_units",
                "title": "Phòng ban xử lý",
                "description": "Quản lý đơn vị xử lý ticket",
                "href": "/master-data/processing-units",
                "value": ProcessingUnit.objects.filter(is_active=True).count(),
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