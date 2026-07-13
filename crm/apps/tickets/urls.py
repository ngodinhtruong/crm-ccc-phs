from rest_framework.routers import DefaultRouter

from apps.tickets.views import (
    TicketViewSet,
    TicketSupportCategoryViewSet,
    TicketClassificationViewSet,
    TicketStatusViewSet,
    TicketPriorityViewSet,
    TicketSourceViewSet,
)


router = DefaultRouter()

router.register("tickets", TicketViewSet, basename="ticket")

router.register(
    "support-categories",
    TicketSupportCategoryViewSet,
    basename="ticket-support-category",
)
router.register(
    "classifications",
    TicketClassificationViewSet,
    basename="ticket-classification",
)
router.register(
    "statuses",
    TicketStatusViewSet,
    basename="ticket-status",
)
router.register(
    "priorities",
    TicketPriorityViewSet,
    basename="ticket-priority",
)
router.register(
    "sources",
    TicketSourceViewSet,
    basename="ticket-source",
)

urlpatterns = router.urls