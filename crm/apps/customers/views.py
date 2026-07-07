from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

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
    permission_classes = [HasActionPermission]
    serializer_class = CompanySerializer

    permission_action_map = {
        "create": "CUSTOMER_CREATE",
        "update": "CUSTOMER_AMEND",
        "partial_update": "CUSTOMER_AMEND",
        "destroy": "CUSTOMER_AMEND",
    }

    def get_queryset(self):
        queryset = Company.objects.select_related(
            "primary_contact",
            "source",
            "rating",
            "membership_tier",
            "assigned_employee",
        ).all().order_by("-id")

        keyword = self.request.query_params.get("q")
        status_value = self.request.query_params.get("status")
        source_id = self.request.query_params.get("source")
        rating_id = self.request.query_params.get("rating")
        membership_tier_id = self.request.query_params.get("membership_tier")

        if keyword:
            queryset = queryset.filter(
                Q(company_code__icontains=keyword)
                | Q(company_name__icontains=keyword)
                | Q(phone__icontains=keyword)
                | Q(email__icontains=keyword)
                | Q(tax_code__icontains=keyword)
                | Q(account_number__icontains=keyword)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        if source_id:
            queryset = queryset.filter(source_id=source_id)

        if rating_id:
            queryset = queryset.filter(rating_id=rating_id)

        if membership_tier_id:
            queryset = queryset.filter(membership_tier_id=membership_tier_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(
            created_by_user=self.request.user,
            updated_by_user=self.request.user,
        )

    def perform_update(self, serializer):
        serializer.save(updated_by_user=self.request.user)

    @action(detail=True, methods=["get"], url_path="contacts")
    def contacts(self, request, pk=None):
        company = self.get_object()

        queryset = Customer.objects.select_related(
            "customer_type",
            "branch",
            "company",
        ).filter(company=company)

        queryset = filter_customers_by_user(queryset, request.user)

        queryset = queryset.filter(
            Q(customer_type__type_code__icontains="CONTACT")
            | Q(customer_type__type_code__icontains="LIEN_HE")
            | Q(customer_type__type_name__icontains="Người liên hệ")
            | Q(customer_type__type_name__icontains="liên hệ")
        )

        keyword = request.query_params.get("q")

        if keyword:
            queryset = queryset.filter(
                Q(full_name__icontains=keyword)
                | Q(phone__icontains=keyword)
                | Q(email__icontains=keyword)
                | Q(customer_code__icontains=keyword)
            )

        serializer = CustomerSerializer(queryset.order_by("full_name"), many=True)
        return Response(serializer.data)


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

        queryset = CustomerAccount.objects.select_related("customer").filter(
            customer_id__in=allowed_customers.values_list("id", flat=True)
        ).order_by("-id")

        account_number = self.request.query_params.get("account_number")

        if account_number:
            queryset = queryset.filter(account_number=account_number)

        return queryset


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