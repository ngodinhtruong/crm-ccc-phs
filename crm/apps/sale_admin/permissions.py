from rest_framework.permissions import BasePermission

from apps.accounts.services import PermissionService
from apps.common.constants import PermissionCode


class SaRecordPermission(BasePermission):
    action_permission_map = {
        "list": PermissionCode.SA_RECORD_VIEW,
        "retrieve": PermissionCode.SA_RECORD_VIEW,
        "create": PermissionCode.SA_RECORD_CREATE,
        "update": PermissionCode.SA_RECORD_UPDATE,
        "partial_update": PermissionCode.SA_RECORD_UPDATE,
        "destroy": PermissionCode.SA_RECORD_DELETE,
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        permission_code = self.action_permission_map.get(view.action)

        if not permission_code:
            return False

        return PermissionService.has_permission(user, permission_code)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if view.action == "retrieve":
            return PermissionService.can_view_sa_record(user, obj)

        if view.action in ["update", "partial_update"]:
            return PermissionService.can_update_sa_record(user, obj)

        if view.action == "destroy":
            return PermissionService.can_delete_sa_record(user, obj)

        return False


class SaRecordAuditLogPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return PermissionService.has_permission(
            user,
            PermissionCode.SA_RECORD_AUDIT_VIEW,
        )