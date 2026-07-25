from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api_permissions import IsSystemManager
from apps.accounts.models import (
    Permission,
    Role,
    RolePermission,
    UserBranchAccess,
    UserRole,
)
from apps.accounts.serializers import (
    CurrentUserSerializer,
    PermissionSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    SetRolePermissionsSerializer,
    SetUserBranchesSerializer,
    SetUserRolesSerializer,
    UserBranchAccessSerializer,
    UserCreateWithAccessSerializer,
    UserRoleSerializer,
    UserSerializer,
    _create_user_role_assignments,
    _infer_role_assignment_payload,
)
from apps.accounts.services import PermissionService
from apps.branches.models import Branch
from apps.common.constants import ScopeType


User = get_user_model()
PRIVILEGED_ROLE_CODES = {"SYSTEM_ADMIN"}


def _can_grant_privileged_roles(user):
    if user is None or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(PRIVILEGED_ROLE_CODES & set(PermissionService.get_user_role_codes(user)))


def _privileged_roles_denied_for(user, roles):
    if _can_grant_privileged_roles(user):
        return []

    return [
        role.role_name or role.role_code
        for role in roles
        if role.role_code in PRIVILEGED_ROLE_CODES
        or role.default_scope_type == ScopeType.ALL
        or role.group_code == Role.GROUP_GLOBAL
    ]


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserSerializer

    def get_queryset(self):
        queryset = (
            User.objects.select_related("employee", "employee__branch")
            .prefetch_related(
                "employee__organization_memberships__organization_unit",
                "user_roles__role",
                "user_roles__organization_unit",
                "user_roles__branch",
                "branch_accesses__branch",
            )
            .all()
        )
        params = self.request.query_params
        q = params.get("q")

        if q:
            queryset = queryset.filter(
                Q(username__icontains=q)
                | Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(employee__full_name__icontains=q)
                | Q(employee__employee_code__icontains=q)
                | Q(employee__position__icontains=q)
                | Q(employee__branch__branch_name__icontains=q)
                | Q(
                    employee__organization_memberships__organization_unit__unit_name__icontains=q
                )
                | Q(user_roles__role__role_code__icontains=q)
                | Q(user_roles__role__role_name__icontains=q)
                | Q(user_roles__role__group_code__icontains=q)
                | Q(branch_accesses__branch__branch_name__icontains=q)
            )

        field_filters = {
            "username": "username__icontains",
            "email": "email__icontains",
            "employee": "employee_id",
            "employee_name": "employee__full_name__icontains",
            "employee_code": "employee__employee_code__icontains",
            "position": "employee__position__icontains",
            "role": "user_roles__role_id",
            "role_code": "user_roles__role__role_code",
            "role_name": "user_roles__role__role_name__icontains",
            "group_code": "user_roles__role__group_code",
            "scope_type": "user_roles__scope_type",
            "status": "status",
        }
        for param, lookup in field_filters.items():
            value = params.get(param)
            if value:
                queryset = queryset.filter(**{lookup: value})

        full_name = params.get("full_name")
        if full_name:
            queryset = queryset.filter(
                Q(first_name__icontains=full_name)
                | Q(last_name__icontains=full_name)
                | Q(employee__full_name__icontains=full_name)
            )

        branch = params.get("branch")
        if branch:
            queryset = queryset.filter(
                Q(employee__branch_id=branch)
                | Q(branch_accesses__branch_id=branch)
                | Q(user_roles__branch_id=branch)
            )

        branch_name = params.get("branch_name")
        if branch_name:
            queryset = queryset.filter(
                Q(employee__branch__branch_name__icontains=branch_name)
                | Q(branch_accesses__branch__branch_name__icontains=branch_name)
                | Q(user_roles__branch__branch_name__icontains=branch_name)
            )

        organization_unit = params.get("organization_unit")
        department = params.get("department")
        if organization_unit:
            queryset = queryset.filter(
                employee__organization_memberships__organization_unit_id=organization_unit,
                employee__organization_memberships__is_active=True,
            )
        if department:
            queryset = queryset.filter(
                employee__organization_memberships__organization_unit__unit_name__icontains=department,
                employee__organization_memberships__is_active=True,
            )

        for param in ["active", "is_staff", "is_superuser"]:
            value = params.get(param)
            if value not in {"true", "false"}:
                continue
            model_field = "is_active" if param == "active" else param
            queryset = queryset.filter(**{model_field: value == "true"})

        return queryset.distinct().order_by("id")

    @action(detail=False, methods=["post"], url_path="create-with-access")
    @transaction.atomic
    def create_with_access(self, request):
        serializer = UserCreateWithAccessSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        roles = list(serializer.validated_data.get("_roles", []))
        roles.extend(
            item["role"]
            for item in serializer.validated_data.get("_explicit_assignments", [])
        )
        denied = _privileged_roles_denied_for(request.user, roles)
        if denied:
            return Response(
                {"detail": f"Bạn không có quyền gán vai trò: {', '.join(denied)}."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = serializer.save()
        generated_password = getattr(serializer, "_generated_password", None)
        user = self.get_queryset().get(id=user.id)
        data = UserSerializer(user, context={"request": request}).data

        if generated_password:
            data["generated_password"] = generated_password

        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="set-roles")
    @transaction.atomic
    def set_roles(self, request, pk=None):
        user = self.get_object()
        serializer = SetUserRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        explicit = serializer.validated_data.get("assignments") or []
        role_ids = serializer.validated_data.get("role_ids") or []
        roles = list(Role.objects.filter(id__in=role_ids, is_active=True))

        missing = set(role_ids) - {role.id for role in roles}
        if missing:
            return Response(
                {"detail": f"Role không tồn tại: {sorted(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        all_roles = roles + [item["role"] for item in explicit]
        denied = _privileged_roles_denied_for(request.user, all_roles)
        if denied:
            return Response(
                {"detail": f"Bạn không có quyền gán vai trò: {', '.join(denied)}."},
                status=status.HTTP_403_FORBIDDEN,
            )

        branches = list(
            user.branch_accesses.filter(is_active=True).select_related("branch")
        )
        branch_objects = [item.branch for item in branches]
        payloads = list(explicit)
        payloads.extend(
            _infer_role_assignment_payload(
                role=role,
                employee=user.employee,
                branches=branch_objects,
            )
            for role in roles
        )

        UserRole.objects.filter(user=user).delete()
        _create_user_role_assignments(user=user, payloads=payloads)

        return Response(
            {
                "message": "User role assignments updated.",
                "assignments": UserRoleSerializer(
                    UserRole.objects.filter(user=user).select_related(
                        "role",
                        "organization_unit",
                        "branch",
                    ),
                    many=True,
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-branches")
    @transaction.atomic
    def set_branches(self, request, pk=None):
        user = self.get_object()
        serializer = SetUserBranchesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        branch_ids = serializer.validated_data["branch_ids"]
        branches = list(Branch.objects.filter(id__in=branch_ids))
        missing = set(branch_ids) - {branch.id for branch in branches}
        if missing:
            return Response(
                {"detail": f"Chi nhánh không tồn tại: {sorted(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        UserBranchAccess.objects.filter(user=user).delete()
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
            ]
        )
        return Response({"message": "User branches updated."})


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = RoleSerializer

    def get_queryset(self):
        queryset = Role.objects.all()
        params = self.request.query_params
        q = params.get("q")

        if q:
            queryset = queryset.filter(
                Q(role_code__icontains=q)
                | Q(role_name__icontains=q)
                | Q(group_code__icontains=q)
                | Q(default_scope_type__icontains=q)
            )

        filters = {
            "group_code": "group_code",
            "scope_type": "default_scope_type",
            "role_code": "role_code__icontains",
            "role_name": "role_name__icontains",
        }
        for param, lookup in filters.items():
            value = params.get(param)
            if value:
                queryset = queryset.filter(**{lookup: value})

        return queryset.order_by("group_code", "role_code", "id")

    @action(detail=True, methods=["post"], url_path="set-permissions")
    @transaction.atomic
    def set_permissions(self, request, pk=None):
        role = self.get_object()
        serializer = SetRolePermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permission_ids = serializer.validated_data["permission_ids"]
        permissions = list(Permission.objects.filter(id__in=permission_ids))
        missing = set(permission_ids) - {item.id for item in permissions}

        if missing:
            return Response(
                {"detail": f"Permission không tồn tại: {sorted(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [
                RolePermission(
                    role=role,
                    permission=permission,
                    created_at=now,
                    updated_at=now,
                )
                for permission in permissions
            ]
        )
        return Response({"message": "Role permissions updated."})


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.filter(is_active=True).order_by(
        "module_code",
        "action_code",
        "id",
    )


class UserRoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSystemManager]
    serializer_class = UserRoleSerializer
    queryset = UserRole.objects.select_related(
        "user",
        "role",
        "organization_unit",
        "branch",
    ).all().order_by("id")


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
        user = (
            User.objects.select_related("employee", "employee__branch")
            .prefetch_related(
                "employee__organization_memberships__organization_unit",
                "user_roles__role__role_permissions__permission",
                "user_roles__organization_unit",
                "user_roles__branch",
                "branch_accesses__branch",
            )
            .get(id=request.user.id)
        )

        base = CurrentUserSerializer(user).data
        employee = user.employee
        primary_unit = employee.primary_organization_unit if employee else None

        base.update(
            {
                "full_name": user.get_full_name() or user.username,
                "is_superuser": user.is_superuser,
                "is_staff": user.is_staff,
                "employee_detail": (
                    {
                        "id": employee.id,
                        "employee_code": employee.employee_code,
                        "full_name": employee.full_name,
                        "position": employee.position,
                        "primary_organization_unit": (
                            {
                                "id": primary_unit.id,
                                "unit_code": primary_unit.unit_code,
                                "unit_name": primary_unit.unit_name,
                                "unit_type": primary_unit.unit_type,
                            }
                            if primary_unit
                            else None
                        ),
                        # Alias cũ.
                        "department": primary_unit.unit_name if primary_unit else "",
                        "branch": (
                            {
                                "id": employee.branch.id,
                                "branch_code": employee.branch.branch_code,
                                "branch_name": employee.branch.branch_name,
                            }
                            if employee.branch
                            else None
                        ),
                    }
                    if employee
                    else None
                ),
                "role_codes": PermissionService.get_user_role_codes(user),
                "permission_codes": list(
                    Permission.objects.filter(
                        role_permissions__role_id__in=[
                            assignment.role_id
                            for assignment in PermissionService.get_user_role_assignments(user)
                        ],
                        is_active=True,
                    )
                    .values_list("permission_code", flat=True)
                    .distinct()
                ),
                "scope_type": PermissionService.get_highest_scope(user),
                "branch_ids": sorted(PermissionService.get_user_branch_ids(user)),
                "organization_unit_ids": sorted(
                    PermissionService.get_user_organization_unit_ids(user)
                ),
            }
        )
        return Response(base)
