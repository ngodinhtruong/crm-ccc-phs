from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import serializers

from apps.accounts.models import (
    Permission,
    Role,
    RolePermission,
    SCOPE_CHOICES,
    UserBranchAccess,
    UserRole,
)
from apps.branches.models import (
    Branch,
    Employee,
    EmployeeOrganizationMembership,
    MembershipResponsibility,
    OrganizationUnit,
)
from apps.common.constants import ScopeType


User = get_user_model()


def _infer_role_assignment_payload(*, role, employee=None, branches=None):
    scope_type = role.default_scope_type
    branches = branches or []
    payload = {
        "role": role,
        "scope_type": scope_type,
        "organization_unit": None,
        "branch": None,
        "include_descendants": False,
    }

    if scope_type == ScopeType.ORGANIZATION_UNIT:
        unit = employee.primary_organization_unit if employee else None
        if unit is None:
            raise serializers.ValidationError(
                {
                    "role_ids": [
                        f"Role {role.role_code} dùng scope đơn vị tổ chức nhưng "
                        "nhân viên chưa có đơn vị chính."
                    ]
                }
            )
        payload["organization_unit"] = unit

    elif scope_type == ScopeType.BRANCH:
        branch = employee.branch if employee else (branches[0] if branches else None)
        if branch is None:
            raise serializers.ValidationError(
                {
                    "role_ids": [
                        f"Role {role.role_code} dùng scope chi nhánh nhưng chưa "
                        "xác định được chi nhánh."
                    ]
                }
            )
        payload["branch"] = branch

    return payload


def _create_user_role_assignments(*, user, payloads):
    now = timezone.now()
    assignments = []
    seen = set()

    for payload in payloads:
        scope_type = payload.get("scope_type") or payload["role"].default_scope_type
        organization_unit = payload.get("organization_unit")
        branch = payload.get("branch")
        is_active = payload.get("is_active", True)
        key = (
            payload["role"].pk,
            scope_type,
            getattr(organization_unit, "pk", None),
            getattr(branch, "pk", None),
            is_active,
        )
        if key in seen:
            continue
        seen.add(key)

        assignment = UserRole(
            user=user,
            role=payload["role"],
            scope_type=scope_type,
            organization_unit=organization_unit,
            branch=branch,
            include_descendants=payload.get("include_descendants", False),
            is_active=is_active,
            valid_from=payload.get("valid_from"),
            valid_to=payload.get("valid_to"),
            created_at=now,
            updated_at=now,
        )
        assignment.full_clean()
        assignments.append(assignment)

    UserRole.objects.bulk_create(assignments)
    return assignments


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    branch_name = serializers.CharField(source="employee.branch.branch_name", read_only=True)
    department = serializers.SerializerMethodField()
    primary_organization_unit_id = serializers.SerializerMethodField()
    primary_organization_unit_code = serializers.SerializerMethodField()
    primary_organization_unit_name = serializers.SerializerMethodField()
    primary_membership_responsibility = serializers.SerializerMethodField()
    primary_membership_responsibility_label = serializers.SerializerMethodField()
    position = serializers.CharField(source="employee.position", read_only=True)
    role_names = serializers.SerializerMethodField()
    role_codes = serializers.SerializerMethodField()
    role_group_codes = serializers.SerializerMethodField()
    role_assignments = serializers.SerializerMethodField()
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
            "primary_organization_unit_id",
            "primary_organization_unit_code",
            "primary_organization_unit_name",
            "primary_membership_responsibility",
            "primary_membership_responsibility_label",
            "position",
            "role_names",
            "role_codes",
            "role_group_codes",
            "role_assignments",
            "branch_access_names",
            "status",
            "is_active",
            "is_staff",
            "is_superuser",
            "password",
        ]
        read_only_fields = ["is_superuser"]

    def validate_is_staff(self, value):
        request = self.context.get("request")
        current_user = getattr(request, "user", None)

        if self.instance is not None and self.instance.is_staff == value:
            return value
        if not value:
            return value
        if current_user is not None and current_user.is_superuser:
            return value

        from apps.accounts.services import PermissionService

        if "SYSTEM_ADMIN" in PermissionService.get_user_role_codes(current_user):
            return value

        raise serializers.ValidationError(
            "Bạn không có quyền cấp quyền truy cập trang quản trị."
        )

    def _primary_unit(self, obj):
        return obj.employee.primary_organization_unit if obj.employee else None

    def get_department(self, obj):
        unit = self._primary_unit(obj)
        return unit.unit_name if unit else ""

    def get_primary_organization_unit_id(self, obj):
        unit = self._primary_unit(obj)
        return unit.id if unit else None

    def get_primary_organization_unit_code(self, obj):
        unit = self._primary_unit(obj)
        return unit.unit_code if unit else None

    def get_primary_organization_unit_name(self, obj):
        unit = self._primary_unit(obj)
        return unit.unit_name if unit else None

    def get_primary_membership_responsibility(self, obj):
        if not obj.employee:
            return None
        return obj.employee.primary_membership_responsibility

    def get_primary_membership_responsibility_label(self, obj):
        if not obj.employee:
            return None
        return obj.employee.primary_membership_responsibility_label

    def _effective_assignments(self, obj):
        from apps.accounts.services import PermissionService

        return PermissionService.get_user_role_assignments(obj)

    def get_role_names(self, obj):
        return list(
            dict.fromkeys(
                assignment.role.role_name
                for assignment in self._effective_assignments(obj)
            )
        )

    def get_role_codes(self, obj):
        return list(
            dict.fromkeys(
                assignment.role.role_code
                for assignment in self._effective_assignments(obj)
            )
        )

    def get_role_group_codes(self, obj):
        return list(
            dict.fromkeys(
                assignment.role.group_code
                for assignment in self._effective_assignments(obj)
            )
        )

    def get_role_assignments(self, obj):
        return UserRoleSerializer(
            self._effective_assignments(obj),
            many=True,
        ).data

    def get_branch_access_names(self, obj):
        return list(
            obj.branch_accesses.filter(is_active=True)
            .values_list("branch__branch_name", flat=True)
            .distinct()
        )

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.set_password(password) if password else user.set_unusable_password()
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
    # Alias output cho frontend cũ. Khi input scope_type, map sang default_scope_type.
    scope_type = serializers.CharField(source="default_scope_type", required=False)

    class Meta:
        model = Role
        fields = [
            "id",
            "role_code",
            "role_name",
            "scope_type",
            "group_code",
            "is_active",
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
    username = serializers.CharField(source="user.username", read_only=True)
    role_code = serializers.CharField(source="role.role_code", read_only=True)
    role_name = serializers.CharField(source="role.role_name", read_only=True)
    organization_unit_code = serializers.CharField(
        source="organization_unit.unit_code",
        read_only=True,
    )
    organization_unit_name = serializers.CharField(
        source="organization_unit.unit_name",
        read_only=True,
    )
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = UserRole
        fields = [
            "id",
            "user",
            "username",
            "role",
            "role_code",
            "role_name",
            "scope_type",
            "organization_unit",
            "organization_unit_code",
            "organization_unit_name",
            "branch",
            "branch_name",
            "include_descendants",
            "is_active",
            "valid_from",
            "valid_to",
            "created_at",
            "updated_at",
        ]


class RolePermissionSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.role_name", read_only=True)
    permission_code = serializers.CharField(
        source="permission.permission_code",
        read_only=True,
    )
    permission_name = serializers.CharField(
        source="permission.permission_name",
        read_only=True,
    )

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
            "updated_at",
        ]


class UserBranchAccessSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = UserBranchAccess
        fields = [
            "id",
            "user",
            "username",
            "branch",
            "branch_name",
            "is_active",
            "created_at",
            "updated_at",
        ]


class RoleAssignmentInputSerializer(serializers.Serializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.filter(is_active=True))
    scope_type = serializers.ChoiceField(choices=SCOPE_CHOICES, required=False)
    organization_unit = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationUnit.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    include_descendants = serializers.BooleanField(required=False, default=False)
    is_active = serializers.BooleanField(required=False, default=True)
    valid_from = serializers.DateTimeField(required=False, allow_null=True)
    valid_to = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        role = attrs["role"]
        attrs.setdefault("scope_type", role.default_scope_type)

        candidate = UserRole(
            user=User(),
            role=role,
            scope_type=attrs["scope_type"],
            organization_unit=attrs.get("organization_unit"),
            branch=attrs.get("branch"),
            include_descendants=attrs.get("include_descendants", False),
            valid_from=attrs.get("valid_from"),
            valid_to=attrs.get("valid_to"),
        )

        # Kiểm tra rule trường mà không full_clean FK user chưa lưu.
        if candidate.scope_type == ScopeType.ORGANIZATION_UNIT:
            if not candidate.organization_unit_id:
                raise serializers.ValidationError(
                    {"organization_unit": "Bắt buộc chọn đơn vị tổ chức."}
                )
            if candidate.branch_id:
                raise serializers.ValidationError({"branch": "Không chọn branch."})
        elif candidate.scope_type == ScopeType.BRANCH:
            if not candidate.branch_id:
                raise serializers.ValidationError({"branch": "Bắt buộc chọn chi nhánh."})
            if candidate.organization_unit_id:
                raise serializers.ValidationError(
                    {"organization_unit": "Không chọn đơn vị tổ chức."}
                )
        elif candidate.organization_unit_id or candidate.branch_id:
            raise serializers.ValidationError(
                "Scope OWN/MULTI_BRANCH/ALL không nhận branch hoặc organization_unit."
            )

        if candidate.scope_type != ScopeType.ORGANIZATION_UNIT and candidate.include_descendants:
            raise serializers.ValidationError(
                {"include_descendants": "Chỉ dùng cho scope đơn vị tổ chức."}
            )

        if candidate.valid_from and candidate.valid_to and candidate.valid_to < candidate.valid_from:
            raise serializers.ValidationError(
                {"valid_to": "Thời điểm kết thúc phải sau thời điểm bắt đầu."}
            )

        return attrs


class SetUserRolesSerializer(serializers.Serializer):
    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )
    assignments = RoleAssignmentInputSerializer(
        many=True,
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        if "role_ids" not in attrs and "assignments" not in attrs:
            raise serializers.ValidationError(
                "Cần truyền role_ids hoặc assignments."
            )
        return attrs


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


class EmployeeCreateInputSerializer(serializers.Serializer):
    employee_code = serializers.CharField(max_length=50)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
    )
    primary_organization_unit = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationUnit.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    primary_membership_responsibility = serializers.ChoiceField(
        choices=MembershipResponsibility.choices,
        required=False,
    )
    position = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    status = serializers.CharField(max_length=20, required=False, default="ACTIVE")

    def validate_employee_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Mã nhân viên không được để trống.")
        if Employee.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError("Mã nhân viên đã tồn tại.")
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Họ tên nhân viên không được để trống.")
        return value

    def validate(self, attrs):
        branch = attrs["branch"]
        unit = attrs.get("primary_organization_unit")
        responsibility = attrs.get("primary_membership_responsibility")

        if unit and unit.branch_id and unit.branch_id != branch.id:
            raise serializers.ValidationError(
                {
                    "primary_organization_unit": (
                        "Đơn vị chính không thuộc chi nhánh nhân viên."
                    )
                }
            )

        if unit and not responsibility:
            raise serializers.ValidationError(
                {
                    "primary_membership_responsibility": (
                        "Phải chọn trách nhiệm trong đơn vị khi chọn đơn vị chính."
                    )
                }
            )

        if responsibility and not unit:
            raise serializers.ValidationError(
                {
                    "primary_membership_responsibility": (
                        "Không thể chọn trách nhiệm khi chưa chọn đơn vị chính."
                    )
                }
            )

        return attrs


class UserCreateWithAccessSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True,
    )
    employee_data = EmployeeCreateInputSerializer(required=False)
    status = serializers.CharField(max_length=20, required=False, default="ACTIVE")
    is_active = serializers.BooleanField(required=False, default=True)

    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )
    role_assignments = RoleAssignmentInputSerializer(
        many=True,
        required=False,
        allow_empty=True,
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
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã tồn tại.")
        return value

    def validate_employee(self, value):
        if value and User.objects.filter(employee=value).exists():
            raise serializers.ValidationError(
                "Nhân viên này đã được liên kết với tài khoản khác."
            )
        return value

    def validate(self, attrs):
        employee = attrs.get("employee")
        employee_data = attrs.get("employee_data") or {}
        role_ids = attrs.get("role_ids") or []
        explicit_assignments = attrs.get("role_assignments") or []
        branch_ids = attrs.get("branch_ids") or []

        if not role_ids and not explicit_assignments:
            raise serializers.ValidationError(
                {"role_ids": ["Phải chọn ít nhất một vai trò."]}
            )

        roles = list(Role.objects.filter(id__in=role_ids, is_active=True))
        missing_role_ids = set(role_ids) - {role.id for role in roles}
        if missing_role_ids:
            raise serializers.ValidationError(
                {"role_ids": [f"Role không tồn tại: {sorted(missing_role_ids)}"]}
            )

        branches = list(Branch.objects.filter(id__in=branch_ids))
        missing_branch_ids = set(branch_ids) - {branch.id for branch in branches}
        if missing_branch_ids:
            raise serializers.ValidationError(
                {
                    "branch_ids": [
                        f"Chi nhánh không tồn tại: {sorted(missing_branch_ids)}"
                    ]
                }
            )

        if employee and employee_data:
            raise serializers.ValidationError(
                {
                    "employee_data": (
                        "Không gửi employee_data khi đã chọn Employee có sẵn."
                    )
                }
            )

        if not employee:
            if not employee_data:
                raise serializers.ValidationError(
                    {
                        "employee_data": (
                            "Phải nhập thông tin nhân viên mới hoặc chọn Employee có sẵn."
                        )
                    }
                )

            branch = employee_data["branch"]
            primary_unit = employee_data.get("primary_organization_unit")
            primary_responsibility = employee_data.get(
                "primary_membership_responsibility"
            )

            attrs["_employee_payload"] = {
                "employee_code": employee_data["employee_code"],
                "full_name": employee_data["full_name"],
                "email": str(employee_data.get("email") or attrs["email"]).strip(),
                "phone": str(employee_data.get("phone") or "").strip() or None,
                "branch": branch,
                "position": str(employee_data.get("position") or "").strip() or None,
                "status": str(employee_data.get("status") or "ACTIVE"),
            }
            attrs["_primary_unit"] = primary_unit
            attrs["_primary_responsibility"] = primary_responsibility

            if not branches:
                branches = [branch]
                attrs["branch_ids"] = [branch.id]

        attrs["_roles"] = roles
        attrs["_branches"] = branches
        attrs["_explicit_assignments"] = explicit_assignments
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        roles = validated_data.pop("_roles", [])
        branches = validated_data.pop("_branches", [])
        explicit_assignments = validated_data.pop("_explicit_assignments", [])
        employee_payload = validated_data.pop("_employee_payload", None)
        primary_unit = validated_data.pop("_primary_unit", None)
        primary_responsibility = validated_data.pop(
            "_primary_responsibility",
            None,
        )

        validated_data.pop("role_ids", None)
        validated_data.pop("role_assignments", None)
        validated_data.pop("branch_ids", None)
        employee = validated_data.pop("employee", None)
        validated_data.pop("employee_data", None)
        password = validated_data.pop("password", None)

        if not employee:
            employee = Employee.objects.create(**employee_payload)
            if primary_unit:
                EmployeeOrganizationMembership.objects.create(
                    employee=employee,
                    organization_unit=primary_unit,
                    responsibility=primary_responsibility,
                    is_primary=True,
                    is_active=True,
                    joined_at=timezone.now(),
                )

        user = User(employee=employee, **validated_data)

        if password:
            user.set_password(password)
        else:
            password = get_random_string(12)
            user.set_password(password)
            self._generated_password = password

        user.save()
        now = timezone.now()

        UserBranchAccess.objects.bulk_create(
            [
                UserBranchAccess(
                    user=user,
                    branch=branch,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
                for branch in branches
            ],
            ignore_conflicts=True,
        )

        payloads = list(explicit_assignments)
        payloads.extend(
            _infer_role_assignment_payload(
                role=role,
                employee=employee,
                branches=branches,
            )
            for role in roles
        )
        _create_user_role_assignments(user=user, payloads=payloads)
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

    def _assignments(self, obj):
        from apps.accounts.services import PermissionService

        return list(PermissionService.get_user_role_assignments(obj))

    def get_roles(self, obj):
        return UserRoleSerializer(self._assignments(obj), many=True).data

    def get_permissions(self, obj):
        permissions = {}
        for assignment in self._assignments(obj):
            for role_permission in assignment.role.role_permissions.select_related(
                "permission"
            ).all():
                permission = role_permission.permission
                if permission and permission.is_active:
                    permissions[permission.permission_code] = {
                        "id": permission.id,
                        "permission_code": permission.permission_code,
                        "permission_name": permission.permission_name,
                        "module_code": permission.module_code,
                        "action_code": permission.action_code,
                    }
        return list(permissions.values())

    def _roles(self, obj):
        return [assignment.role for assignment in self._assignments(obj)]

    def get_accessible_groups(self, obj):
        roles = self._roles(obj)
        role_codes = {role.role_code for role in roles}
        group_codes = {role.group_code for role in roles if role.group_code}

        if "SYSTEM_ADMIN" in role_codes or "GLOBAL" in group_codes:
            return ["CCC", "SALE_ADMIN"]

        return [code for code in ["CCC", "SALE_ADMIN"] if code in group_codes]

    def get_default_group(self, obj):
        groups = self.get_accessible_groups(obj)
        return "CCC" if "CCC" in groups else ("SALE_ADMIN" if "SALE_ADMIN" in groups else None)

    def get_is_global_admin(self, obj):
        roles = self._roles(obj)
        return any(
            role.role_code == "SYSTEM_ADMIN" or role.group_code == "GLOBAL"
            for role in roles
        )
