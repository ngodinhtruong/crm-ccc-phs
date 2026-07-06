from rest_framework import serializers

from apps.branches.models import Branch, Employee, ProcessingUnit
from apps.customers.models import Customer, Company, CustomerAccount
from apps.sla.models import SlaPolicy, SlaBreachReason
from apps.tickets.models import (
    Ticket,
    TicketSupportCategory,
    TicketClassification,
    TicketPriority,
    TicketSource,
)


class TicketReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    handling_branch_name = serializers.SerializerMethodField()
    assigned_unit_name = serializers.SerializerMethodField()
    assigned_employee_name = serializers.SerializerMethodField()
    current_status_code = serializers.SerializerMethodField()
    current_status_name = serializers.SerializerMethodField()
    priority_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    sla_policy_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "ticket_code",
            "title",
            "customer",
            "customer_name",
            "company",
            "customer_account",
            "handling_branch",
            "handling_branch_name",
            "assigned_unit",
            "assigned_unit_name",
            "assigned_employee",
            "assigned_employee_name",
            "current_status",
            "current_status_code",
            "current_status_name",
            "priority",
            "priority_name",
            "source",
            "source_name",
            "sla_policy",
            "sla_policy_name",
            "classification_method",
            "source_ref_id",
            "request_content",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None

    def get_handling_branch_name(self, obj):
        return obj.handling_branch.branch_name if obj.handling_branch else None

    def get_assigned_unit_name(self, obj):
        return obj.assigned_unit.unit_name if obj.assigned_unit else None

    def get_assigned_employee_name(self, obj):
        return obj.assigned_employee.full_name if obj.assigned_employee else None

    def get_current_status_code(self, obj):
        return obj.current_status.status_code if obj.current_status else None

    def get_current_status_name(self, obj):
        return obj.current_status.status_name if obj.current_status else None

    def get_priority_name(self, obj):
        return obj.priority.priority_name if obj.priority else None

    def get_source_name(self, obj):
        return obj.source.source_name if obj.source else None

    def get_sla_policy_name(self, obj):
        return obj.sla_policy.sla_name if obj.sla_policy else None


class TicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True,
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True,
    )
    customer_account = serializers.PrimaryKeyRelatedField(
        queryset=CustomerAccount.objects.all(),
        required=False,
        allow_null=True,
    )

    handling_branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
    )

    assigned_unit = serializers.PrimaryKeyRelatedField(
        queryset=ProcessingUnit.objects.all(),
        required=False,
        allow_null=True,
    )
    assigned_employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True,
    )

    support_category = serializers.PrimaryKeyRelatedField(
        queryset=TicketSupportCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    classification = serializers.PrimaryKeyRelatedField(
        queryset=TicketClassification.objects.all(),
        required=False,
        allow_null=True,
    )

    priority = serializers.PrimaryKeyRelatedField(
        queryset=TicketPriority.objects.all(),
        required=False,
        allow_null=True,
    )
    source = serializers.PrimaryKeyRelatedField(
        queryset=TicketSource.objects.all(),
        required=False,
        allow_null=True,
    )
    sla_policy = serializers.PrimaryKeyRelatedField(
        queryset=SlaPolicy.objects.all(),
        required=False,
        allow_null=True,
    )

    classification_method = serializers.CharField(
        required=False,
        default="MANUAL",
        allow_blank=True,
    )
    source_ref_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    request_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


class TicketAssignSerializer(serializers.Serializer):
    to_employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True,
    )
    to_unit = serializers.PrimaryKeyRelatedField(
        queryset=ProcessingUnit.objects.all(),
        required=False,
        allow_null=True,
    )
    to_branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    transfer_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


class TicketStatusUpdateSerializer(serializers.Serializer):
    to_status_code = serializers.CharField()
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    breach_reason = serializers.PrimaryKeyRelatedField(
        queryset=SlaBreachReason.objects.all(),
        required=False,
        allow_null=True,
    )
    breach_note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    cancelled_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


class TicketAmendSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True,
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True,
    )
    customer_account = serializers.PrimaryKeyRelatedField(
        queryset=CustomerAccount.objects.all(),
        required=False,
        allow_null=True,
    )

    support_category = serializers.PrimaryKeyRelatedField(
        queryset=TicketSupportCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    classification = serializers.PrimaryKeyRelatedField(
        queryset=TicketClassification.objects.all(),
        required=False,
        allow_null=True,
    )
    priority = serializers.PrimaryKeyRelatedField(
        queryset=TicketPriority.objects.all(),
        required=False,
        allow_null=True,
    )
    source = serializers.PrimaryKeyRelatedField(
        queryset=TicketSource.objects.all(),
        required=False,
        allow_null=True,
    )
    sla_policy = serializers.PrimaryKeyRelatedField(
        queryset=SlaPolicy.objects.all(),
        required=False,
        allow_null=True,
    )

    classification_method = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    source_ref_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    request_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )