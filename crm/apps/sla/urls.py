from rest_framework.routers import DefaultRouter

from apps.sla.views import (
    SlaBreachReasonViewSet,
    SlaEscalationRuleViewSet,
    SlaPolicyTaskDependencyViewSet,
    SlaPolicyTaskViewSet,
    SlaPolicyViewSet,
)


router = DefaultRouter()

router.register("policies", SlaPolicyViewSet, basename="sla-policy")
router.register("policy-tasks", SlaPolicyTaskViewSet, basename="sla-policy-task")
router.register("policy-task-dependencies", SlaPolicyTaskDependencyViewSet, basename="sla-policy-task-dependency")
router.register("breach-reasons", SlaBreachReasonViewSet, basename="sla-breach-reason")
router.register("escalation-rules", SlaEscalationRuleViewSet, basename="sla-escalation-rule")

urlpatterns = router.urls