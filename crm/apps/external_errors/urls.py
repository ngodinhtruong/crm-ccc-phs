from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.external_errors.views import (
    ExternalErrorDashboardChartAPIView,
    ExternalErrorDashboardSummaryAPIView,
    ExternalErrorDashboardWidgetViewSet,
    ExternalErrorImportBatchViewSet,
    ExternalErrorRawImportAPIView,
    ExternalErrorRecordViewSet,
    ExternalErrorRecurringAPIView,
)

router = DefaultRouter()
router.register("records", ExternalErrorRecordViewSet, basename="external-error-records")
router.register("batches", ExternalErrorImportBatchViewSet, basename="external-error-batches")
router.register("dashboard/widgets", ExternalErrorDashboardWidgetViewSet, basename="external-error-dashboard-widgets")

urlpatterns = [
    path("import-raw/", ExternalErrorRawImportAPIView.as_view(), name="external-error-import-raw"),
    path("dashboard/summary/", ExternalErrorDashboardSummaryAPIView.as_view(), name="external-error-dashboard-summary"),
    path("dashboard/chart/", ExternalErrorDashboardChartAPIView.as_view(), name="external-error-dashboard-chart"),
    path("dashboard/recurring/", ExternalErrorRecurringAPIView.as_view(), name="external-error-dashboard-recurring"),
]

urlpatterns += router.urls
