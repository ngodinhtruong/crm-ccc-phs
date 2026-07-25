from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.sla.models import (
    SlaBreachReason,
    SlaEscalationRule,
    SlaPolicy,
    SlaPolicyTask,
    SlaPolicyTaskDependency,
)
from apps.sla.serializers import (
    SlaBreachReasonSerializer,
    SlaEscalationRuleSerializer,
    SlaPolicySerializer,
    SlaPolicyTaskDependencySerializer,
    SlaPolicyTaskSerializer,
)
from apps.accounts.api_permissions import HasActionPermission

class SlaPolicyViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = SlaPolicySerializer
    queryset = SlaPolicy.objects.all().order_by("-id")

    permission_action_map = {
        "list": "SLA_VIEW",
        "retrieve": "SLA_VIEW",
        "create": "SLA_CREATE",
        "update": "SLA_AMEND",
        "partial_update": "SLA_AMEND",
        "destroy": "SLA_ACTIVATE_DEACTIVATE",
    }

    def perform_create(self, serializer):
        assigned_to_user = serializer.validated_data.get("assigned_to_user")

        serializer.save(
            created_by_user=self.request.user,
            assigned_to_user=assigned_to_user or self.request.user,
        )


class SlaPolicyTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = SlaPolicyTaskSerializer
    queryset = SlaPolicyTask.objects.select_related(
        "sla_policy",
        "organization_unit",
        "default_branch",
    ).all().order_by("sla_policy", "sort_order", "id")

    permission_action_map = {
        "list": "SLA_VIEW",
        "retrieve": "SLA_VIEW",
        "create": "SLA_CREATE",
        "update": "SLA_AMEND",
        "partial_update": "SLA_AMEND",
        "destroy": "SLA_AMEND",
    }


class SlaPolicyTaskDependencyViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = SlaPolicyTaskDependencySerializer
    queryset = SlaPolicyTaskDependency.objects.select_related(
        "sla_policy",
        "task",
        "depends_on_task",
    ).all().order_by("id")

    permission_action_map = {
        "list": "SLA_VIEW",
        "retrieve": "SLA_VIEW",
        "create": "SLA_CREATE",
        "update": "SLA_AMEND",
        "partial_update": "SLA_AMEND",
        "destroy": "SLA_AMEND",
    }


class SlaBreachReasonViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = SlaBreachReasonSerializer
    queryset = SlaBreachReason.objects.all().order_by("sort_order", "id")

    permission_action_map = {
        "list": "SLA_VIEW",
        "retrieve": "SLA_VIEW",
        "create": "SLA_CREATE",
        "update": "SLA_AMEND",
        "partial_update": "SLA_AMEND",
        "destroy": "SLA_AMEND",
    }


class SlaEscalationRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = SlaEscalationRuleSerializer
    queryset = SlaEscalationRule.objects.select_related("sla_policy").all().order_by("id")

    permission_action_map = {
        "list": "SLA_VIEW",
        "retrieve": "SLA_VIEW",
        "create": "SLA_CREATE",
        "update": "SLA_AMEND",
        "partial_update": "SLA_AMEND",
        "destroy": "SLA_AMEND",
    }