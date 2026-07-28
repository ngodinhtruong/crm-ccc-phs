from django.utils import timezone
from rest_framework import serializers

from apps.customers.models import CustomerAccount, MembershipTier

from apps.sale_admin.models import (
    SaCallResult,
    SaInterestLevel,
    SaIcpGroup,
    SaRecord,
    SaRecordAuditLog,
)


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

    created_by_user_name = serializers.SerializerMethodField()
    updated_by_user_name = serializers.SerializerMethodField()
    broker_user_name = serializers.SerializerMethodField()
    broker_employee_name = serializers.SerializerMethodField()



    class Meta:
        model = SaRecord
        fields = "__all__"

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

        full_name = obj.pic_user.get_full_name()
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


def apply_customer_account_to_sa_record_attrs(attrs, customer_account):
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
            "support_info",
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
        attrs = apply_customer_account_to_sa_record_attrs(attrs, customer_account)

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

        attrs["referred_rm"] = bool(handover_to_broker)

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

        return attrs
