from rest_framework import serializers

from apps.failed_ekyc.models import FailedEkycRecord


class FailedEkycRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FailedEkycRecord
        fields = "__all__"
        read_only_fields = ("created_by_user",)

    def get_created_by_name(self, obj):
        user = obj.created_by_user
        if not user:
            return ""
        employee = getattr(user, "employee", None)
        if employee:
            return employee.full_name
        return user.get_full_name() or getattr(user, "username", "") or getattr(user, "email", "")

    def validate(self, attrs):
        account = attrs.get("account_number", getattr(self.instance, "account_number", ""))
        if account:
            attrs["account_number"] = account.strip().upper()
        return attrs
