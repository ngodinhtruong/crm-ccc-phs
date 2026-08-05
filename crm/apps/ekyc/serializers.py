from rest_framework import serializers
from apps.ekyc.models import EkycRecord


class EkycRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EkycRecord
        fields = [
            "id",
            "customer",
            "customer_account",
            "account_number",
            "customer_name",
            "branch_name",
            "manager_name",
            "phone",
            "call_date",
            "follow_count",
            "call_status",
            "call_result",
            "note",
            "pic",
            "created_by_user",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by_user:
            return ""
        if hasattr(obj.created_by_user, "employee") and obj.created_by_user.employee:
            return obj.created_by_user.employee.full_name
        return (
            getattr(obj.created_by_user, "first_name", "") + " " + getattr(obj.created_by_user, "last_name", "")
        ).strip() or getattr(obj.created_by_user, "username", "") or getattr(obj.created_by_user, "email", "")


class EkycRecordCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EkycRecord
        fields = [
            "id",
            "customer",
            "customer_account",
            "account_number",
            "customer_name",
            "branch_name",
            "manager_name",
            "phone",
            "call_date",
            "follow_count",
            "call_status",
            "call_result",
            "note",
            "pic",
        ]

    def validate_account_number(self, value):
        if not value:
            raise serializers.ValidationError("Vui lòng nhập hoặc chọn Số TK lưu kí.")
        return value.strip().upper()
