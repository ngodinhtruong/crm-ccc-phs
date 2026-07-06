from rest_framework import serializers

from apps.sla.models import (
    SlaBreachReason,
    SlaEscalationRule,
    SlaPolicy,
    SlaPolicyTask,
    SlaPolicyTaskDependency,
)


class SlaPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaPolicy
        fields = "__all__"


class SlaPolicyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaPolicyTask
        fields = "__all__"


class SlaPolicyTaskDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaPolicyTaskDependency
        fields = "__all__"


class SlaBreachReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaBreachReason
        fields = "__all__"


class SlaEscalationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaEscalationRule
        fields = "__all__"