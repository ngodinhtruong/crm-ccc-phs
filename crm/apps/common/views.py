from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.api_permissions import MasterDataPermission
from apps.accounts.scopes import (
    filter_branches_by_user,
    filter_employees_by_user,
    filter_organization_units_by_user,
)
from apps.branches.models import (
    Branch,
    Employee,
    EmployeeOrganizationMembership,
    MembershipResponsibility,
    OrganizationUnit,
)
from apps.common.serializers import (
    BranchSerializer,
    EmployeeOrganizationMembershipSerializer,
    EmployeeSerializer,
    OrganizationUnitSerializer,
    SlaBreachReasonSerializer,
    SlaPolicySerializer,
    TicketClassificationSerializer,
    TicketPrioritySerializer,
    TicketSourceSerializer,
    TicketStatusSerializer,
    TicketSupportCategorySerializer,
)
from apps.sla.models import SlaBreachReason, SlaPolicy
from apps.tickets.models import (
    TicketClassification,
    TicketPriority,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)


class MasterDataPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = "page_size"
    max_page_size = 1000


class BranchViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = BranchSerializer

    def get_queryset(self):
        return filter_branches_by_user(
            Branch.objects.all().order_by("branch_name", "id"),
            self.request.user,
        )


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        queryset = (
            Employee.objects.select_related("branch")
            .prefetch_related(
                "organization_memberships__organization_unit",
                "organization_memberships__organization_unit__branch",
            )
            .all()
        )

        branch_id = self.request.query_params.get("branch")
        organization_unit_id = self.request.query_params.get("organization_unit")
        status_value = self.request.query_params.get("status")
        q = self.request.query_params.get("q")

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        if organization_unit_id:
            queryset = queryset.filter(
                organization_memberships__organization_unit_id=organization_unit_id,
                organization_memberships__is_active=True,
            )
        if status_value:
            queryset = queryset.filter(status=status_value)
        if q:
            queryset = queryset.filter(
                Q(employee_code__icontains=q)
                | Q(full_name__icontains=q)
                | Q(email__icontains=q)
                | Q(position__icontains=q)
                | Q(
                    organization_memberships__organization_unit__unit_name__icontains=q
                )
            )

        return filter_employees_by_user(queryset, self.request.user).order_by(
            "full_name",
            "id",
        )


class OrganizationUnitViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = OrganizationUnitSerializer

    def get_queryset(self):
        queryset = (
            OrganizationUnit.objects.select_related("branch", "parent")
            .prefetch_related("children")
            .annotate(
                member_count=Count(
                    "employee_memberships",
                    filter=Q(employee_memberships__is_active=True),
                    distinct=True,
                )
            )
        )

        params = self.request.query_params
        q = params.get("q")
        branch_id = params.get("branch")
        parent_id = params.get("parent")
        unit_type = params.get("unit_type")
        is_active = params.get("is_active")
        is_ticket_assignable = params.get("is_ticket_assignable")
        roots_only = params.get("roots_only")

        if q:
            queryset = queryset.filter(
                Q(unit_code__icontains=q) | Q(unit_name__icontains=q)
            )
        if branch_id:
            queryset = queryset.filter(Q(branch_id=branch_id) | Q(branch__isnull=True))
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        if unit_type:
            queryset = queryset.filter(unit_type=unit_type)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        if is_ticket_assignable in {"true", "false"}:
            queryset = queryset.filter(
                is_ticket_assignable=is_ticket_assignable == "true"
            )
        if roots_only == "true":
            queryset = queryset.filter(parent__isnull=True)

        return filter_organization_units_by_user(
            queryset,
            self.request.user,
        ).order_by("sort_order", "unit_name", "id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_children"] = (
            self.request.query_params.get("include_children") == "true"
            or self.action == "tree"
        )
        return context

    @action(detail=False, methods=["get"])
    def tree(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(parent__isnull=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EmployeeOrganizationMembershipViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = EmployeeOrganizationMembershipSerializer

    def get_queryset(self):
        queryset = EmployeeOrganizationMembership.objects.select_related(
            "employee",
            "employee__branch",
            "organization_unit",
            "organization_unit__branch",
        )

        employee_id = self.request.query_params.get("employee")
        organization_unit_id = self.request.query_params.get("organization_unit")
        is_active = self.request.query_params.get("is_active")
        is_primary = self.request.query_params.get("is_primary")

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if organization_unit_id:
            queryset = queryset.filter(organization_unit_id=organization_unit_id)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        if is_primary in {"true", "false"}:
            queryset = queryset.filter(is_primary=is_primary == "true")

        visible_employees = filter_employees_by_user(
            Employee.objects.all(),
            self.request.user,
        ).values_list("id", flat=True)
        return queryset.filter(employee_id__in=visible_employees).order_by(
            "employee_id",
            "-is_primary",
            "id",
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="responsibility-choices",
    )
    def responsibility_choices(self, request):
        return Response(
            [
                {"value": value, "label": label}
                for value, label in MembershipResponsibility.choices
            ]
        )


# Alias API tạm thời để frontend cũ chưa phải đổi ngay.
ProcessingUnitViewSet = OrganizationUnitViewSet


class TicketStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketStatusSerializer
    queryset = TicketStatus.objects.filter(is_active=True).order_by("sort_order", "id")


class TicketPriorityViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketPrioritySerializer
    queryset = TicketPriority.objects.filter(is_active=True).order_by("level_order", "id")


class TicketSourceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketSourceSerializer
    queryset = TicketSource.objects.filter(is_active=True).order_by("id")


class TicketSupportCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketSupportCategorySerializer
    queryset = TicketSupportCategory.objects.filter(is_active=True).select_related(
        "parent"
    ).order_by("sort_order", "id")


class TicketClassificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketClassificationSerializer
    queryset = TicketClassification.objects.filter(is_active=True).select_related(
        "support_category"
    ).order_by("sort_order", "id")


class SlaPolicyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = SlaPolicySerializer
    queryset = SlaPolicy.objects.filter(is_active=True).order_by("id")


class SlaBreachReasonViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = SlaBreachReasonSerializer
    queryset = SlaBreachReason.objects.filter(is_active=True).order_by(
        "sort_order",
        "id",
    )
