from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.services import PermissionService

EXTERNAL_ERROR_VIEW = "EXTERNAL_ERROR_VIEW"
EXTERNAL_ERROR_IMPORT = "EXTERNAL_ERROR_IMPORT"
EXTERNAL_ERROR_CLASSIFY = "EXTERNAL_ERROR_CLASSIFY"
EXTERNAL_ERROR_EXPORT = "EXTERNAL_ERROR_EXPORT"
EXTERNAL_ERROR_DASHBOARD = "EXTERNAL_ERROR_DASHBOARD"
EXTERNAL_ERROR_MANAGE = "EXTERNAL_ERROR_MANAGE"

ADMIN_ROLE_CODES = {"SYSTEM_ADMIN", "ADMIN", "CS_MANAGER", "CCC_MANAGER"}
CCC_ROLE_CODES = {"CS_STAFF", "CS_SUPERVISOR", "CS_MANAGER", "CCC_STAFF", "CCC_SUPERVISOR", "CCC_MANAGER"}


def get_user_role_codes(user):
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return ADMIN_ROLE_CODES | CCC_ROLE_CODES
    try:
        return set(PermissionService.get_user_role_codes(user))
    except Exception:
        return set()


def user_has_any_role(user, role_codes):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(get_user_role_codes(user) & set(role_codes))


def has_permission(user, permission_code):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if user_has_any_role(user, ADMIN_ROLE_CODES):
        return True
    try:
        return PermissionService.has_permission(user, permission_code)
    except Exception:
        return False


def can_view_external_errors(user):
    return (
        has_permission(user, EXTERNAL_ERROR_VIEW)
        or has_permission(user, EXTERNAL_ERROR_DASHBOARD)
        or user_has_any_role(user, CCC_ROLE_CODES)
    )


def can_import_external_errors(user):
    return has_permission(user, EXTERNAL_ERROR_IMPORT)


def can_classify_external_errors(user):
    return has_permission(user, EXTERNAL_ERROR_CLASSIFY)


def can_manage_external_errors(user):
    return has_permission(user, EXTERNAL_ERROR_MANAGE)


class ExternalErrorPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        action = getattr(view, "action", None)

        if action in ["list", "retrieve"] or request.method in SAFE_METHODS:
            return can_view_external_errors(request.user)

        if action in ["import_raw"]:
            return can_import_external_errors(request.user)

        if action in ["classify", "bulk_classify"]:
            return can_classify_external_errors(request.user)

        return can_manage_external_errors(request.user)
