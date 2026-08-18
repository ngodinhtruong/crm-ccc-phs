import re

from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.customers.models import (
    Company,
    Customer,
    CustomerAccount,
    CustomerEmployeeAssignment,
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)

User = get_user_model()


class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = "__all__"


class CompanySerializer(serializers.ModelSerializer):
    primary_contact_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    rating_name = serializers.SerializerMethodField()
    membership_tier_name = serializers.SerializerMethodField()
    assigned_employee_name = serializers.SerializerMethodField()
    opened_at_display = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"

    def get_primary_contact_name(self, obj):
        primary_contact = getattr(obj, "primary_contact", None)
        return primary_contact.full_name if primary_contact else ""

    def get_source_name(self, obj):
        source = getattr(obj, "source", None)
        return source.source_name if source else ""

    def get_rating_name(self, obj):
        rating = getattr(obj, "rating", None)
        return rating.rating_name if rating else ""

    def get_membership_tier_name(self, obj):
        membership_tier = getattr(obj, "membership_tier", None)
        return membership_tier.tier_name if membership_tier else ""

    def get_assigned_employee_name(self, obj):
        assigned_employee = getattr(obj, "assigned_employee", None)
        return assigned_employee.full_name if assigned_employee else ""

    def get_opened_at_display(self, obj):
        opened_at = getattr(obj, "opened_at", None)

        if not opened_at:
            return ""

        return opened_at.strftime("%d-%m-%Y")

    def get_status_label(self, obj):
        status = getattr(obj, "status", "")

        if status == "ACTIVE":
            return "Đang hoạt động"

        if status == "INACTIVE":
            return "Ngừng hoạt động"

        return status or ""

    def validate_account_number(self, value):
        if not value:
            return value

        if not re.fullmatch(r"[A-Za-z0-9]{10}", value):
            raise serializers.ValidationError(
                "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số."
            )

        queryset = Company.objects.filter(account_number=value)

        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError("Số tài khoản công ty này đã tồn tại.")

        return value

    def validate(self, attrs):
        primary_contact = attrs.get(
            "primary_contact",
            getattr(self.instance, "primary_contact", None),
        )

        if primary_contact and self.instance:
            if primary_contact.company_id and primary_contact.company_id != self.instance.id:
                raise serializers.ValidationError(
                    {
                        "primary_contact": (
                            "Người liên hệ chính phải là khách hàng/người liên hệ "
                            "thuộc đúng công ty này."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        primary_contact = validated_data.get("primary_contact")
        company = super().create(validated_data)

        if primary_contact and primary_contact.company_id != company.id:
            primary_contact.company = company
            primary_contact.save(update_fields=["company"])

        return company


class CustomerSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerSource
        fields = "__all__"


class CustomerRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerRating
        fields = "__all__"


class MembershipTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipTier
        fields = "__all__"


class CustomerSerializer(serializers.ModelSerializer):
    branch_name = serializers.SerializerMethodField()
    customer_type_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    rating_name = serializers.SerializerMethodField()
    membership_tier_name = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    opened_account_date = serializers.SerializerMethodField()
    assigned_employee_name = serializers.SerializerMethodField()
    vip_type = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    birth_date_display = serializers.SerializerMethodField()
    description_display = serializers.SerializerMethodField()

    # Nhân viên phụ trách không phải cột của Customer — nó nằm ở bảng
    # CustomerEmployeeAssignment. Nhận id User ở đây rồi tự map sang Employee.
    assigned_employee = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Customer
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)

        account_number = data.get("account_number")
        is_linked = bool(
            account_number
            and str(account_number).strip().upper()
            not in ["", "-", "N/A", "KHÔNG CÓ", "NULL", "UNDEFINED"]
        )

        if is_linked:
            data["phone"] = None
            data["email"] = None

        # Mask sensitive PII and remove hidden fields from API responses
        data["identity_number"] = None
        data["date_of_birth"] = None
        data["birth_date_display"] = ""
        data["customer_type_name"] = ""
        data["address"] = None
        data["ward"] = None
        data["district"] = None
        data["province"] = None
        data["country"] = None
        data["source_name"] = ""
        data["customer_code"] = ""
        data["external_customer_id"] = ""

        return data

    def create(self, validated_data):
        assigned_user_id = validated_data.pop("assigned_employee", None)
        customer = super().create(validated_data)

        if assigned_user_id:
            self._assign_employee(customer, assigned_user_id)

        return customer

    def update(self, instance, validated_data):
        assigned_user_id = validated_data.pop("assigned_employee", None)
        customer = super().update(instance, validated_data)

        if assigned_user_id:
            self._assign_employee(customer, assigned_user_id)

        return customer

    def _assign_employee(self, customer, user_id):
        """Gán nhân viên phụ trách: nhận id User → tra ra Employee → ghi assignment."""
        user = User.objects.filter(pk=user_id).select_related("employee").first()
        employee = getattr(user, "employee", None) if user else None

        if not employee:
            return

        request = self.context.get("request")
        now = timezone.now()

        # Đóng phân công cũ để mỗi khách chỉ có một người phụ trách hiện hành
        CustomerEmployeeAssignment.objects.filter(
            customer=customer,
            is_current=True,
        ).exclude(employee=employee).update(is_current=False, unassigned_at=now)

        CustomerEmployeeAssignment.objects.update_or_create(
            customer=customer,
            employee=employee,
            defaults={
                "role_type": "BROKER",
                "is_current": True,
                "assigned_at": now,
                "assigned_by_user": getattr(request, "user", None),
                "created_at": now,
                "updated_at": now,
            },
        )

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else ""

    def get_customer_type_name(self, obj):
        return obj.customer_type.type_name if obj.customer_type else ""

    def get_company_name(self, obj):
        return obj.company.company_name if obj.company else ""

    def get_source_name(self, obj):
        return obj.source.source_name if obj.source else ""

    def get_rating_name(self, obj):
        return obj.rating.rating_name if obj.rating else ""

    def get_membership_tier_name(self, obj):
        return obj.membership_tier.tier_name if obj.membership_tier else ""

    def get_account_number(self, obj):
        account = (
            CustomerAccount.objects.filter(customer=obj)
            .order_by("id")
            .first()
        )

        return account.account_number if account else ""

    def get_opened_account_date(self, obj):
        account = (
            CustomerAccount.objects.filter(customer=obj)
            .order_by("id")
            .first()
        )

        value = None

        if account:
            value = getattr(account, "opened_at", None) or getattr(
                account,
                "created_at",
                None,
            )

        if not value:
            value = getattr(obj, "created_at", None)

        if not value:
            return ""

        return value.strftime("%d-%m-%Y")

    def get_assigned_employee_name(self, obj):
        assignment = (
            CustomerEmployeeAssignment.objects.filter(
                customer=obj,
                is_current=True,
            )
            .select_related("employee")
            .order_by("-id")
            .first()
        )

        if assignment and assignment.employee:
            return assignment.employee.full_name

        return ""

    def get_vip_type(self, obj):
        if obj.membership_tier:
            return obj.membership_tier.tier_name

        if obj.rating:
            return obj.rating.rating_name

        return "Khách thường"

    def get_status_label(self, obj):
        status = getattr(obj, "status", "")

        if status == "ACTIVE":
            return "Chính thức"

        if status == "INACTIVE":
            return "Ngừng hoạt động"

        if status == "POTENTIAL":
            return "Tiềm năng"

        return status or ""

    def get_birth_date_display(self, obj):
        value = (
            getattr(obj, "birth_date", None)
            or getattr(obj, "date_of_birth", None)
            or getattr(obj, "dob", None)
        )

        if not value:
            return ""

        return value.strftime("%d-%m-%Y")

    def get_description_display(self, obj):
        return (
            getattr(obj, "description", "")
            or getattr(obj, "note", "")
            or getattr(obj, "address", "")
            or ""
        )


class CustomerAccountSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerAccount
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else ""

    def validate_account_number(self, value):
        if not value:
            raise serializers.ValidationError("Số tài khoản không được để trống.")

        if not re.fullmatch(r"[A-Za-z0-9]{10}", value):
            raise serializers.ValidationError(
                "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số."
            )

        queryset = CustomerAccount.objects.filter(account_number=value)

        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)

        if queryset.exists():
            raise serializers.ValidationError("Số tài khoản này đã tồn tại.")

        return value


class CustomerEmployeeAssignmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerEmployeeAssignment
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else ""

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else ""