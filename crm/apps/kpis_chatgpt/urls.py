from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.kpis.views import (
    KpiGateDefinitionViewSet,
    KpiGroupViewSet,
    KpiPeriodGateConfigViewSet,
    KpiPeriodMetricViewSet,
    KpiPeriodViewSet,
    KpiProfileViewSet,
    KpiRewardTierConfigViewSet,
    KpiSectionViewSet,
    KpiUserGateResultViewSet,
    KpiUserMetricResultViewSet,
    KpiUserSummaryViewSet,
    KpiUserTargetViewSet,
)

router = DefaultRouter()
router.register("periods", KpiPeriodViewSet, basename="kpi-periods")
router.register("profiles", KpiProfileViewSet, basename="kpi-profiles")
router.register("sections", KpiSectionViewSet, basename="kpi-sections")
router.register("groups", KpiGroupViewSet, basename="kpi-groups")
router.register("metrics", KpiPeriodMetricViewSet, basename="kpi-metrics")
router.register("gate-configs", KpiPeriodGateConfigViewSet, basename="kpi-gate-configs")
router.register("reward-tiers", KpiRewardTierConfigViewSet, basename="kpi-reward-tiers")
router.register("gate-definitions", KpiGateDefinitionViewSet, basename="kpi-gate-definitions")
router.register("targets", KpiUserTargetViewSet, basename="kpi-targets")
router.register("results", KpiUserMetricResultViewSet, basename="kpi-results")
router.register("gate-results", KpiUserGateResultViewSet, basename="kpi-gate-results")
router.register("summaries", KpiUserSummaryViewSet, basename="kpi-summaries")

urlpatterns = [
    path("", include(router.urls)),
]
