from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.services import PermissionService


SYSTEM_MANAGER_ROLES = {
    "SYSTEM_ADMIN",
    "CCC_ADMIN",
    "SA_ADMIN",
    "CS_MANAGER",
    "BOM",
}

def user_has_any_role(user, role_codes):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    roles = PermissionService.get_user_roles(user)
    return any(role.role_code in role_codes for role in roles)


class IsSystemManager(BasePermission):
    """
    Chỉ superuser / CS_MANAGER / BOM được quản trị hệ thống:
    - User
    - Role
    - Permission
    - Gán quyền
    """

    def has_permission(self, request, view):
        return user_has_any_role(request.user, SYSTEM_MANAGER_ROLES)


class MasterDataPermission(BasePermission):


    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        return user_has_any_role(request.user, SYSTEM_MANAGER_ROLES)


class HasActionPermission(BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        permission_action_map = getattr(view, "permission_action_map", {})
        action = getattr(view, "action", None)

        permission_code = permission_action_map.get(action)

        if not permission_code:
            return True

        return PermissionService.has_permission(request.user, permission_code)