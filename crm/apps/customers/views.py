from rest_framework import viewsets
from rest_framework.response import Response
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
from apps.accounts.scopes import (
    filter_companies_by_user,
    filter_customers_by_user,
)
from apps.common.constants import PermissionCode
from apps.customers.insight_360 import build_customer_360

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
        ).all()

        # Company không có cột branch nên phải lọc gián tiếp qua khách hàng,
        # nếu không mọi user đều xem được toàn bộ công ty (gồm cả MST, số TK).
        queryset = filter_companies_by_user(queryset, self.request.user)

        params = self.request.query_params

        q = params.get("q")

        company_code = params.get("company_code")
        company_name = params.get("company_name")
        phone = params.get("phone")
        email = params.get("email")
        website = params.get("website")
        fax = params.get("fax")
        tax_code = params.get("tax_code")
        account_number = params.get("account_number")

        opened_at_from = params.get("opened_at_from")
        opened_at_to = params.get("opened_at_to")

        primary_contact = params.get("primary_contact")
        primary_contact_name = params.get("primary_contact_name")

        source = params.get("source")
        source_name = params.get("source_name")

        rating = params.get("rating")
        rating_name = params.get("rating_name")

        membership_tier = params.get("membership_tier")
        membership_tier_name = params.get("membership_tier_name")

        assigned_employee = params.get("assigned_employee")
        assigned_employee_name = params.get("assigned_employee_name")

        address = params.get("address")
        status_value = params.get("status")

        if q:
            queryset = queryset.filter(
                Q(company_code__icontains=q)
                | Q(company_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(email__icontains=q)
                | Q(website__icontains=q)
                | Q(fax__icontains=q)
                | Q(tax_code__icontains=q)
                | Q(account_number__icontains=q)
                | Q(primary_contact__full_name__icontains=q)
                | Q(source__source_name__icontains=q)
                | Q(rating__rating_name__icontains=q)
                | Q(membership_tier__tier_name__icontains=q)
                | Q(assigned_employee__full_name__icontains=q)
                | Q(address__icontains=q)
                | Q(country__icontains=q)
                | Q(province__icontains=q)
                | Q(district__icontains=q)
                | Q(ward__icontains=q)
                | Q(description__icontains=q)
            )

        if company_code:
            queryset = queryset.filter(company_code__icontains=company_code)

        if company_name:
            queryset = queryset.filter(company_name__icontains=company_name)

        if phone:
            queryset = queryset.filter(phone__icontains=phone)

        if email:
            queryset = queryset.filter(email__icontains=email)

        if website:
            queryset = queryset.filter(website__icontains=website)

        if fax:
            queryset = queryset.filter(fax__icontains=fax)

        if tax_code:
            queryset = queryset.filter(tax_code__icontains=tax_code)

        if account_number:
            queryset = queryset.filter(account_number__icontains=account_number)

        if opened_at_from:
            queryset = queryset.filter(opened_at__gte=opened_at_from)

        if opened_at_to:
            queryset = queryset.filter(opened_at__lte=opened_at_to)

        if primary_contact:
            queryset = queryset.filter(primary_contact_id=primary_contact)

        if primary_contact_name:
            queryset = queryset.filter(
                primary_contact__full_name__icontains=primary_contact_name
            )

        if source:
            queryset = queryset.filter(source_id=source)

        if source_name:
            queryset = queryset.filter(source__source_name__icontains=source_name)

        if rating:
            queryset = queryset.filter(rating_id=rating)

        if rating_name:
            queryset = queryset.filter(rating__rating_name__icontains=rating_name)

        if membership_tier:
            queryset = queryset.filter(membership_tier_id=membership_tier)

        if membership_tier_name:
            queryset = queryset.filter(
                membership_tier__tier_name__icontains=membership_tier_name
            )

        if assigned_employee:
            queryset = queryset.filter(assigned_employee_id=assigned_employee)

        if assigned_employee_name:
            queryset = queryset.filter(
                assigned_employee__full_name__icontains=assigned_employee_name
            )

        if address:
            queryset = queryset.filter(
                Q(address__icontains=address)
                | Q(country__icontains=address)
                | Q(province__icontains=address)
                | Q(district__icontains=address)
                | Q(ward__icontains=address)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset.order_by("-id")

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
        # Màn 360 gộp cả giao dịch, cuộc gọi và điểm khảo sát của khách nên
        # phải có quyền riêng, không dùng chung quyền xem hồ sơ khách.
        "insight_360": PermissionCode.CUSTOMER_360_VIEW,
    }

    def get_queryset(self):
        

        queryset = Customer.objects.select_related(
            "branch",
            "customer_type",
            "company",
            "source",
            "rating",
            "membership_tier",
        ).prefetch_related(
            "accounts",
            "employee_assignments__employee",
        ).all()

        queryset = filter_customers_by_user(queryset, self.request.user)

        params = self.request.query_params

        q = params.get("q")


        opened_account_from = params.get("opened_account_from")
        opened_account_to = params.get("opened_account_to")
        description = params.get("description")
        
        customer_code = params.get("customer_code")
        external_customer_id = params.get("external_customer_id")
        full_name = params.get("full_name")
        phone = params.get("phone")
        email = params.get("email")
        identity_number = params.get("identity_number")

        branch = params.get("branch")
        branch_name = params.get("branch_name")

        customer_type = params.get("customer_type")
        customer_type_name = params.get("customer_type_name")

        company = params.get("company")
        company_name = params.get("company_name")

        source = params.get("source")
        source_name = params.get("source_name")

        rating = params.get("rating")
        rating_name = params.get("rating_name")

        membership_tier = params.get("membership_tier")
        membership_tier_name = params.get("membership_tier_name")

        account_number = params.get("account_number")
        assigned_employee_name = params.get("assigned_employee_name")
        vip_type = params.get("vip_type")

        status_value = params.get("status")

        date_of_birth_from = params.get("date_of_birth_from")
        date_of_birth_to = params.get("date_of_birth_to")

        created_from = params.get("created_from")
        created_to = params.get("created_to")

        if q:
            queryset = queryset.filter(
                Q(customer_code__icontains=q)
                | Q(external_customer_id__icontains=q)
                | Q(full_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(email__icontains=q)
                | Q(identity_number__icontains=q)
                | Q(description__icontains=q)
                | Q(address__icontains=q)
                | Q(branch__branch_name__icontains=q)
                | Q(customer_type__type_name__icontains=q)
                | Q(company__company_name__icontains=q)
                | Q(source__source_name__icontains=q)
                | Q(rating__rating_name__icontains=q)
                | Q(membership_tier__tier_name__icontains=q)
                | Q(accounts__account_number__icontains=q)
                | Q(employee_assignments__employee__full_name__icontains=q)
            )

        if customer_code:
            queryset = queryset.filter(customer_code__icontains=customer_code)

        if external_customer_id:
            queryset = queryset.filter(
                external_customer_id__icontains=external_customer_id
            )

        if full_name:
            queryset = queryset.filter(full_name__icontains=full_name)

        if phone:
            queryset = queryset.filter(phone__icontains=phone)

        if email:
            queryset = queryset.filter(email__icontains=email)

        if identity_number:
            queryset = queryset.filter(identity_number__icontains=identity_number)

        if branch:
            queryset = queryset.filter(branch_id=branch)

        if branch_name:
            queryset = queryset.filter(branch__branch_name__icontains=branch_name)

        if customer_type:
            queryset = queryset.filter(customer_type_id=customer_type)

        if customer_type_name:
            queryset = queryset.filter(customer_type__type_name__icontains=customer_type_name)

        if company:
            queryset = queryset.filter(company_id=company)

        if company_name:
            queryset = queryset.filter(company__company_name__icontains=company_name)

        if source:
            queryset = queryset.filter(source_id=source)

        if source_name:
            queryset = queryset.filter(source__source_name__icontains=source_name)

        if rating:
            queryset = queryset.filter(rating_id=rating)

        if rating_name:
            queryset = queryset.filter(rating__rating_name__icontains=rating_name)

        if membership_tier:
            queryset = queryset.filter(membership_tier_id=membership_tier)

        if membership_tier_name:
            queryset = queryset.filter(
                membership_tier__tier_name__icontains=membership_tier_name
            )

        if account_number:
            queryset = queryset.filter(accounts__account_number__icontains=account_number)


        if opened_account_from:
            queryset = queryset.filter(accounts__opened_at__gte=opened_account_from)

        if opened_account_to:
            queryset = queryset.filter(accounts__opened_at__lte=opened_account_to)

        if description:
            queryset = queryset.filter(
                Q(description__icontains=description)
                | Q(address__icontains=description)
            )
            
        if assigned_employee_name:
            queryset = queryset.filter(
                employee_assignments__is_current=True,
                employee_assignments__employee__full_name__icontains=assigned_employee_name,
            )

        if vip_type:
            queryset = queryset.filter(
                Q(membership_tier__tier_name__icontains=vip_type)
                | Q(rating__rating_name__icontains=vip_type)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        if date_of_birth_from:
            queryset = queryset.filter(date_of_birth__gte=date_of_birth_from)

        if date_of_birth_to:
            queryset = queryset.filter(date_of_birth__lte=date_of_birth_to)

        if created_from:
            queryset = queryset.filter(created_at__date__gte=created_from)

        if created_to:
            queryset = queryset.filter(created_at__date__lte=created_to)

        return queryset.distinct().order_by("-id")

    def perform_create(self, serializer):
        serializer.save(
            created_by_user=self.request.user,
            updated_by_user=self.request.user,
        )

    def perform_update(self, serializer):
        serializer.save(updated_by_user=self.request.user)

    @action(detail=True, methods=["get"], url_path="insight-360")
    def insight_360(self, request, pk=None):
        """
        Số liệu tổng hợp cho màn Customer 360.

        Dùng ``get_object()`` chứ không truy thẳng theo pk: hàm đó đã chạy qua
        ``get_queryset()``, tức đã lọc theo phạm vi dữ liệu của người dùng, nên
        khách ngoài phạm vi trả 404 thay vì lộ số liệu.
        """
        return Response(build_customer_360(self.get_object()))


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