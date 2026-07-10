from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.db.models import Q
from apps.accounts.models import Permission, Role, RolePermission, UserBranchAccess, UserRole
from apps.accounts.serializers import (
    CurrentUserSerializer,
    PermissionSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    SetRolePermissionsSerializer,
    SetUserBranchesSerializer,
    SetUserRolesSerializer,
    UserBranchAccessSerializer,
    UserRoleSerializer,
    UserSerializer,
)
from apps.branches.models import Branch
from apps.accounts.api_permissions import IsSystemManager
from rest_framework.views import APIView
# from apps.accounts.services import PermissionService
# from crm.apps.accounts import serializers
User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserSerializer

    def get_queryset(self):
        queryset = User.objects.select_related(
            "employee",
            "employee__branch",
        ).prefetch_related(
            "user_roles__role",
            "branch_accesses__branch",
        ).all()

        params = self.request.query_params

        q = params.get("q")

        username = params.get("username")
        email = params.get("email")
        full_name = params.get("full_name")

        employee = params.get("employee")
        employee_name = params.get("employee_name")
        employee_code = params.get("employee_code")

        branch = params.get("branch")
        branch_name = params.get("branch_name")

        department = params.get("department")
        position = params.get("position")

        role = params.get("role")
        role_code = params.get("role_code")
        role_name = params.get("role_name")
        group_code = params.get("group_code")
        scope_type = params.get("scope_type")

        status_value = params.get("status")

        active = params.get("active") or params.get("is_active")
        is_staff = params.get("is_staff")
        is_superuser = params.get("is_superuser")

        if q:
            queryset = queryset.filter(
                Q(username__icontains=q)
                | Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(employee__full_name__icontains=q)
                | Q(employee__employee_code__icontains=q)
                | Q(employee__department__icontains=q)
                | Q(employee__position__icontains=q)
                | Q(employee__branch__branch_name__icontains=q)
                | Q(user_roles__role__role_code__icontains=q)
                | Q(user_roles__role__role_name__icontains=q)
                | Q(user_roles__role__group_code__icontains=q)
                | Q(branch_accesses__branch__branch_name__icontains=q)
            )

        if username:
            queryset = queryset.filter(username__icontains=username)

        if email:
            queryset = queryset.filter(email__icontains=email)

        if full_name:
            queryset = queryset.filter(
                Q(first_name__icontains=full_name)
                | Q(last_name__icontains=full_name)
                | Q(employee__full_name__icontains=full_name)
            )

        if employee:
            queryset = queryset.filter(employee_id=employee)

        if employee_name:
            queryset = queryset.filter(employee__full_name__icontains=employee_name)

        if employee_code:
            queryset = queryset.filter(employee__employee_code__icontains=employee_code)

        if branch:
            queryset = queryset.filter(
                Q(employee__branch_id=branch)
                | Q(branch_accesses__branch_id=branch)
            )

        if branch_name:
            queryset = queryset.filter(
                Q(employee__branch__branch_name__icontains=branch_name)
                | Q(branch_accesses__branch__branch_name__icontains=branch_name)
            )

        if department:
            queryset = queryset.filter(employee__department__icontains=department)

        if position:
            queryset = queryset.filter(employee__position__icontains=position)

        if role:
            queryset = queryset.filter(user_roles__role_id=role)

        if role_code:
            queryset = queryset.filter(user_roles__role__role_code=role_code)

        if role_name:
            queryset = queryset.filter(user_roles__role__role_name__icontains=role_name)

        if group_code:
            queryset = queryset.filter(user_roles__role__group_code=group_code)

        if scope_type:
            queryset = queryset.filter(user_roles__role__scope_type=scope_type)

        if status_value:
            queryset = queryset.filter(status=status_value)

        if active == "true":
            queryset = queryset.filter(is_active=True)

        if active == "false":
            queryset = queryset.filter(is_active=False)

        if is_staff == "true":
            queryset = queryset.filter(is_staff=True)

        if is_staff == "false":
            queryset = queryset.filter(is_staff=False)

        if is_superuser == "true":
            queryset = queryset.filter(is_superuser=True)

        if is_superuser == "false":
            queryset = queryset.filter(is_superuser=False)

        return queryset.distinct().order_by("id")

    @action(detail=True, methods=["post"], url_path="set-roles")
    @transaction.atomic
    def set_roles(self, request, pk=None):
        user = self.get_object()

        serializer = SetUserRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role_ids = serializer.validated_data["role_ids"]

        roles = Role.objects.filter(id__in=role_ids)
        now = timezone.now()

        UserRole.objects.filter(user=user).delete()

        UserRole.objects.bulk_create(
            [
                UserRole(
                    user=user,
                    role=role,
                    created_at=now,
                )
                for role in roles
            ]
        )

        return Response({"message": "User roles updated."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="set-branches")
    @transaction.atomic
    def set_branches(self, request, pk=None):
        user = self.get_object()

        serializer = SetUserBranchesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        branch_ids = serializer.validated_data["branch_ids"]

        branches = Branch.objects.filter(id__in=branch_ids)
        now = timezone.now()

        UserBranchAccess.objects.filter(user=user).delete()

        UserBranchAccess.objects.bulk_create(
            [
                UserBranchAccess(
                    user=user,
                    branch=branch,
                    created_at=now,
                )
                for branch in branches
            ]
        )

        return Response({"message": "User branches updated."}, status=status.HTTP_200_OK)


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = RoleSerializer

    def get_queryset(self):
        queryset = Role.objects.all()

        params = self.request.query_params

        q = params.get("q")
        group_code = params.get("group_code")
        scope_type = params.get("scope_type")
        role_code = params.get("role_code")
        role_name = params.get("role_name")

        if q:
            queryset = queryset.filter(
                Q(role_code__icontains=q)
                | Q(role_name__icontains=q)
                | Q(group_code__icontains=q)
                | Q(scope_type__icontains=q)
            )

        if group_code:
            queryset = queryset.filter(group_code=group_code)

        if scope_type:
            queryset = queryset.filter(scope_type=scope_type)

        if role_code:
            queryset = queryset.filter(role_code__icontains=role_code)

        if role_name:
            queryset = queryset.filter(role_name__icontains=role_name)

        return queryset.order_by("group_code", "role_code", "id")

    @action(detail=True, methods=["post"], url_path="set-permissions")
    @transaction.atomic
    def set_permissions(self, request, pk=None):
        role = self.get_object()

        serializer = SetRolePermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        permission_ids = serializer.validated_data["permission_ids"]

        permissions = Permission.objects.filter(id__in=permission_ids)
        now = timezone.now()

        RolePermission.objects.filter(role=role).delete()

        RolePermission.objects.bulk_create(
            [
                RolePermission(
                    role=role,
                    permission=permission,
                    created_at=now,
                )
                for permission in permissions
            ]
        )

        return Response({"message": "Role permissions updated."}, status=status.HTTP_200_OK)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.filter(is_active=True).order_by("module_code", "action_code", "id")


class UserRoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserRoleSerializer
    queryset = UserRole.objects.select_related("user", "role").all().order_by("id")


class RolePermissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = RolePermissionSerializer
    queryset = RolePermission.objects.select_related("role", "permission").all().order_by("id")


class UserBranchAccessViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserBranchAccessSerializer
    queryset = UserBranchAccess.objects.select_related("user", "branch").all().order_by("id")


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_accessible_groups(self, user, roles):
        role_codes = {role.role_code for role in roles}
        group_codes = {role.group_code for role in roles if getattr(role, "group_code", None)}

        if user.is_superuser or "SYSTEM_ADMIN" in role_codes or "GLOBAL" in group_codes:
            return ["CCC", "SALE_ADMIN"]

        result = []

        if "CCC" in group_codes:
            result.append("CCC")

        if "SALE_ADMIN" in group_codes:
            result.append("SALE_ADMIN")

        return result

    def get_default_group(self, accessible_groups):
        if "CCC" in accessible_groups:
            return "CCC"

        if "SALE_ADMIN" in accessible_groups:
            return "SALE_ADMIN"

        return None

    def get_is_global_admin(self, user, roles):
        role_codes = {role.role_code for role in roles}
        group_codes = {role.group_code for role in roles if getattr(role, "group_code", None)}

        return user.is_superuser or "SYSTEM_ADMIN" in role_codes or "GLOBAL" in group_codes

    def get(self, request):
        user = (
            User.objects.select_related(
                "employee",
                "employee__branch",
            )
            .prefetch_related(
                "user_roles__role",
                "user_roles__role__role_permissions__permission",
            )
            .get(id=request.user.id)
        )

        employee = getattr(user, "employee", None)

        roles = [
            user_role.role
            for user_role in user.user_roles.all()
            if user_role.role
        ]

        role_ids = [role.id for role in roles]

        permission_ids = RolePermission.objects.filter(
            role_id__in=role_ids
        ).values_list("permission_id", flat=True)

        permissions = Permission.objects.filter(
            id__in=permission_ids,
            is_active=True,
        ).distinct()

        accessible_groups = self.get_accessible_groups(user, roles)
        default_group = self.get_default_group(accessible_groups)
        is_global_admin = self.get_is_global_admin(user, roles)

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.get_full_name() or user.username,
                "is_superuser": user.is_superuser,
                "is_staff": user.is_staff,
                "employee": {
                    "id": employee.id,
                    "employee_code": employee.employee_code,
                    "full_name": employee.full_name,
                    "department": employee.department,
                    "position": employee.position,
                    "branch": {
                        "id": employee.branch.id,
                        "branch_code": employee.branch.branch_code,
                        "branch_name": employee.branch.branch_name,
                    }
                    if employee and employee.branch
                    else None,
                }
                if employee
                else None,
                "roles": [
                    {
                        "id": role.id,
                        "role_code": role.role_code,
                        "role_name": role.role_name,
                        "scope_type": role.scope_type,
                        "group_code": role.group_code,
                    }
                    for role in roles
                ],
                "permissions": [
                    {
                        "id": permission.id,
                        "permission_code": permission.permission_code,
                        "permission_name": permission.permission_name,
                        "module_code": permission.module_code,
                        "action_code": permission.action_code,
                    }
                    for permission in permissions
                ],
                "accessible_groups": accessible_groups,
                "default_group": default_group,
                "is_global_admin": is_global_admin,
            }
        )