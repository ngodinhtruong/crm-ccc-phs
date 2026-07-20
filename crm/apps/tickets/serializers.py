from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.branches.models import Branch, Employee, ProcessingUnit
from apps.customers.models import Customer, Company, CustomerAccount
from apps.sla.models import SlaPolicy, SlaBreachReason
from apps.tickets.models import (
    Ticket,
    TicketSupportCategory,
    TicketClassification,
    TicketPriority,
    TicketSource,
    TicketStatus,
    TicketAccountLinkStatus,
    TicketErrorGroup,
    TicketErrorType,
)
class TicketSupportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketSupportCategory
        fields = [
            "id",
            "category_code",
            "category_name",
            "parent",
            "is_active",
            "sort_order",
        ]


class TicketClassificationSerializer(serializers.ModelSerializer):
    support_category_name = serializers.CharField(
        source="support_category.category_name",
        read_only=True,
    )

    class Meta:
        model = TicketClassification
        fields = [
            "id",
            "classification_code",
            "classification_name",
            "support_category",
            "support_category_name",
            "is_active",
            "sort_order",
        ]


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



class TicketErrorGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketErrorGroup
        fields = [
            "id",
            "group_code",
            "group_name",
            "description",
            "related_system",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]


class TicketErrorTypeSerializer(serializers.ModelSerializer):
    group_code = serializers.CharField(source="group.group_code", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)

    class Meta:
        model = TicketErrorType
        fields = [
            "id",
            "group",
            "group_code",
            "group_name",
            "type_code",
            "type_name",
            "description",
            "related_system",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        related_system = attrs.get("related_system")
        group = attrs.get("group") or getattr(self.instance, "group", None)

        if group and not related_system:
            attrs["related_system"] = group.related_system

        return attrs



def normalize_ticket_error_fields(attrs, instance=None):
    error_group = attrs.get("error_group", getattr(instance, "error_group", None))
    error_type = attrs.get("error_type", getattr(instance, "error_type", None))

    if error_type:
        if error_group and error_type.group_id != error_group.id:
            raise serializers.ValidationError(
                {"error_type": "Loại lỗi không thuộc nhóm lỗi đã chọn."}
            )

        error_group = error_type.group
        attrs["error_group"] = error_group

        if not attrs.get("related_system") and getattr(error_type, "related_system", None):
            attrs["related_system"] = error_type.related_system

    if error_group and not attrs.get("related_system") and getattr(error_group, "related_system", None):
        attrs["related_system"] = error_group.related_system

    return attrs

User = get_user_model()
class TicketReadSerializer(serializers.ModelSerializer):
    support_category_name = serializers.SerializerMethodField()
    classification_name = serializers.SerializerMethodField()

    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    customer_account_number = serializers.SerializerMethodField()
    display_account_number = serializers.SerializerMethodField()
    account_link_status_label = serializers.SerializerMethodField()

    handling_branch_name = serializers.SerializerMethodField()
    assigned_unit_name = serializers.SerializerMethodField()
    assigned_employee_name = serializers.SerializerMethodField()

    owner_user_name = serializers.SerializerMethodField()

    current_status_code = serializers.SerializerMethodField()
    current_status_name = serializers.SerializerMethodField()
    status_name = serializers.SerializerMethodField()

    # Khảo sát nằm ở bảng TicketFeedback (OneToOne), không phải cột của Ticket
    send_survey = serializers.SerializerMethodField()

    priority_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    sla_policy_name = serializers.SerializerMethodField()

    is_error_ticket = serializers.SerializerMethodField()
    error_group_code = serializers.SerializerMethodField()
    error_group_name = serializers.SerializerMethodField()
    error_type_code = serializers.SerializerMethodField()
    error_type_name = serializers.SerializerMethodField()

    total_duration_minutes = serializers.SerializerMethodField()
    processing_duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "ticket_code",
            "title",

            "customer",
            "customer_name",
            "customer_phone",
            "customer_email",
            "company",
            "company_name",
            "customer_account",
            "customer_account_number",
            "raw_account_number",
            "display_account_number",
            "account_link_status",
            "account_link_status_label",

            "handling_branch",
            "handling_branch_name",
            "assigned_unit",
            "assigned_unit_name",
            "assigned_employee",
            "assigned_employee_name",

            "owner_user",
            "owner_user_name",

            "support_category",
            "support_category_name",
            "classification",
            "classification_name",

            "is_error_ticket",
            "error_group",
            "error_group_code",
            "error_group_name",
            "error_type",
            "error_type_code",
            "error_type_name",
            "error_note",
            "related_system",
            "external_status",
            "last_synced_at",

            "current_status",
            "current_status_code",
            "current_status_name",
            "status_name",

            "priority",
            "priority_name",
            "source",
            "source_name",

            "sla_policy",
            "sla_policy_name",

            "classification_method",
            "source_ref_id",
            "request_content",
            "handling_solution",
            "final_response",
            "send_survey",

            "total_duration_minutes",
            "processing_duration_minutes",

            "created_at",
            "updated_at",
            "done_at",
            "closed_at",
        ]

    def get_support_category_name(self, obj):
        return obj.support_category.category_name if obj.support_category else None

    def get_classification_name(self, obj):
        return obj.classification.classification_name if obj.classification else None

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None

    def get_customer_phone(self, obj):
        return obj.customer.phone if obj.customer else None

    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer else None

    def get_company_name(self, obj):
        return obj.company.company_name if obj.company else None

    def get_total_duration_minutes(self, obj):
        if not obj.created_at:
            return None
        end_time = obj.closed_at or obj.done_at or obj.cancelled_at or timezone.now()
        return round((end_time - obj.created_at).total_seconds() / 60, 1)

    def get_processing_duration_minutes(self, obj):
        start_time = obj.processing_started_at or obj.accepted_at or obj.created_at
        if not start_time:
            return None
        end_time = obj.closed_at or obj.done_at or obj.cancelled_at or timezone.now()
        return round((end_time - start_time).total_seconds() / 60, 1)

    def get_customer_account_number(self, obj):
        if not obj.customer_account:
            return None

        return (
            getattr(obj.customer_account, "account_number", None)
            or getattr(obj.customer_account, "account_no", None)
        )

    def get_display_account_number(self, obj):
        return self.get_customer_account_number(obj) or obj.raw_account_number

    def get_account_link_status_label(self, obj):
        if obj.account_link_status == TicketAccountLinkStatus.LINKED:
            return "Có TK liên kết"

        if obj.account_link_status == TicketAccountLinkStatus.UNLINKED:
            return "Chưa có TK liên kết"

        return obj.account_link_status

    def get_handling_branch_name(self, obj):
        return obj.handling_branch.branch_name if obj.handling_branch else None

    def get_assigned_unit_name(self, obj):
        return obj.assigned_unit.unit_name if obj.assigned_unit else None

    def get_assigned_employee_name(self, obj):
        return obj.assigned_employee.full_name if obj.assigned_employee else None

    def get_owner_user_name(self, obj):
        if not obj.owner_user:
            return None

        full_name = obj.owner_user.get_full_name()
        return full_name or obj.owner_user.username or obj.owner_user.email

    def get_current_status_code(self, obj):
        return obj.current_status.status_code if obj.current_status else None

    def get_current_status_name(self, obj):
        return obj.current_status.status_name if obj.current_status else None

    def get_status_name(self, obj):
        return obj.current_status.status_name if obj.current_status else None

    def get_send_survey(self, obj):
        """Đã gửi khảo sát chưa — đọc từ TicketFeedback, mặc định False."""
        feedback = getattr(obj, "feedback", None)

        return bool(feedback.survey_sent) if feedback else False

    def get_priority_name(self, obj):
        return obj.priority.priority_name if obj.priority else None

    def get_source_name(self, obj):
        return obj.source.source_name if obj.source else None


    def get_is_error_ticket(self, obj):
        return bool(obj.error_group_id or obj.error_type_id)

    def get_error_group_code(self, obj):
        return obj.error_group.group_code if obj.error_group else None

    def get_error_group_name(self, obj):
        return obj.error_group.group_name if obj.error_group else None

    def get_error_type_code(self, obj):
        return obj.error_type.type_code if obj.error_type else None

    def get_error_type_name(self, obj):
        return obj.error_type.type_name if obj.error_type else None

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
    raw_account_number = serializers.CharField(
        required=False,
        allow_blank=True,
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
    owner_user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
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
    current_status = serializers.PrimaryKeyRelatedField(
        queryset=TicketStatus.objects.all(),
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

    error_group = serializers.PrimaryKeyRelatedField(
        queryset=TicketErrorGroup.objects.all(),
        required=False,
        allow_null=True,
    )
    error_type = serializers.PrimaryKeyRelatedField(
        queryset=TicketErrorType.objects.all(),
        required=False,
        allow_null=True,
    )
    error_note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    related_system = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    external_status = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    last_synced_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    request_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    handling_solution = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        )
    final_response = serializers.CharField(
            required=False,
            allow_blank=True,
            allow_null=True,
        )

    def validate(self, attrs):
        return normalize_ticket_error_fields(attrs)


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
    raw_account_number = serializers.CharField(
        required=False,
        allow_blank=True,
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

    error_group = serializers.PrimaryKeyRelatedField(
        queryset=TicketErrorGroup.objects.all(),
        required=False,
        allow_null=True,
    )
    error_type = serializers.PrimaryKeyRelatedField(
        queryset=TicketErrorType.objects.all(),
        required=False,
        allow_null=True,
    )
    error_note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    related_system = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    external_status = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    last_synced_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    request_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    owner_user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    current_status = serializers.PrimaryKeyRelatedField(
        queryset=TicketStatus.objects.all(),
        required=False,
        allow_null=True,
    )
    handling_solution = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    final_response = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate(self, attrs):
        return normalize_ticket_error_fields(attrs, instance=None)




class TicketSerializer(serializers.ModelSerializer):
    support_category_name = serializers.CharField(
        source="support_category.category_name",
        read_only=True,
    )
    classification_name = serializers.CharField(
        source="classification.classification_name",
        read_only=True,
    )
    status_name = serializers.CharField(
        source="current_status.status_name",
        read_only=True,
    )
    priority_name = serializers.CharField(
        source="priority.priority_name",
        read_only=True,
    )

    error_group_name = serializers.CharField(
        source="error_group.group_name",
        read_only=True,
    )
    error_type_name = serializers.CharField(
        source="error_type.type_name",
        read_only=True,
    )
    source_name = serializers.CharField(
        source="source.source_name",
        read_only=True,
    )

    company_name = serializers.CharField(
        source="company.company_name",
        read_only=True,
    )
    customer_name = serializers.CharField(
        source="customer.full_name",
        read_only=True,
    )

    customer_account_number = serializers.SerializerMethodField()

    handling_branch_name = serializers.CharField(
        source="handling_branch.branch_name",
        read_only=True,
    )
    assigned_unit_name = serializers.CharField(
        source="assigned_unit.unit_name",
        read_only=True,
    )

    owner_user_name = serializers.SerializerMethodField()
    assigned_employee_name = serializers.CharField(
        source="assigned_employee.full_name",
        read_only=True,
    )

    class Meta:
        model = Ticket
        fields = "__all__"

    def get_customer_account_number(self, obj):
        if not obj.customer_account:
            return None

        return (
            getattr(obj.customer_account, "account_number", None)
            or getattr(obj.customer_account, "account_no", None)
        )

    def get_owner_user_name(self, obj):
        if not obj.owner_user:
            return None

        full_name = obj.owner_user.get_full_name()

        return full_name or obj.owner_user.username or obj.owner_user.email