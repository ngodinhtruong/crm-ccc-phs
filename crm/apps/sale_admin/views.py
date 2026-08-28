from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import IntegrityError, transaction
from apps.kpis.permissions import is_kpi_admin, is_sa_supervisor
from apps.sale_admin.models import (
    SaCallResult,
    SaInterestLevel,
    SaIcpGroup,
    SaIcpRule,
    SaProduct,
    SaSupportCategory,
    SaRecord,
    SaRecordAuditLog,
)
from apps.sale_admin.serializers import (
    SaCallResultSerializer,
    SaInterestLevelSerializer,
    SaIcpGroupSerializer,
    SaIcpRuleSerializer,
    SaProductSerializer,
    SaSupportCategorySerializer,
    SaRecordAuditLogSerializer,
    SaRecordReadSerializer,
    SaRecordWriteSerializer,
)
from apps.sale_admin.services import (
    create_sa_record_audit_log,
    generate_sa_record_code,
    serialize_sa_record,
)
from apps.accounts.scopes import filter_sa_records_by_user
from apps.customers.models import CustomerAccount, MembershipTier
from apps.sale_admin.permissions import SaRecordAuditLogPermission, SaRecordPermission
from apps.kpis.realtime import schedule_kpi_recalculation_after_sa_record_change



def build_customer_account_suggestion(account):
    customer = account.customer
    branch = getattr(customer, "branch", None)
    company = getattr(customer, "company", None)
    membership_tier = getattr(customer, "membership_tier", None)

    return {
        "id": account.id,
        "account_number": account.account_number,
        "account_status": account.account_status or "",
        "customer": customer.id if customer else None,
        "customer_name": customer.full_name if customer else "",
        "customer_phone": getattr(customer, "phone", "") or "",
        "customer_email": getattr(customer, "email", "") or "",
        "company": company.id if company else None,
        "company_name": getattr(company, "company_name", "") or "",
        "branch": branch.id if branch else None,
        "branch_name": (
            getattr(branch, "branch_name", None)
            or getattr(branch, "name", None)
            or ""
        ),
        "membership_tier": membership_tier.id if membership_tier else None,
        "membership_tier_name": (
            getattr(membership_tier, "tier_name", None)
            or getattr(membership_tier, "tier_code", None)
            or ""
        ),
    }


class SaCustomerAccountSuggestionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_customer_vip_classification(customer):
        if not customer:
            return ""

        membership_tier = getattr(customer, "membership_tier", None)

        if membership_tier:
            return (
                getattr(membership_tier, "tier_name", None)
                or getattr(membership_tier, "tier_code", None)
                or ""
            )

        return (
            getattr(customer, "vip_type", None)
            or getattr(customer, "vip_classification", None)
            or ""
        )
    def get(self, request):
        raw_keyword = (
            request.query_params.get("q")
            or request.query_params.get("account_number")
            or request.query_params.get("account_no")
            or request.query_params.get("search")
            or ""
        ).strip()
        account_keyword = raw_keyword.upper().replace(" ", "")

        if len(raw_keyword) < 1:
            return Response({"count": 0, "results": []})

        # SA Record yêu cầu số TK phải tồn tại trong hệ thống. Vì vậy endpoint gợi ý
        # tra trực tiếp bảng customer_accounts thay vì lọc theo customer scope.
        # Lý do: nhiều SA/SUP có thể được giao gọi KH ngoài branch đang gán quyền,
        # nếu dùng filter_customers_by_user() thì autocomplete trả rỗng dù tài khoản có thật.
        queryset = (
            CustomerAccount.objects.select_related(
                "customer",
                "customer__branch",
                "customer__company",
                "customer__membership_tier",
            )
            .filter(customer__isnull=False)
            .filter(
                Q(account_number__istartswith=account_keyword)
                | Q(account_number__icontains=account_keyword)
                | Q(customer__full_name__icontains=raw_keyword)
                | Q(customer__phone__icontains=raw_keyword)
            )
            .annotate(
                match_rank=Case(
                    When(account_number__iexact=account_keyword, then=Value(0)),
                    When(account_number__istartswith=account_keyword, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            )
            .order_by("match_rank", "account_number")
        )

        results = [
            build_customer_account_suggestion(account)
            for account in queryset[:20]
        ]

        return Response({"count": queryset.count(), "results": results})


def build_option(value, label=None):
    clean_value = str(value or "").strip()
    return {
        "value": clean_value,
        "label": str(label or clean_value).strip() or clean_value,
    }


class SaAccountStatusOptionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        values = (
            CustomerAccount.objects
            .exclude(account_status__isnull=True)
            .exclude(account_status="")
            .values_list("account_status", flat=True)
            .distinct()
            .order_by("account_status")
        )

        results = [build_option(value) for value in values]

        return Response({"count": len(results), "results": results})


class SaVipClassificationOptionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tier_values = [
            build_option(
                tier.tier_name or tier.tier_code,
                tier.tier_name or tier.tier_code,
            )
            for tier in MembershipTier.objects.filter(is_active=True).order_by("id")
        ]

        existing_values = (
            SaRecord.objects
            .exclude(vip_classification__isnull=True)
            .exclude(vip_classification="")
            .values_list("vip_classification", flat=True)
            .distinct()
            .order_by("vip_classification")
        )

        seen = set()
        results = []
        for option in tier_values + [build_option(value) for value in existing_values]:
            key = option["value"]
            if not key or key in seen:
                continue
            seen.add(key)
            results.append(option)

        return Response({"count": len(results), "results": results})


class SaProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaProductSerializer

    def get_queryset(self):
        qs = SaProduct.objects.filter(is_active=True)
        search = (
            self.request.query_params.get("search")
            or self.request.query_params.get("q")
            or ""
        ).strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("-usage_count", "name", "id")

    def create(self, request, *args, **kwargs):
        name = str(request.data.get("name") or "").strip()
        if not name:
            return Response({"name": ["Tên sản phẩm không được để trống."]}, status=status.HTTP_400_BAD_REQUEST)
        
        product, created = SaProduct.objects.get_or_create(
            name__iexact=name,
            defaults={
                "name": name,
                "code": request.data.get("code") or "",
                "description": request.data.get("description") or "",
                "is_active": True,
            }
        )
        if not created and not product.is_active:
            product.is_active = True
            product.save(update_fields=["is_active", "updated_at"])

        serializer = self.get_serializer(product)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="similar")
    def similar(self, request):
        name = str(request.query_params.get("name") or "").strip()
        if not name:
            return Response([])

        qs = SaProduct.objects.filter(is_active=True).filter(
            Q(name__icontains=name) | Q(name__istartswith=name[:3])
        ).order_by("-usage_count", "name")[:10]

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class SaSupportCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaSupportCategorySerializer

    def get_queryset(self):
        qs = SaSupportCategory.objects.filter(is_active=True)
        search = (
            self.request.query_params.get("search")
            or self.request.query_params.get("q")
            or ""
        ).strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("-usage_count", "name", "id")

    def create(self, request, *args, **kwargs):
        name = str(request.data.get("name") or "").strip()
        if not name:
            return Response({"name": ["Tên danh mục hỗ trợ không được để trống."]}, status=status.HTTP_400_BAD_REQUEST)
        
        category, created = SaSupportCategory.objects.get_or_create(
            name__iexact=name,
            defaults={
                "name": name,
                "code": request.data.get("code") or "",
                "description": request.data.get("description") or "",
                "is_active": True,
            }
        )
        if not created and not category.is_active:
            category.is_active = True
            category.save(update_fields=["is_active", "updated_at"])

        serializer = self.get_serializer(category)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="similar")
    def similar(self, request):
        name = str(request.query_params.get("name") or "").strip()
        if not name:
            return Response([])

        qs = SaSupportCategory.objects.filter(is_active=True).filter(
            Q(name__icontains=name) | Q(name__istartswith=name[:3])
        ).order_by("-usage_count", "name")[:10]

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class SaCallResultViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaCallResultSerializer
    queryset = SaCallResult.objects.filter(is_active=True).order_by("sort_order", "id")


class SaInterestLevelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaInterestLevelSerializer
    queryset = SaInterestLevel.objects.filter(is_active=True).order_by("sort_order", "id")


class SaIcpGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaIcpGroupSerializer

    def get_queryset(self):
        queryset = SaIcpGroup.objects.all().order_by("sort_order", "id")
        if self.action == "list":
            include_inactive = self.request.query_params.get(
                "include_inactive", ""
            ).lower() in ("true", "1")
            if not include_inactive:
                queryset = queryset.filter(is_active=True)
        return queryset

    def perform_destroy(self, instance):
        if instance.sa_records.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active", "updated_at"])
        else:
            instance.delete()


class SaIcpRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaIcpRuleSerializer

    def get_queryset(self):
        queryset = SaIcpRule.objects.select_related(
            "call_result", "interest_level", "icp_group"
        ).order_by("priority", "id")
        if self.action == "list":
            include_inactive = self.request.query_params.get(
                "include_inactive", ""
            ).lower() in ("true", "1")
            if not include_inactive:
                queryset = queryset.filter(is_active=True)
        return queryset


class SaRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [SaRecordPermission]
    
    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return SaRecordReadSerializer

        return SaRecordWriteSerializer

    def get_base_queryset(self):
        return SaRecord.objects.select_related(
            "customer_account",
            "customer",
            "company",
            "branch",
            "pic_user",
            "pic_employee",
            "broker_user",
            "broker_employee",
            "call_result",
            "interest_level",
            "icp_group",
            "created_by_user",
            "updated_by_user",
        ).all()

    def get_user_branch_ids(self):
        user = self.request.user

        branch_ids = set(
            user.branch_accesses.values_list("branch_id", flat=True)
        )

        employee = getattr(user, "employee", None)

        if employee and employee.branch_id:
            branch_ids.add(employee.branch_id)

        return list(branch_ids)

    def get_queryset(self):
        queryset = self.get_base_queryset()
        queryset = filter_sa_records_by_user(queryset, self.request.user)


        q = self.request.query_params.get("q")
        record_code = self.request.query_params.get("record_code")
        account_no = self.request.query_params.get("account_no")
        customer_name = self.request.query_params.get("customer_name")
        branch_name = self.request.query_params.get("branch_name")
        account_status = self.request.query_params.get("account_status")
        vip_classification = self.request.query_params.get("vip_classification")
        pic = self.request.query_params.get("pic")
        follow_no = self.request.query_params.get("follow_no")

        icp_group = self.request.query_params.get("icp_group")
        call_result = self.request.query_params.get("call_result")
        interest_level = self.request.query_params.get("interest_level")

        introduced_product = self.request.query_params.get("introduced_product")
        reactivation = self.request.query_params.get("reactivation")
        support_info = self.request.query_params.get("support_info")
        handover_to_broker = self.request.query_params.get("handover_to_broker")

        transaction_value_min = self.request.query_params.get("transaction_value_min")
        transaction_value_max = self.request.query_params.get("transaction_value_max")
        transaction_fee_min = self.request.query_params.get("transaction_fee_min")
        transaction_fee_max = self.request.query_params.get("transaction_fee_max")

        note = self.request.query_params.get("note")

        call_date_from = self.request.query_params.get("call_date_from")
        call_date_to = self.request.query_params.get("call_date_to")

        if q:
            queryset = queryset.filter(
                Q(record_code__icontains=q)
                | Q(account_no__icontains=q)
                | Q(customer_name_snapshot__icontains=q)
                | Q(customer__full_name__icontains=q)
                | Q(branch_name_snapshot__icontains=q)
                | Q(branch__branch_name__icontains=q)
                | Q(pic_name_snapshot__icontains=q)
                | Q(pic_user__username__icontains=q)
                | Q(pic_user__email__icontains=q)
                | Q(pic_employee__full_name__icontains=q)
                | Q(note__icontains=q)
            )

        if record_code:
            queryset = queryset.filter(record_code__icontains=record_code)

        if account_no:
            queryset = queryset.filter(account_no__icontains=account_no)

        if customer_name:
            queryset = queryset.filter(
                Q(customer_name_snapshot__icontains=customer_name)
                | Q(customer__full_name__icontains=customer_name)
            )

        if branch_name:
            queryset = queryset.filter(
                Q(branch_name_snapshot__icontains=branch_name)
                | Q(branch__branch_name__icontains=branch_name)
            )

        if account_status:
            queryset = queryset.filter(account_status__icontains=account_status)

        if vip_classification:
            queryset = queryset.filter(vip_classification__icontains=vip_classification)

        if pic:
            queryset = queryset.filter(
                Q(pic_name_snapshot__icontains=pic)
                | Q(pic_user__username__icontains=pic)
                | Q(pic_user__email__icontains=pic)
                | Q(pic_employee__full_name__icontains=pic)
            )

        if follow_no:
            queryset = queryset.filter(follow_no=follow_no)

        if icp_group:
            queryset = queryset.filter(icp_group_id=icp_group)

        if call_result:
            queryset = queryset.filter(call_result_id=call_result)

        if interest_level:
            queryset = queryset.filter(interest_level_id=interest_level)

        if introduced_product == "true":
            queryset = queryset.filter(introduced_product=True)

        if introduced_product == "false":
            queryset = queryset.filter(introduced_product=False)

        if reactivation == "true":
            queryset = queryset.filter(reactivation=True)

        if reactivation == "false":
            queryset = queryset.filter(reactivation=False)

        if support_info == "true":
            queryset = queryset.filter(support_info=True)

        if support_info == "false":
            queryset = queryset.filter(support_info=False)

        if handover_to_broker == "true":
            queryset = queryset.filter(
                Q(handover_to_broker=True) | Q(referred_rm=True)
            )

        if handover_to_broker == "false":
            queryset = queryset.filter(
                handover_to_broker=False,
                referred_rm=False,
            )

        if transaction_value_min:
            queryset = queryset.filter(
                transaction_value_snapshot__gte=transaction_value_min
            )

        if transaction_value_max:
            queryset = queryset.filter(
                transaction_value_snapshot__lte=transaction_value_max
            )

        if transaction_fee_min:
            queryset = queryset.filter(
                transaction_fee_snapshot__gte=transaction_fee_min
            )

        if transaction_fee_max:
            queryset = queryset.filter(
                transaction_fee_snapshot__lte=transaction_fee_max
            )

        if note:
            queryset = queryset.filter(note__icontains=note)

        if call_date_from:
            queryset = queryset.filter(call_date__gte=call_date_from)

        if call_date_to:
            queryset = queryset.filter(call_date__lte=call_date_to)

        return queryset.order_by("-call_date", "-id")

    def resolve_branch(self, serializer):
        branch = serializer.validated_data.get("branch")

        if branch:
            return branch

        customer_account = serializer.validated_data.get("customer_account")
        if customer_account and getattr(customer_account, "branch_id", None):
            return customer_account.branch

        customer = serializer.validated_data.get("customer")
        if customer and getattr(customer, "branch_id", None):
            return customer.branch

        user = self.request.user
        employee = getattr(user, "employee", None)

        if employee and getattr(employee, "branch_id", None):
            return employee.branch

        return None

    def resolve_pic_employee(self, pic_user):
        if not pic_user:
            return None

        return getattr(pic_user, "employee", None)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if is_sa_supervisor(request.user) and not is_kpi_admin(request.user) and not request.user.is_superuser:
            raise PermissionDenied("Chỉ nhân viên SA mới có quyền ghi nhận cuộc gọi.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pic_user = serializer.validated_data.get("pic_user") or request.user
        pic_employee = (
            serializer.validated_data.get("pic_employee")
            or self.resolve_pic_employee(pic_user)
        )
        branch = self.resolve_branch(serializer)

        try:
            record = serializer.save(
                record_code=generate_sa_record_code(),
                pic_user=pic_user,
                pic_employee=pic_employee,
                branch=branch,
                created_by_user=request.user,
                updated_by_user=request.user,
            )
        except IntegrityError:
            return Response(
                {
                    "non_field_errors": [
                        "SA Record bị trùng dữ liệu. Vui lòng kiểm tra lại số tài khoản, PIC, ngày gọi và lần follow."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
    )

        new_data = serialize_sa_record(record)

        create_sa_record_audit_log(
            sa_record=record,
            action_type=SaRecordAuditLog.ACTION_CREATE,
            changed_by_user=request.user,
            old_data=None,
            new_data=new_data,
        )

        schedule_kpi_recalculation_after_sa_record_change(
            record_id=record.id,
            changed_by_user_id=request.user.id,
        )

        read_serializer = SaRecordReadSerializer(record)

        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        old_data = serialize_sa_record(instance)
        previous_pic_user_id = instance.pic_user_id
        previous_call_date = instance.call_date

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)

        pic_user = serializer.validated_data.get("pic_user", instance.pic_user)
        pic_employee = serializer.validated_data.get("pic_employee", instance.pic_employee)

        if pic_user and not pic_employee:
            pic_employee = self.resolve_pic_employee(pic_user)

        branch = serializer.validated_data.get("branch", instance.branch)

        record = serializer.save(
            pic_employee=pic_employee,
            branch=branch,
            updated_by_user=request.user,
        )

        new_data = serialize_sa_record(record)

        create_sa_record_audit_log(
            sa_record=record,
            action_type=SaRecordAuditLog.ACTION_UPDATE,
            changed_by_user=request.user,
            old_data=old_data,
            new_data=new_data,
        )

        schedule_kpi_recalculation_after_sa_record_change(
            record_id=record.id,
            previous_pic_user_id=previous_pic_user_id,
            previous_call_date=previous_call_date,
            changed_by_user_id=request.user.id,
        )

        read_serializer = SaRecordReadSerializer(record)

        return Response(read_serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        old_data = serialize_sa_record(instance)
        previous_pic_user_id = instance.pic_user_id
        previous_call_date = instance.call_date

        create_sa_record_audit_log(
            sa_record=instance,
            action_type=SaRecordAuditLog.ACTION_DELETE,
            changed_by_user=request.user,
            old_data=old_data,
            new_data=None,
        )

        response = super().destroy(request, *args, **kwargs)

        schedule_kpi_recalculation_after_sa_record_change(
            previous_pic_user_id=previous_pic_user_id,
            previous_call_date=previous_call_date,
            changed_by_user_id=request.user.id,
        )

        return response


class SaRecordAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [SaRecordAuditLogPermission]
    serializer_class = SaRecordAuditLogSerializer

    def get_queryset(self):
        queryset = SaRecordAuditLog.objects.select_related(
            "sa_record",
            "changed_by_user",
            "sa_record__branch",
            "sa_record__pic_user",
            "sa_record__pic_employee",
        ).all()

        accessible_records = filter_sa_records_by_user(
            SaRecord.objects.all(),
            self.request.user,
        ).values_list("id", flat=True)

        queryset = queryset.filter(sa_record_id__in=accessible_records)

        sa_record = self.request.query_params.get("sa_record")

        if sa_record:
            queryset = queryset.filter(sa_record_id=sa_record)

        return queryset.order_by("-changed_at", "-id")