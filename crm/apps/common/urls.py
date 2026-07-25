from rest_framework.routers import DefaultRouter

from apps.common.views import (
    BranchViewSet,
    EmployeeOrganizationMembershipViewSet,
    EmployeeViewSet,
    OrganizationUnitViewSet,
    ProcessingUnitViewSet,
    SlaBreachReasonViewSet,
    SlaPolicyViewSet,
    TicketClassificationViewSet,
    TicketPriorityViewSet,
    TicketSourceViewSet,
    TicketStatusViewSet,
    TicketSupportCategoryViewSet,
)


router = DefaultRouter()

router.register("branches", BranchViewSet, basename="branch")
router.register("employees", EmployeeViewSet, basename="employee")
router.register(
    "organization-units",
    OrganizationUnitViewSet,
    basename="organization-unit",
)
router.register(
    "employee-organization-memberships",
    EmployeeOrganizationMembershipViewSet,
    basename="employee-organization-membership",
)
# Endpoint tương thích trong giai đoạn frontend chuyển đổi.
router.register(
    "processing-units",
    ProcessingUnitViewSet,
    basename="processing-unit",
)

router.register("ticket-statuses", TicketStatusViewSet, basename="ticket-status")
router.register("ticket-priorities", TicketPriorityViewSet, basename="ticket-priority")
router.register("ticket-sources", TicketSourceViewSet, basename="ticket-source")
router.register(
    "ticket-categories",
    TicketSupportCategoryViewSet,
    basename="ticket-category",
)
router.register(
    "ticket-classifications",
    TicketClassificationViewSet,
    basename="ticket-classification",
)
router.register("sla-policies", SlaPolicyViewSet, basename="sla-policy")
router.register(
    "sla-breach-reasons",
    SlaBreachReasonViewSet,
    basename="sla-breach-reason",
)

urlpatterns = router.urls
