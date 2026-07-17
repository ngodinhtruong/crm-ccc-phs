from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from apps.branches.models import Branch, Employee, ProcessingUnit
from apps.common.serializers import (
    BranchSerializer,
    EmployeeSerializer,
    ProcessingUnitSerializer,
    TicketStatusSerializer,
    TicketPrioritySerializer,
    TicketSourceSerializer,
    TicketSupportCategorySerializer,
    TicketClassificationSerializer,
    SlaPolicySerializer,
    SlaBreachReasonSerializer,
)
from apps.sla.models import SlaPolicy, SlaBreachReason
from apps.tickets.models import (
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketSupportCategory,
    TicketClassification,
)

from apps.accounts.api_permissions import MasterDataPermission
from apps.accounts.scopes import (
    filter_branches_by_user,
    filter_employees_by_user,
)


class MasterDataPagination(PageNumberPagination):
    """
    Master data dùng để đổ dropdown nên client cần lấy hết trong 1 lần.
    Mặc định của DRF là 20 dòng/trang và không cho đổi → dropdown mất lựa chọn.
    """

    page_size = 200
    page_size_query_param = "page_size"
    max_page_size = 1000


class BranchViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = BranchSerializer

    def get_queryset(self):
        queryset = Branch.objects.all().order_by("id")
        return filter_branches_by_user(queryset, self.request.user)


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        queryset = Employee.objects.select_related("branch").all().order_by("id")
        return filter_employees_by_user(queryset, self.request.user)


class ProcessingUnitViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    pagination_class = MasterDataPagination
    serializer_class = ProcessingUnitSerializer
    queryset = ProcessingUnit.objects.select_related("default_branch").all().order_by("id")


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
    queryset = TicketSupportCategory.objects.filter(is_active=True).select_related("parent").order_by("sort_order", "id")


class TicketClassificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = TicketClassificationSerializer
    queryset = TicketClassification.objects.filter(is_active=True).select_related("support_category").order_by("sort_order", "id")


class SlaPolicyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = SlaPolicySerializer
    queryset = SlaPolicy.objects.filter(is_active=True).order_by("id")


class SlaBreachReasonViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MasterDataPagination
    serializer_class = SlaBreachReasonSerializer
    queryset = SlaBreachReason.objects.filter(is_active=True).order_by("sort_order", "id")