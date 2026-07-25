from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.branches.models import (
    Branch,
    Employee,
    EmployeeOrganizationMembership,
    MembershipResponsibility,
    OrganizationUnit,
)
from apps.sla.models import SlaBreachReason, SlaPolicy
from apps.tickets.models import (
    TicketClassification,
    TicketPriority,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "id",
            "branch_code",
            "branch_name",
            "address",
            "status",
            "created_at",
            "updated_at",
        ]


class OrganizationUnitCompactSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)
    parent_name = serializers.CharField(source="parent.unit_name", read_only=True)

    class Meta:
        model = OrganizationUnit
        fields = [
            "id",
            "unit_code",
            "unit_name",
            "unit_type",
            "parent",
            "parent_name",
            "branch",
            "branch_name",
            "is_ticket_assignable",
            "is_active",
            "sort_order",
        ]


class EmployeeOrganizationMembershipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    organization_unit_name = serializers.CharField(
        source="organization_unit.unit_name",
        read_only=True,
    )
    organization_unit_code = serializers.CharField(
        source="organization_unit.unit_code",
        read_only=True,
    )
    responsibility_label = serializers.CharField(
        source="get_responsibility_display",
        read_only=True,
    )

    class Meta:
        model = EmployeeOrganizationMembership
        fields = [
            "id",
            "employee",
            "employee_name",
            "organization_unit",
            "organization_unit_code",
            "organization_unit_name",
            "responsibility",
            "responsibility_label",
            "is_primary",
            "is_active",
            "joined_at",
            "left_at",
            "created_at",
            "updated_at",
        ]

    @transaction.atomic
    def create(self, validated_data):
        if validated_data.get("is_primary") and validated_data.get("is_active", True):
            EmployeeOrganizationMembership.objects.filter(
                employee=validated_data["employee"],
                is_active=True,
                is_primary=True,
            ).update(is_primary=False)

        validated_data.setdefault("joined_at", timezone.now())
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        employee = validated_data.get("employee", instance.employee)
        is_primary = validated_data.get("is_primary", instance.is_primary)
        is_active = validated_data.get("is_active", instance.is_active)

        if is_primary and is_active:
            EmployeeOrganizationMembership.objects.filter(
                employee=employee,
                is_active=True,
                is_primary=True,
            ).exclude(pk=instance.pk).update(is_primary=False)

        if not is_active and instance.is_active and not validated_data.get("left_at"):
            validated_data["left_at"] = timezone.now()

        return super().update(instance, validated_data)


class EmployeeSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)
    primary_organization_unit = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationUnit.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        write_only=True,
    )
    primary_organization_unit_id = serializers.SerializerMethodField()
    primary_organization_unit_code = serializers.SerializerMethodField()
    primary_organization_unit_name = serializers.SerializerMethodField()
    primary_membership_responsibility = serializers.ChoiceField(
        choices=MembershipResponsibility.choices,
        required=False,
    )
    primary_membership_responsibility_label = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    memberships = EmployeeOrganizationMembershipSerializer(
        source="organization_memberships",
        many=True,
        read_only=True,
    )

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
            "primary_organization_unit",
            "primary_organization_unit_id",
            "primary_organization_unit_code",
            "primary_organization_unit_name",
            "primary_membership_responsibility",
            "primary_membership_responsibility_label",
            "department",
            "memberships",
            "position",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_primary_organization_unit_id(self, obj):
        unit = obj.primary_organization_unit
        return unit.id if unit else None

    def get_primary_organization_unit_code(self, obj):
        unit = obj.primary_organization_unit
        return unit.unit_code if unit else None

    def get_primary_organization_unit_name(self, obj):
        unit = obj.primary_organization_unit
        return unit.unit_name if unit else None

    def get_primary_membership_responsibility_label(self, obj):
        return obj.primary_membership_responsibility_label

    def get_department(self, obj):
        """Tên trường tương thích tạm thời cho frontend cũ."""
        return self.get_primary_organization_unit_name(obj) or ""

    def validate(self, attrs):
        unit_provided = "primary_organization_unit" in attrs
        responsibility_provided = "primary_membership_responsibility" in attrs
        unit = attrs.get("primary_organization_unit")
        responsibility = attrs.get("primary_membership_responsibility")
        branch = attrs.get("branch", getattr(self.instance, "branch", None))

        current_membership = (
            self.instance.get_primary_membership() if self.instance is not None else None
        )
        effective_unit = unit if unit_provided else (
            current_membership.organization_unit if current_membership else None
        )

        if effective_unit and effective_unit.branch_id and branch:
            if effective_unit.branch_id != branch.id:
                raise serializers.ValidationError(
                    {
                        "primary_organization_unit": (
                            "Đơn vị chính phải thuộc cùng chi nhánh với nhân viên "
                            "hoặc là đơn vị toàn hệ thống."
                        )
                    }
                )

        if self.instance is None and unit and not responsibility:
            raise serializers.ValidationError(
                {
                    "primary_membership_responsibility": (
                        "Phải chọn trách nhiệm trong đơn vị khi chọn đơn vị chính."
                    )
                }
            )

        if responsibility_provided and responsibility and not effective_unit:
            raise serializers.ValidationError(
                {
                    "primary_membership_responsibility": (
                        "Không thể chọn trách nhiệm khi nhân viên chưa có đơn vị chính."
                    )
                }
            )

        if (
            self.instance is not None
            and unit_provided
            and unit is not None
            and not responsibility
            and (
                current_membership is None
                or current_membership.organization_unit_id != unit.id
            )
        ):
            raise serializers.ValidationError(
                {
                    "primary_membership_responsibility": (
                        "Phải chọn trách nhiệm khi thay đổi đơn vị chính."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        primary_unit = validated_data.pop("primary_organization_unit", None)
        responsibility = validated_data.pop(
            "primary_membership_responsibility",
            None,
        )
        employee = super().create(validated_data)

        if primary_unit:
            EmployeeOrganizationMembership.objects.create(
                employee=employee,
                organization_unit=primary_unit,
                responsibility=responsibility,
                is_primary=True,
                is_active=True,
                joined_at=timezone.now(),
            )

        return employee

    @transaction.atomic
    def update(self, instance, validated_data):
        primary_unit_provided = "primary_organization_unit" in validated_data
        responsibility_provided = "primary_membership_responsibility" in validated_data
        primary_unit = validated_data.pop("primary_organization_unit", None)
        responsibility = validated_data.pop(
            "primary_membership_responsibility",
            None,
        )
        employee = super().update(instance, validated_data)

        if primary_unit_provided:
            EmployeeOrganizationMembership.objects.filter(
                employee=employee,
                is_active=True,
                is_primary=True,
            ).update(is_primary=False)

            if primary_unit:
                membership = EmployeeOrganizationMembership.objects.filter(
                    employee=employee,
                    organization_unit=primary_unit,
                    is_active=True,
                ).first()

                if membership:
                    membership.is_primary = True
                    if responsibility_provided:
                        membership.responsibility = responsibility
                    update_fields = ["is_primary", "updated_at"]
                    if responsibility_provided:
                        update_fields.append("responsibility")
                    membership.save(update_fields=update_fields)
                else:
                    EmployeeOrganizationMembership.objects.create(
                        employee=employee,
                        organization_unit=primary_unit,
                        responsibility=responsibility,
                        is_primary=True,
                        is_active=True,
                        joined_at=timezone.now(),
                    )

        elif responsibility_provided:
            membership = employee.get_primary_membership()
            if membership:
                membership.responsibility = responsibility
                membership.save(update_fields=["responsibility", "updated_at"])

        return employee


class OrganizationUnitSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)
    parent_name = serializers.CharField(source="parent.unit_name", read_only=True)
    # Alias chỉ đọc cho frontend dùng ProcessingUnit cũ.
    default_branch = serializers.IntegerField(source="branch_id", read_only=True)
    default_branch_name = serializers.CharField(
        source="branch.branch_name",
        read_only=True,
    )
    children = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = OrganizationUnit
        fields = [
            "id",
            "unit_code",
            "unit_name",
            "unit_type",
            "parent",
            "parent_name",
            "branch",
            "branch_name",
            "default_branch",
            "default_branch_name",
            "description",
            "is_ticket_assignable",
            "is_active",
            "sort_order",
            "member_count",
            "children",
            "created_at",
            "updated_at",
        ]

    def get_children(self, obj):
        if not self.context.get("include_children"):
            return []

        children = [child for child in obj.children.all() if child.is_active]
        return OrganizationUnitSerializer(
            children,
            many=True,
            context=self.context,
        ).data


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
        fields = ["id", "source_code", "source_name", "is_active"]


class TicketSupportCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.category_name", read_only=True)

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
            "sort_order",
            "is_active",
        ]


class SlaPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SlaPolicy
        fields = [
            "id",
            "sla_name",
            "description",
            "support_category",
            "classification",
            "priority",
            "organization_unit",
            "branch",
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
