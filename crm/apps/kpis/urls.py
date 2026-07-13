from rest_framework.routers import DefaultRouter

from apps.kpis.views import (
    KpiGateDefinitionViewSet,
    KpiGroupViewSet,
    KpiMetricDefinitionViewSet,
    KpiPeriodGateConfigViewSet,
    KpiPeriodMetricViewSet,
    KpiPeriodViewSet,
    KpiRewardTierConfigViewSet,
    KpiUserMetricResultViewSet,
)

router = DefaultRouter()

router.register(r"periods", KpiPeriodViewSet, basename="kpi-periods")
router.register(r"groups", KpiGroupViewSet, basename="kpi-groups")
router.register(r"metrics", KpiPeriodMetricViewSet, basename="kpi-period-metrics")
router.register(r"gate-configs", KpiPeriodGateConfigViewSet, basename="kpi-period-gate-configs")
router.register(r"reward-tiers", KpiRewardTierConfigViewSet, basename="kpi-reward-tiers")
router.register(r"metric-definitions", KpiMetricDefinitionViewSet, basename="kpi-metric-definitions")
router.register(r"gate-definitions", KpiGateDefinitionViewSet, basename="kpi-gate-definitions")
router.register(r"results", KpiUserMetricResultViewSet, basename="kpi-results")
urlpatterns = router.urls