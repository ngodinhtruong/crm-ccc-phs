from rest_framework import serializers

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
        value = str(value or "").strip()

        if not value:
            raise serializers.ValidationError("Số tài khoản không được để trống.")

        return value

    def validate_follow_no(self, value):
        if value < 1:
            raise serializers.ValidationError("Lần follow phải lớn hơn hoặc bằng 1.")

        return value
    
    def validate(self, attrs):
        request = self.context.get("request")

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