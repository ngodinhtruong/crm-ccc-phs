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
    customer_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ["created_by_user", "updated_by_user"]

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else None

    def get_customer_type_name(self, obj):
        return obj.customer_type.type_name if obj.customer_type else None


class CustomerAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAccount
        fields = "__all__"


class CustomerEmployeeAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerEmployeeAssignment
        fields = "__all__"