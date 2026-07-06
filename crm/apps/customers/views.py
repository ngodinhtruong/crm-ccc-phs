from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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
from apps.customers.serializers import (
    CompanySerializer,
    CustomerAccountSerializer,
    CustomerEmployeeAssignmentSerializer,
    CustomerRatingSerializer,
    CustomerSerializer,
    CustomerSourceSerializer,
    CustomerTypeSerializer,
    MembershipTierSerializer,
)

from django.db.models import Q

from apps.accounts.api_permissions import HasActionPermission, MasterDataPermission
from apps.accounts.scopes import filter_customers_by_user

class CustomerTypeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerTypeSerializer
    queryset = CustomerType.objects.all().order_by("id")


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    queryset = Company.objects.all().order_by("id")


class CustomerSourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerSourceSerializer
    queryset = CustomerSource.objects.all().order_by("id")


class CustomerRatingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerRatingSerializer
    queryset = CustomerRating.objects.all().order_by("id")


class MembershipTierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MembershipTierSerializer
    queryset = MembershipTier.objects.all().order_by("id")


class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = CustomerSerializer

    permission_action_map = {
        "create": "CUSTOMER_CREATE",
        "update": "CUSTOMER_AMEND",
        "partial_update": "CUSTOMER_AMEND",
        "destroy": "CUSTOMER_AMEND",
    }

    def get_queryset(self):
        queryset = Customer.objects.select_related(
            "branch",
            "customer_type",
            "company",
            "source",
            "rating",
            "membership_tier",
        ).all().order_by("-id")

        queryset = filter_customers_by_user(queryset, self.request.user)

        keyword = self.request.query_params.get("q")
        branch_id = self.request.query_params.get("branch")
        customer_type_id = self.request.query_params.get("customer_type")
        phone = self.request.query_params.get("phone")
        status_value = self.request.query_params.get("status")

        if keyword:
            queryset = queryset.filter(
                Q(customer_code__icontains=keyword)
                | Q(full_name__icontains=keyword)
                | Q(phone__icontains=keyword)
                | Q(email__icontains=keyword)
                | Q(identity_number__icontains=keyword)
            )

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        if customer_type_id:
            queryset = queryset.filter(customer_type_id=customer_type_id)

        if phone:
            queryset = queryset.filter(phone__icontains=phone)

        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            created_by_user=self.request.user,
            updated_by_user=self.request.user,
        )

    def perform_update(self, serializer):
        serializer.save(updated_by_user=self.request.user)


class CustomerAccountViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = CustomerAccountSerializer

    permission_action_map = {
        "create": "CUSTOMER_CREATE",
        "update": "CUSTOMER_AMEND",
        "partial_update": "CUSTOMER_AMEND",
        "destroy": "CUSTOMER_AMEND",
    }

    def get_queryset(self):
        allowed_customers = filter_customers_by_user(
            Customer.objects.all(),
            self.request.user,
        )

        return CustomerAccount.objects.select_related("customer").filter(
            customer_id__in=allowed_customers.values_list("id", flat=True)
        ).order_by("-id")


class CustomerEmployeeAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [HasActionPermission]
    serializer_class = CustomerEmployeeAssignmentSerializer

    permission_action_map = {
        "create": "CUSTOMER_AMEND",
        "update": "CUSTOMER_AMEND",
        "partial_update": "CUSTOMER_AMEND",
        "destroy": "CUSTOMER_AMEND",
    }

    def get_queryset(self):
        allowed_customers = filter_customers_by_user(
            Customer.objects.all(),
            self.request.user,
        )

        return CustomerEmployeeAssignment.objects.select_related(
            "customer",
            "employee",
        ).filter(
            customer_id__in=allowed_customers.values_list("id", flat=True)
        ).order_by("-id")