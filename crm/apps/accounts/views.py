from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, RolePermission, UserBranchAccess, UserRole
from apps.accounts.serializers import (
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
from apps.accounts.services import PermissionService
User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserSerializer
    queryset = User.objects.select_related("employee").all().order_by("id")

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
    queryset = Role.objects.all().order_by("id")

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

    def get(self, request):
        user = request.user
        employee = getattr(user, "employee", None)

        roles = PermissionService.get_user_roles(user)
        role_ids = [role.id for role in roles]

        permission_ids = RolePermission.objects.filter(
            role_id__in=role_ids
        ).values_list("permission_id", flat=True)

        permissions = Permission.objects.filter(
            id__in=permission_ids,
            is_active=True,
        ).distinct()

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
            }
        )