from rest_framework.permissions import BasePermission
from apps.accounts.services import PermissionService

ADMIN_ROLE_CODES = {
    "SYSTEM_ADMIN",
    "ADMIN",
    "SA_ADMIN",
    "BOM",
}

# Gộp cả CS và CCC thành một nhóm phân quyền chung
CCC_CS_ROLE_CODES = {
    "CCC_STAFF",
    "CCC_SUPERVISOR",
    "CCC_MANAGER",
    "CS_STAFF",
    "CS_SUPERVISOR",
    "CS_MANAGER",
}

ALL_EKYC_ALLOWED_ROLES = ADMIN_ROLE_CODES | CCC_CS_ROLE_CODES


def get_user_role_codes(user):
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return ALL_EKYC_ALLOWED_ROLES
    try:
        return set(PermissionService.get_user_role_codes(user))
    except Exception:
        return set()


def user_has_ekyc_permission(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    user_roles = get_user_role_codes(user)
    if user_roles & ALL_EKYC_ALLOWED_ROLES:
        return True
    return False


class HasEkycPermission(BasePermission):
    def has_permission(self, request, view):
        return user_has_ekyc_permission(request.user)
