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


class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = "__all__"


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"


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

    class Meta:
        model = Customer
        fields = "__all__"

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else ""

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
            value = getattr(account, "opened_at", None) or getattr(account, "created_at", None)

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
    class Meta:
        model = CustomerEmployeeAssignment
        fields = "__all__"