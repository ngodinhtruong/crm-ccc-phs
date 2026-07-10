from rest_framework.permissions import BasePermission


SALE_ADMIN_ROLE_CODES = {
    "SA",
    "SA_SUP",
    "SA_ADMIN",
    "SYSTEM_ADMIN",
}


def get_user_role_codes(user):
    if not user or not user.is_authenticated:
        return set()

    return {
        user_role.role.role_code
        for user_role in user.user_roles.select_related("role").all()
        if user_role.role
    }


def is_sale_admin_user(user):
    if user.is_superuser:
        return True

    role_codes = get_user_role_codes(user)

    return bool(role_codes & SALE_ADMIN_ROLE_CODES)


def is_sale_admin_manager(user):
    if user.is_superuser:
        return True

    role_codes = get_user_role_codes(user)

    return bool(role_codes & {"SA_SUP", "SA_ADMIN", "SYSTEM_ADMIN"})


class IsSaleAdminUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_sale_admin_user(request.user))