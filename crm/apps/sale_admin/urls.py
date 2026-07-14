from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.sale_admin.admin_dashboard_views import SaleAdminDashboardView
from apps.sale_admin.views import (
    SaCallResultViewSet,
    SaIcpGroupViewSet,
    SaInterestLevelViewSet,
    SaRecordAuditLogViewSet,
    SaRecordViewSet,
)

router = DefaultRouter()
router.register("records", SaRecordViewSet, basename="sa-records")
router.register("record-audit-logs", SaRecordAuditLogViewSet, basename="sa-record-audit-logs")
router.register("call-results", SaCallResultViewSet, basename="sa-call-results")
router.register("interest-levels", SaInterestLevelViewSet, basename="sa-interest-levels")
router.register("icp-groups", SaIcpGroupViewSet, basename="sa-icp-groups")

urlpatterns = [
    path("dashboard/", SaleAdminDashboardView.as_view(), name="sale-admin-dashboard"),
    path("", include(router.urls)),
]
