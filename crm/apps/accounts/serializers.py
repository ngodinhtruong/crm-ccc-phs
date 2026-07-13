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
    employee_code = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    role_names = serializers.SerializerMethodField()
    role_codes = serializers.SerializerMethodField()

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
            "employee_code",
            "branch_name",
            "department",
            "position",
            "role_names",
            "role_codes",
            "status",
            "is_active",
            "is_staff",
            "is_superuser",
            "password",
        ]
        read_only_fields = ["is_superuser"]

    def get_employee_name(self, obj):
        return obj.employee.full_name if obj.employee else ""

    def get_employee_code(self, obj):
        return obj.employee.employee_code if obj.employee else ""

    def get_branch_name(self, obj):
        if obj.employee and obj.employee.branch:
            return obj.employee.branch.branch_name
        return ""

    def get_department(self, obj):
        return obj.employee.department if obj.employee else ""

    def get_position(self, obj):
        return obj.employee.position if obj.employee else ""

    def get_role_names(self, obj):
        return list(
            UserRole.objects.filter(user=obj)
            .select_related("role")
            .values_list("role__role_name", flat=True)
        )

    def get_role_codes(self, obj):
        return list(
            UserRole.objects.filter(user=obj)
            .select_related("role")
            .values_list("role__role_code", flat=True)
        )

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
        fields = [
            "id",
            "role_code",
            "role_name",
            "scope_type",
            "group_code",
            "created_at",
            "updated_at",
        ]


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


class CurrentUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    accessible_groups = serializers.SerializerMethodField()
    default_group = serializers.SerializerMethodField()
    is_global_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "employee",
            "status",
            "roles",
            "permissions",
            "accessible_groups",
            "default_group",
            "is_global_admin",
        ]

    def get_roles(self, obj):
        return [
            {
                "id": user_role.role.id,
                "role_code": user_role.role.role_code,
                "role_name": user_role.role.role_name,
                "scope_type": user_role.role.scope_type,
                "group_code": user_role.role.group_code,
            }
            for user_role in obj.user_roles.select_related("role").all()
            if user_role.role
        ]

    def get_permissions(self, obj):
        permissions = []

        for user_role in obj.user_roles.select_related("role").prefetch_related(
            "role__role_permissions__permission"
        ):
            role = user_role.role

            if not role:
                continue

            for role_permission in role.role_permissions.all():
                permission = role_permission.permission

                if not permission:
                    continue

                permissions.append(
                    {
                        "id": permission.id,
                        "permission_code": permission.permission_code,
                        "permission_name": permission.permission_name,
                        "module_code": permission.module_code,
                        "action_code": permission.action_code,
                    }
                )

        unique = {}
        for item in permissions:
            unique[item["permission_code"]] = item

        return list(unique.values())

    def _get_user_roles(self, obj):
        return [
            user_role.role
            for user_role in obj.user_roles.select_related("role").all()
            if user_role.role
        ]

    def get_accessible_groups(self, obj):
        roles = self._get_user_roles(obj)

        role_codes = {role.role_code for role in roles}
        group_codes = {role.group_code for role in roles if role.group_code}

        if "SYSTEM_ADMIN" in role_codes or "GLOBAL" in group_codes:
            return ["CCC", "SALE_ADMIN"]

        result = []

        if "CCC" in group_codes:
            result.append("CCC")

        if "SALE_ADMIN" in group_codes:
            result.append("SALE_ADMIN")

        return result

    def get_default_group(self, obj):
        groups = self.get_accessible_groups(obj)

        if "CCC" in groups:
            return "CCC"

        if "SALE_ADMIN" in groups:
            return "SALE_ADMIN"

        return None

    def get_is_global_admin(self, obj):
        roles = self._get_user_roles(obj)

        role_codes = {role.role_code for role in roles}
        group_codes = {role.group_code for role in roles if role.group_code}

        return "SYSTEM_ADMIN" in role_codes or "GLOBAL" in group_codes