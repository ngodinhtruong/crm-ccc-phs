from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.external_errors.views import (
    ExternalErrorCauseGroupViewSet,
    ExternalErrorCodeViewSet,
    ExternalErrorDashboardChartAPIView,
    ExternalErrorDashboardSummaryAPIView,
    ExternalErrorDashboardWidgetViewSet,
    ExternalErrorExcelImportAPIView,
    ExternalErrorGroupViewSet,
    ExternalErrorImportBatchViewSet,
    ExternalErrorRawImportAPIView,
    ExternalErrorRecordViewSet,
    ExternalErrorRecurringAPIView,
)


router = DefaultRouter()
router.register(
    "groups",
    ExternalErrorGroupViewSet,
    basename="external-error-groups",
)
router.register(
    "error-codes",
    ExternalErrorCodeViewSet,
    basename="external-error-codes",
)
router.register(
    "cause-groups",
    ExternalErrorCauseGroupViewSet,
    basename="external-error-cause-groups",
)
router.register(
    "records",
    ExternalErrorRecordViewSet,
    basename="external-error-records",
)
router.register(
    "batches",
    ExternalErrorImportBatchViewSet,
    basename="external-error-batches",
)
router.register(
    "dashboard/widgets",
    ExternalErrorDashboardWidgetViewSet,
    basename="external-error-dashboard-widgets",
)

urlpatterns = [
    path(
        "import-excel/",
        ExternalErrorExcelImportAPIView.as_view(),
        name="external-error-import-excel",
    ),
    path(
        "import-raw/",
        ExternalErrorRawImportAPIView.as_view(),
        name="external-error-import-raw",
    ),
    path(
        "dashboard/summary/",
        ExternalErrorDashboardSummaryAPIView.as_view(),
        name="external-error-dashboard-summary",
    ),
    path(
        "dashboard/chart/",
        ExternalErrorDashboardChartAPIView.as_view(),
        name="external-error-dashboard-chart",
    ),
    path(
        "dashboard/recurring/",
        ExternalErrorRecurringAPIView.as_view(),
        name="external-error-dashboard-recurring",
    ),
]

urlpatterns += router.urls
