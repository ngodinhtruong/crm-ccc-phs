from rest_framework import serializers

from apps.branches.models import Branch, Employee, ProcessingUnit
from apps.tickets.models import (
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketSupportCategory,
    TicketClassification,
)
from apps.sla.models import SlaPolicy, SlaBreachReason

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "branch_code", "branch_name", "address", "status"]


class EmployeeSerializer(serializers.ModelSerializer):
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "full_name",
            "email",
            "phone",
            "branch",
            "branch_name",
            "department",
            "position",
            "status",
        ]

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else None


class ProcessingUnitSerializer(serializers.ModelSerializer):
    default_branch_name = serializers.SerializerMethodField()

    class Meta:
        model = ProcessingUnit
        fields = [
            "id",
            "unit_code",
            "unit_name",
            "default_branch",
            "default_branch_name",
            "is_active",
        ]

    def get_default_branch_name(self, obj):
        return obj.default_branch.branch_name if obj.default_branch else None


class TicketStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketStatus
        fields = [
            "id",
            "status_code",
            "status_name",
            "sort_order",
            "is_final",
            "is_active",
        ]


class TicketPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketPriority
        fields = [
            "id",
            "priority_code",
            "priority_name",
            "level_order",
            "default_sla_minutes",
            "is_active",
        ]


class TicketSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketSource
        fields = [
            "id",
            "source_code",
            "source_name",
            "is_active",
        ]


class TicketSupportCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketSupportCategory
        fields = [
            "id",
            "category_code",
            "category_name",
            "parent",
            "parent_name",
            "sort_order",
            "is_active",
        ]

    def get_parent_name(self, obj):
        return obj.parent.category_name if obj.parent else None


class TicketClassificationSerializer(serializers.ModelSerializer):
    support_category_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketClassification
        fields = [
            "id",
            "classification_code",
            "classification_name",
            "support_category",
            "support_category_name",
            "sort_order",
            "is_active",
        ]

    def get_support_category_name(self, obj):
        return obj.support_category.category_name if obj.support_category else None


class SlaPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaPolicy
        fields = [
            "id",
            "sla_code",
            "sla_name",
            "status",
            "version",
            "response_time_minutes",
            "assignment_time_minutes",
            "processing_time_minutes",
            "resolution_time_minutes",
            "is_default",
            "is_active",
        ]


class SlaBreachReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaBreachReason
        fields = [
            "id",
            "reason_code",
            "reason_name",
            "sort_order",
            "is_active",
        ]