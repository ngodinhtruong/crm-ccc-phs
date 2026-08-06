from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tickets.error_reports import TicketErrorReportAPIView, TicketErrorReportExportAPIView
from apps.tickets.ccc_dashboard import (
    TicketCccDashboardAPIView,
    TicketCccDashboardPendingTicketsAPIView,
)

from apps.tickets.surveys.views import TicketSurveyViewSet
from apps.tickets.views import (
    TicketViewSet,
    TicketSupportCategoryViewSet,
    TicketClassificationViewSet,
    TicketStatusViewSet,
    TicketPriorityViewSet,
    TicketSourceViewSet,
    TicketErrorGroupViewSet,
    TicketErrorTypeViewSet,
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


router.register("error-groups", TicketErrorGroupViewSet, basename="ticket-error-group")
router.register("error-types", TicketErrorTypeViewSet, basename="ticket-error-type")

# Khảo sát CSAT gắn với ticket.
router.register("surveys", TicketSurveyViewSet, basename="ticket-survey")

urlpatterns = router.urls + [
    path("ccc-dashboard/", TicketCccDashboardAPIView.as_view(), name="ticket-ccc-dashboard"),
    path(
        "ccc-dashboard/pending-tickets/",
        TicketCccDashboardPendingTicketsAPIView.as_view(),
        name="ticket-ccc-dashboard-pending-tickets",
    ),
    path("error-report/", TicketErrorReportAPIView.as_view(), name="ticket-error-report"),
    path("error-report/export/", TicketErrorReportExportAPIView.as_view(), name="ticket-error-report-export"),
]