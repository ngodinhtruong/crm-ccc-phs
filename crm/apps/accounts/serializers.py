from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import Permission, Role, RolePermission, UserBranchAccess, UserRole
from apps.branches.models import Branch, Employee
from django.utils import timezone


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

    role_group_codes = serializers.SerializerMethodField()
    branch_access_names = serializers.SerializerMethodField()
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
            "role_group_codes",
            "branch_access_names",
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

    def get_role_group_codes(self, obj):
        return list(
            UserRole.objects.filter(user=obj)
            .select_related("role")
            .values_list("role__group_code", flat=True)
            .distinct()
        )


    def get_branch_access_names(self, obj):
        return list(
            UserBranchAccess.objects.filter(user=obj)
            .select_related("branch")
            .values_list("branch__branch_name", flat=True)
            .distinct()
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
class UserCreateWithAccessSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True,
    )

    employee_data = serializers.DictField(
        required=False,
        allow_empty=True,
    )

    status = serializers.CharField(
        max_length=20,
        required=False,
        default="ACTIVE",
    )
    is_active = serializers.BooleanField(required=False, default=True)

    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )

    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    def validate_username(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Username không được để trống.")

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username đã tồn tại.")

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError("Email không được để trống.")

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã tồn tại.")

        return value

    def validate_employee(self, value):
        if value is None:
            return value

        if User.objects.filter(employee=value).exists():
            raise serializers.ValidationError(
                "Nhân viên này đã được liên kết với tài khoản khác."
            )

        return value

    def validate_employee_data(self, value):
        if value is None:
            return {}

        if not isinstance(value, dict):
            raise serializers.ValidationError("employee_data không hợp lệ.")

        return value

    def validate(self, attrs):
        employee = attrs.get("employee")
        employee_data = attrs.get("employee_data") or {}

        role_ids = attrs.get("role_ids") or []
        branch_ids = attrs.get("branch_ids") or []

        roles = list(Role.objects.filter(id__in=role_ids))
        found_role_ids = {role.id for role in roles}
        missing_role_ids = set(role_ids) - found_role_ids

        if missing_role_ids:
            raise serializers.ValidationError(
                {
                    "role_ids": [
                        f"Role không tồn tại: {sorted(missing_role_ids)}"
                    ]
                }
            )

        branches = list(Branch.objects.filter(id__in=branch_ids))
        found_branch_ids = {branch.id for branch in branches}
        missing_branch_ids = set(branch_ids) - found_branch_ids

        if missing_branch_ids:
            raise serializers.ValidationError(
                {
                    "branch_ids": [
                        f"Chi nhánh phân quyền không tồn tại: {sorted(missing_branch_ids)}"
                    ]
                }
            )

        if not employee:
            required_employee_fields = {
                "employee_code": "Mã nhân viên",
                "full_name": "Họ tên nhân viên",
                "branch": "Chi nhánh nhân viên",
            }

            missing_fields = [
                label
                for field, label in required_employee_fields.items()
                if not employee_data.get(field)
            ]

            if missing_fields:
                raise serializers.ValidationError(
                    {
                        "employee_data": [
                            "Nếu không chọn Employee có sẵn, bắt buộc nhập: "
                            + ", ".join(missing_fields)
                        ]
                    }
                )

            employee_code = str(employee_data.get("employee_code")).strip()
            full_name = str(employee_data.get("full_name")).strip()
            branch_id = employee_data.get("branch")

            if Employee.objects.filter(employee_code=employee_code).exists():
                raise serializers.ValidationError(
                    {
                        "employee_data": [
                            "Mã nhân viên đã tồn tại."
                        ]
                    }
                )

            branch = Branch.objects.filter(id=branch_id).first()

            if not branch:
                raise serializers.ValidationError(
                    {
                        "employee_data": [
                            "Chi nhánh nhân viên không hợp lệ."
                        ]
                    }
                )

            attrs["_employee_payload"] = {
                "employee_code": employee_code,
                "full_name": full_name,
                "branch": branch,
                "department": str(employee_data.get("department") or "").strip(),
                "position": str(employee_data.get("position") or "").strip(),
            }

        requires_branch = False

        for role in roles:
            if role.group_code == Role.GROUP_GLOBAL or role.scope_type == "ALL":
                continue

            if role.group_code in [Role.GROUP_CCC, Role.GROUP_SALE_ADMIN]:
                requires_branch = True
                break

            if role.scope_type in ["OWN", "BRANCH", "MULTI_BRANCH"]:
                requires_branch = True
                break

        if requires_branch and not branch_ids:
            if employee and employee.branch_id:
                branch_ids = [employee.branch_id]
                branches = [employee.branch]
            elif attrs.get("_employee_payload"):
                branch = attrs["_employee_payload"]["branch"]
                branch_ids = [branch.id]
                branches = [branch]
            else:
                raise serializers.ValidationError(
                    {
                        "branch_ids": [
                            "Vui lòng chọn chi nhánh cho user nghiệp vụ."
                        ]
                    }
                )

        attrs["branch_ids"] = branch_ids
        attrs["_roles"] = roles
        attrs["_branches"] = branches

        return attrs

    def create(self, validated_data):
        roles = validated_data.pop("_roles", [])
        branches = validated_data.pop("_branches", [])
        employee_payload = validated_data.pop("_employee_payload", None)

        validated_data.pop("role_ids", None)
        validated_data.pop("branch_ids", None)

        employee = validated_data.pop("employee", None)
        validated_data.pop("employee_data", None)

        password = validated_data.pop("password", None)

        if not employee:
            employee = Employee.objects.create(**employee_payload)

        user = User(
            employee=employee,
            **validated_data,
        )
        if not password:
            password = f"{user.username}123"
        user.set_password(password)

        user.save()

        now = timezone.now()

        UserRole.objects.bulk_create(
            [
                UserRole(
                    user=user,
                    role=role,
                    created_at=now,
                )
                for role in roles
            ],
            ignore_conflicts=True,
        )

        UserBranchAccess.objects.bulk_create(
            [
                UserBranchAccess(
                    user=user,
                    branch=branch,
                    created_at=now,
                )
                for branch in branches
            ],
            ignore_conflicts=True,
        )

        return user

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