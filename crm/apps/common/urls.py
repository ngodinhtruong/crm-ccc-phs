from rest_framework.routers import DefaultRouter

from apps.common.views import (
    BranchViewSet,
    EmployeeViewSet,
    ProcessingUnitViewSet,
    TicketStatusViewSet,
    TicketPriorityViewSet,
    TicketSourceViewSet,
    TicketSupportCategoryViewSet,
    TicketClassificationViewSet,
    SlaPolicyViewSet,
    SlaBreachReasonViewSet,
)


router = DefaultRouter()

router.register("branches", BranchViewSet, basename="branch")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("processing-units", ProcessingUnitViewSet, basename="processing-unit")

router.register("ticket-statuses", TicketStatusViewSet, basename="ticket-status")
router.register("ticket-priorities", TicketPriorityViewSet, basename="ticket-priority")
router.register("ticket-sources", TicketSourceViewSet, basename="ticket-source")
router.register("ticket-categories", TicketSupportCategoryViewSet, basename="ticket-category")
router.register("ticket-classifications", TicketClassificationViewSet, basename="ticket-classification")

router.register("sla-policies", SlaPolicyViewSet, basename="sla-policy")
router.register("sla-breach-reasons", SlaBreachReasonViewSet, basename="sla-breach-reason")

urlpatterns = router.urls