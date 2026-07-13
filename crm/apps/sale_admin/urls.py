from rest_framework.routers import DefaultRouter

from apps.sale_admin.views import (
    SaCallResultViewSet,
    SaInterestLevelViewSet,
    SaIcpGroupViewSet,
    SaRecordViewSet,
    SaRecordAuditLogViewSet,
)

router = DefaultRouter()

router.register(r"call-results", SaCallResultViewSet, basename="sa-call-results")
router.register(r"interest-levels", SaInterestLevelViewSet, basename="sa-interest-levels")
router.register(r"icp-groups", SaIcpGroupViewSet, basename="sa-icp-groups")
router.register(r"records", SaRecordViewSet, basename="sa-records")
router.register(r"record-audit-logs", SaRecordAuditLogViewSet, basename="sa-record-audit-logs")

urlpatterns = router.urls