from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import Permission, Role, RolePermission, UserBranchAccess, UserRole
from apps.branches.models import Branch, Employee


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "employee",
            "employee_name",
            "status",
            "is_active",
            "is_staff",
            "is_superuser",
            "password",
        ]
        read_only_fields = ["is_superuser"]

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else None

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        user = User(**validated_data)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "role_code", "role_name", "scope_type", "created_at", "updated_at"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = [
            "id",
            "permission_code",
            "permission_name",
            "module_code",
            "action_code",
            "is_active",
        ]


class UserRoleSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = UserRole
        fields = ["id", "user", "username", "role", "role_name", "created_at"]

    def get_username(self, obj):
        return obj.user.username if obj.user else None

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None


class RolePermissionSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    permission_code = serializers.SerializerMethodField()
    permission_name = serializers.SerializerMethodField()

    class Meta:
        model = RolePermission
        fields = [
            "id",
            "role",
            "role_name",
            "permission",
            "permission_code",
            "permission_name",
            "created_at",
        ]

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None

    def get_permission_code(self, obj):
        return obj.permission.permission_code if obj.permission else None

    def get_permission_name(self, obj):
        return obj.permission.permission_name if obj.permission else None


class UserBranchAccessSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = UserBranchAccess
        fields = ["id", "user", "username", "branch", "branch_name", "created_at"]

    def get_username(self, obj):
        return obj.user.username if obj.user else None

    def get_branch_name(self, obj):
        return obj.branch.branch_name if obj.branch else None


class SetUserRolesSerializer(serializers.Serializer):
    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )


class SetRolePermissionsSerializer(serializers.Serializer):
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )


class SetUserBranchesSerializer(serializers.Serializer):
    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )