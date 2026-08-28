from django.utils import timezone
from rest_framework import serializers

from apps.customers.models import CustomerAccount, MembershipTier

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


class SaProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaProduct
        fields = "__all__"


class SaSupportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SaSupportCategory
        fields = "__all__"


class SaCallResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaCallResult
        fields = "__all__"


class SaInterestLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaInterestLevel
        fields = "__all__"


class SaIcpGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaIcpGroup
        fields = "__all__"


class SaIcpRuleSerializer(serializers.ModelSerializer):
    call_result_name = serializers.CharField(source="call_result.result_name", read_only=True)
    interest_level_name = serializers.CharField(source="interest_level.level_name", read_only=True)
    icp_group_code = serializers.CharField(source="icp_group.icp_code", read_only=True)
    icp_group_name = serializers.CharField(source="icp_group.icp_name", read_only=True)

    class Meta:
        model = SaIcpRule
        fields = [
            "id",
            "call_result",
            "call_result_name",
            "interest_level",
            "interest_level_name",
            "icp_group",
            "icp_group_code",
            "icp_group_name",
            "priority",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]


class SaRecordAuditLogSerializer(serializers.ModelSerializer):
    # changed_by_user_name = serializers.SerializerMethodField()

    class Meta:
        model = SaRecordAuditLog
        fields = "__all__"

    # def get_changed_by_user_name(self, obj):
    #     if not obj.changed_by_user:
    #         return None

    #     full_name = obj.changed_by_user.get_full_name()
    #     return full_name or obj.changed_by_user.username or obj.changed_by_user.email


class SaRecordReadSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    customer_account_number = serializers.SerializerMethodField()

    branch_name = serializers.SerializerMethodField()

    pic_user_name = serializers.SerializerMethodField()
    pic_employee_name = serializers.SerializerMethodField()

    call_result_name = serializers.CharField(
        source="call_result.result_name",
        read_only=True,
    )
    interest_level_name = serializers.CharField(
        source="interest_level.level_name",
        read_only=True,
    )
    icp_group_code = serializers.CharField(
        source="icp_group.icp_code",
        read_only=True,
    )
    icp_group_name = serializers.CharField(
        source="icp_group.icp_name",
        read_only=True,
    )
    icp_group_type = serializers.CharField(
        source="icp_group.icp_type",
        read_only=True,
    )

    introduced_product_obj_detail = SaProductSerializer(
        source="introduced_product_obj",
        read_only=True,
    )

    support_info_category_obj_detail = SaSupportCategorySerializer(
        source="support_info_category_obj",
        read_only=True,
    )

    created_by_user_name = serializers.SerializerMethodField()
    updated_by_user_name = serializers.SerializerMethodField()
    broker_user_name = serializers.SerializerMethodField()
    broker_employee_name = serializers.SerializerMethodField()



    class Meta:
        model = SaRecord
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["transaction_value_snapshot"] = "0.00"
        data["transaction_fee_snapshot"] = "0.00"
        return data

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else None

    def get_company_name(self, obj):
        return obj.company.company_name if obj.company else None

    def get_customer_account_number(self, obj):
        if not obj.customer_account:
            return None

        return (
            getattr(obj.customer_account, "account_number", None)
            or getattr(obj.customer_account, "account_no", None)
        )

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else None

    def get_pic_user_name(self, obj):
        if not obj.pic_user:
            return None

        emp = getattr(obj.pic_user, "employee", None)
        if emp and getattr(emp, "full_name", None):
            return emp.full_name.strip()

        full_name = obj.pic_user.get_full_name().strip()
        return full_name or obj.pic_user.username or obj.pic_user.email

    def get_pic_employee_name(self, obj):
        if not obj.pic_employee:
            return None

        return (
            getattr(obj.pic_employee, "full_name", None)
            or getattr(obj.pic_employee, "employee_name", None)
            or str(obj.pic_employee)
        )

    def get_created_by_user_name(self, obj):
        if not obj.created_by_user:
            return None

        full_name = obj.created_by_user.get_full_name()
        return full_name or obj.created_by_user.username or obj.created_by_user.email

    def get_updated_by_user_name(self, obj):
        if not obj.updated_by_user:
            return None

        full_name = obj.updated_by_user.get_full_name()
        return full_name or obj.updated_by_user.username or obj.updated_by_user.email

    def get_broker_user_name(self, obj):
        if not obj.broker_user:
            return None

        full_name = obj.broker_user.get_full_name()
        return full_name or obj.broker_user.username or obj.broker_user.email


    def get_broker_employee_name(self, obj):
        if not obj.broker_employee:
            return None

        return (
            getattr(obj.broker_employee, "full_name", None)
            or getattr(obj.broker_employee, "employee_name", None)
            or str(obj.broker_employee)
        )


def get_default_vip_classification(customer):
    membership_tier = getattr(customer, "membership_tier", None)

    return (
        getattr(membership_tier, "tier_name", None)
        or getattr(membership_tier, "tier_code", None)
        or ""
    )


def get_available_account_status_values():
    return set(
        CustomerAccount.objects
        .exclude(account_status__isnull=True)
        .exclude(account_status="")
        .values_list("account_status", flat=True)
    )


def get_available_vip_classification_values():
    tier_values = set(
        MembershipTier.objects
        .filter(is_active=True)
        .values_list("tier_name", flat=True)
    )
    tier_code_values = set(
        MembershipTier.objects
        .filter(is_active=True)
        .values_list("tier_code", flat=True)
    )
    existing_values = set(
        SaRecord.objects
        .exclude(vip_classification__isnull=True)
        .exclude(vip_classification="")
        .values_list("vip_classification", flat=True)
    )

    return {value for value in tier_values | tier_code_values | existing_values if value}


def apply_customer_account_to_sa_record_attrs(attrs, customer_account, instance=None):
    """
    Khóa SA Record theo tài khoản có thật trong CRM.
    Nhân viên chỉ nhập/chọn số TK đã tồn tại trong customer_accounts;
    các trường customer/branch/company được lấy từ DB.

    account_status và vip_classification là snapshot cho SA Record,
    được phép chọn lại từ danh mục DB nếu frontend gửi lên.
    """
    customer = customer_account.customer
    branch = getattr(customer, "branch", None)
    company = getattr(customer, "company", None)

    submitted_account_status = str(attrs.get("account_status") or "").strip()
    submitted_vip_classification = str(attrs.get("vip_classification") or "").strip()

    default_account_status = customer_account.account_status or getattr(customer, "status", "") or ""
    default_vip_classification = get_default_vip_classification(customer)

    attrs["account_no"] = customer_account.account_number
    attrs["customer_account"] = customer_account
    attrs["customer"] = customer
    attrs["company"] = company
    attrs["branch"] = branch

    attrs["customer_name_snapshot"] = customer.full_name
    attrs["branch_name_snapshot"] = (
        getattr(branch, "branch_name", None)
        or getattr(branch, "name", None)
        or ""
    )
    pic_user = attrs.get("pic_user") or (instance.pic_user if instance else None)
    pic_employee = attrs.get("pic_employee") or (instance.pic_employee if instance else None)
    existing_pic_name = getattr(instance, "pic_name_snapshot", "") if instance else ""
    submitted_pic_name = str(attrs.get("pic_name_snapshot") or "").strip()
    default_pic_name = (
        (getattr(pic_employee, "full_name", None) if pic_employee else None)
        or (pic_user.get_full_name() or pic_user.username or pic_user.email if pic_user else None)
        or existing_pic_name
        or ""
    )
    attrs["pic_name_snapshot"] = submitted_pic_name or default_pic_name

    attrs["account_status"] = submitted_account_status or default_account_status
    attrs["vip_classification"] = submitted_vip_classification or default_vip_classification

    return attrs

class SaRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaRecord
        fields = [
            "account_no",

            "customer_name_snapshot",
            "branch_name_snapshot",
            "pic_name_snapshot",
            "account_status",
            "vip_classification",

            "customer_account",
            "customer",
            "company",
            "branch",

            "pic_user",
            "pic_employee",

            "call_date",
            "follow_no",
            "call_result",
            "interest_level",
            "icp_group",

            "reactivation",
            "reactivation_confirmed_at",

            "introduced_product",
            "introduced_product_obj",
            "introduced_product_name",
            "support_info",
            "support_info_category_obj",
            "support_info_category_name",
            "referred_rm",

            "handover_to_broker",
            "broker_user",
            "broker_employee",
            "broker_handover_at",
            "broker_handover_note",

            "transaction_fee_snapshot",
            "transaction_value_snapshot",

            "note",
            "source_system",
            "source_call_id",
            "data_status",
        ]

    def validate_account_no(self, value):
        value = str(value or "").strip().upper()

        if not value:
            raise serializers.ValidationError("Số tài khoản không được để trống.")

        return value

    def validate_follow_no(self, value):
        if value < 1:
            raise serializers.ValidationError("Lần follow phải lớn hơn hoặc bằng 1.")

        return value

    def resolve_customer_account(self, attrs):
        account_no = attrs.get("account_no")
        customer_account = attrs.get("customer_account")

        if not account_no and customer_account:
            account_no = customer_account.account_number

        if not account_no:
            if self.instance and self.instance.customer_account_id:
                return self.instance.customer_account

            raise serializers.ValidationError(
                {"account_no": "Vui lòng chọn số tài khoản có trong hệ thống."}
            )

        resolved = (
            CustomerAccount.objects.select_related(
                "customer",
                "customer__branch",
                "customer__company",
                "customer__membership_tier",
            )
            .filter(account_number__iexact=str(account_no).strip())
            .first()
        )

        if not resolved:
            raise serializers.ValidationError(
                {"account_no": "Số tài khoản không tồn tại trong hệ thống. Vui lòng chọn từ danh sách gợi ý."}
            )

        if customer_account and customer_account.id != resolved.id:
            raise serializers.ValidationError(
                {"customer_account": "Tài khoản đã chọn không khớp với số tài khoản nhập."}
            )

        return resolved

    def validate(self, attrs):
        request = self.context.get("request")

        customer_account = self.resolve_customer_account(attrs)
        attrs = apply_customer_account_to_sa_record_attrs(attrs, customer_account, instance=self.instance)

        account_status = str(attrs.get("account_status") or "").strip()
        vip_classification = str(attrs.get("vip_classification") or "").strip()

        if account_status and account_status not in get_available_account_status_values():
            raise serializers.ValidationError(
                {"account_status": "Trạng thái tài khoản không nằm trong danh mục hệ thống."}
            )

        if vip_classification and vip_classification not in get_available_vip_classification_values():
            raise serializers.ValidationError(
                {"vip_classification": "Phân loại VIP không nằm trong danh mục hệ thống."}
            )

        handover_to_broker = attrs.get("handover_to_broker")
        if handover_to_broker is None and self.instance:
            handover_to_broker = self.instance.handover_to_broker

        referred_rm = attrs.get("referred_rm")
        if referred_rm is None and self.instance:
            referred_rm = self.instance.referred_rm
        referred_rm = bool(referred_rm)
        attrs["referred_rm"] = referred_rm

        if handover_to_broker:
            broker_user = attrs.get("broker_user")
            broker_employee = attrs.get("broker_employee")
            if not broker_user and not broker_employee and self.instance:
                broker_user = self.instance.broker_user
                broker_employee = self.instance.broker_employee

            if not broker_user and not broker_employee:
                raise serializers.ValidationError(
                    {"broker_user": "Vui lòng chọn nhân viên môi giới khi bàn giao."}
                )

            if not attrs.get("broker_handover_at"):
                if self.instance and self.instance.broker_handover_at:
                    attrs["broker_handover_at"] = self.instance.broker_handover_at
                else:
                    attrs["broker_handover_at"] = timezone.now()
        else:
            attrs["broker_user"] = None
            attrs["broker_employee"] = None
            attrs["broker_handover_at"] = None
            attrs["broker_handover_note"] = ""

        account_no = attrs.get("account_no")
        call_date = attrs.get("call_date")
        follow_no = attrs.get("follow_no") or 1

        pic_user = attrs.get("pic_user")

        if not pic_user and request and request.user and request.user.is_authenticated:
            pic_user = request.user

        if account_no and call_date and pic_user:
            queryset = SaRecord.objects.filter(
                account_no=account_no,
                pic_user=pic_user,
                call_date=call_date,
                follow_no=follow_no,
            )

            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)

            if queryset.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "SA Record đã tồn tại cho số tài khoản, PIC, ngày gọi và lần follow này."
                        ]
                    }
                )

        # Xử lý thông tin sản phẩm giới thiệu
        introduced_product_obj = attrs.get("introduced_product_obj")
        introduced_product_name = attrs.get("introduced_product_name")

        if introduced_product_obj:
            attrs["introduced_product"] = True
            attrs["introduced_product_name"] = introduced_product_obj.name
        elif introduced_product_name and str(introduced_product_name).strip():
            attrs["introduced_product"] = True
            p_name = str(introduced_product_name).strip()
            attrs["introduced_product_name"] = p_name
            product_obj, _ = SaProduct.objects.get_or_create(
                name__iexact=p_name,
                defaults={"name": p_name}
            )
            attrs["introduced_product_obj"] = product_obj
        else:
            introduced_flag = attrs.get("introduced_product")
            if introduced_flag is None and self.instance:
                introduced_flag = self.instance.introduced_product
            attrs["introduced_product"] = bool(introduced_flag)
            if not attrs["introduced_product"]:
                attrs["introduced_product_obj"] = None
                attrs["introduced_product_name"] = None

        # Xử lý thông tin danh mục hỗ trợ
        support_category_obj = attrs.get("support_info_category_obj")
        support_category_name = attrs.get("support_info_category_name")

        if support_category_obj:
            attrs["support_info"] = True
            attrs["support_info_category_name"] = support_category_obj.name
        elif support_category_name and str(support_category_name).strip():
            attrs["support_info"] = True
            c_name = str(support_category_name).strip()
            attrs["support_info_category_name"] = c_name
            category_obj, _ = SaSupportCategory.objects.get_or_create(
                name__iexact=c_name,
                defaults={"name": c_name}
            )
            attrs["support_info_category_obj"] = category_obj
        else:
            support_flag = attrs.get("support_info")
            if support_flag is None and self.instance:
                support_flag = self.instance.support_info
            attrs["support_info"] = bool(support_flag)
            if not attrs["support_info"]:
                attrs["support_info_category_obj"] = None
                attrs["support_info_category_name"] = None

        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        if instance.introduced_product_obj_id:
            cnt = SaRecord.objects.filter(introduced_product_obj_id=instance.introduced_product_obj_id).count()
            SaProduct.objects.filter(id=instance.introduced_product_obj_id).update(usage_count=cnt)
        if instance.support_info_category_obj_id:
            cnt = SaRecord.objects.filter(support_info_category_obj_id=instance.support_info_category_obj_id).count()
            SaSupportCategory.objects.filter(id=instance.support_info_category_obj_id).update(usage_count=cnt)
        return instance

    def update(self, instance, validated_data):
        old_prod_id = instance.introduced_product_obj_id
        old_cat_id = instance.support_info_category_obj_id
        instance = super().update(instance, validated_data)
        new_prod_id = instance.introduced_product_obj_id
        new_cat_id = instance.support_info_category_obj_id

        for p_id in {old_prod_id, new_prod_id}:
            if p_id:
                cnt = SaRecord.objects.filter(introduced_product_obj_id=p_id).count()
                SaProduct.objects.filter(id=p_id).update(usage_count=cnt)

        for c_id in {old_cat_id, new_cat_id}:
            if c_id:
                cnt = SaRecord.objects.filter(support_info_category_obj_id=c_id).count()
                SaSupportCategory.objects.filter(id=c_id).update(usage_count=cnt)

        return instance
