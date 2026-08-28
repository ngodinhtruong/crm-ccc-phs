from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.sale_admin.admin_dashboard_views import SaleAdminReportDashboardAPIView
from apps.sale_admin.views import (
    SaAccountStatusOptionAPIView,
    SaCallResultViewSet,
    SaCustomerAccountSuggestionAPIView,
    SaInterestLevelViewSet,
    SaIcpGroupViewSet,
    SaIcpRuleViewSet,
    SaProductViewSet,
    SaSupportCategoryViewSet,
    SaRecordAuditLogViewSet,
    SaRecordViewSet,
    SaVipClassificationOptionAPIView,
)

router = DefaultRouter()
router.register("products", SaProductViewSet, basename="sa-product")
router.register("support-categories", SaSupportCategoryViewSet, basename="sa-support-category")
router.register("records", SaRecordViewSet, basename="sa-record")
router.register("record-audit-logs", SaRecordAuditLogViewSet, basename="sa-record-audit-log")
router.register("call-results", SaCallResultViewSet, basename="sa-call-result")
router.register("interest-levels", SaInterestLevelViewSet, basename="sa-interest-level")
router.register("icp-groups", SaIcpGroupViewSet, basename="sa-icp-group")
router.register("icp-rules", SaIcpRuleViewSet, basename="sa-icp-rule")

urlpatterns = router.urls + [
    path("customer-account-suggestions/", SaCustomerAccountSuggestionAPIView.as_view(), name="sa-customer-account-suggestions"),
    path("account-status-options/", SaAccountStatusOptionAPIView.as_view(), name="sa-account-status-options"),
    path("vip-classification-options/", SaVipClassificationOptionAPIView.as_view(), name="sa-vip-classification-options"),
    path("admin-dashboard/", SaleAdminReportDashboardAPIView.as_view(), name="sale-admin-admin-dashboard"),
    path("dashboard/", SaleAdminReportDashboardAPIView.as_view(), name="sale-admin-dashboard"),
    path("report-dashboard/", SaleAdminReportDashboardAPIView.as_view(), name="sale-admin-report-dashboard"),
]
