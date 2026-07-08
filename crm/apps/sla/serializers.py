from rest_framework import serializers

from apps.sla.models import (
    SlaBreachReason,
    SlaEscalationRule,
    SlaPolicy,
    SlaPolicyTask,
    SlaPolicyTaskDependency,
)


class SlaPolicySerializer(serializers.ModelSerializer):
    assigned_to_user_name = serializers.SerializerMethodField()
    created_by_user_name = serializers.SerializerMethodField()
    support_category_name = serializers.CharField(
        source="support_category.support_category",
        read_only=True,
    )
    processing_unit_name = serializers.CharField(
        source="processing_unit.unit_name",
        read_only=True,
    )

    class Meta:
        model = SlaPolicy
        fields = "__all__"

    def get_assigned_to_user_name(self, obj):
        if not obj.assigned_to_user:
            return None

        full_name = obj.assigned_to_user.get_full_name()
        return full_name or obj.assigned_to_user.username

    def get_created_by_user_name(self, obj):
        if not obj.created_by_user:
            return None

        full_name = obj.created_by_user.get_full_name()
        return full_name or obj.created_by_user.username


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