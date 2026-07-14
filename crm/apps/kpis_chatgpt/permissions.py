from rest_framework.permissions import BasePermission

from apps.accounts.services import PermissionService
from apps.kpis.models import KpiProfile

SA_PROFILE_CODES = {KpiProfile.PROFILE_SA}
SA_SUP_PROFILE_CODES = {KpiProfile.PROFILE_SA_SUP}

SA_ROLE_CODES = {"SA", "SA_STAFF"}
SA_SUP_ROLE_CODES = {"SA_SUP", "SA_SUPERVISOR"}
KPI_ADMIN_ROLE_CODES = {"SYSTEM_ADMIN", "SA_ADMIN", "SA_MANAGER", "ADMIN"}


def user_role_codes(user):
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return KPI_ADMIN_ROLE_CODES | SA_ROLE_CODES | SA_SUP_ROLE_CODES
    return set(PermissionService.get_user_role_codes(user))


def user_has_any_role(user, role_codes):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(user_role_codes(user) & set(role_codes))


def is_kpi_admin(user):
    return user_has_any_role(user, KPI_ADMIN_ROLE_CODES)


def is_sa_supervisor(user):
    return user_has_any_role(user, SA_SUP_ROLE_CODES)


def can_manage_kpi_profile(user, profile_or_code):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser or is_kpi_admin(user):
        return True

    profile_code = getattr(profile_or_code, "profile_code", profile_or_code)

    if is_sa_supervisor(user):
        return profile_code == KpiProfile.PROFILE_SA

    return False


def get_manageable_profile_codes(user):
    if not user or not user.is_authenticated:
        return []

    if user.is_superuser or is_kpi_admin(user):
        return [KpiProfile.PROFILE_SA, KpiProfile.PROFILE_SA_SUP]

    if is_sa_supervisor(user):
        return [KpiProfile.PROFILE_SA]

    return []


def can_assign_target_for_profile(user, target_user, profile):
    if not can_manage_kpi_profile(user, profile):
        return False

    target_role_code = getattr(profile, "target_role_code", None)
    target_codes = user_role_codes(target_user)

    if target_role_code in {"SA", "SA_STAFF"}:
        return bool(target_codes & SA_ROLE_CODES)

    if target_role_code in {"SA_SUP", "SA_SUPERVISOR"}:
        return bool(target_codes & SA_SUP_ROLE_CODES)

    return True


class KpiConfigPermission(BasePermission):
    view_permissions = {
        "KPI_CONFIG_VIEW",
        "KPI_CONFIG_MANAGE",
    }

    manage_permission = "KPI_CONFIG_MANAGE"

    manage_actions = {
        "create",
        "update",
        "partial_update",
        "destroy",
        "create_monthly",
        "activate",
        "validate_weights",
        "save_weight_config",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if view.action in self.manage_actions:
            if not PermissionService.has_permission(user, self.manage_permission):
                return False
            return bool(get_manageable_profile_codes(user)) or view.__class__.__name__ == "KpiPeriodViewSet"

        return any(
            PermissionService.has_permission(user, permission_code)
            for permission_code in self.view_permissions
        )


class KpiManualScorePermission(BasePermission):
    view_permissions = {
        "KPI_DASHBOARD_VIEW_SELF",
        "KPI_DASHBOARD_VIEW_BRANCH",
        "KPI_DASHBOARD_VIEW_ALL",
        "KPI_MANUAL_SCORE_VIEW",
        "KPI_MANUAL_SCORE_UPDATE",
    }

    update_permission = "KPI_MANUAL_SCORE_UPDATE"

    update_actions = {
        "create",
        "update",
        "partial_update",
        "destroy",
        "manual_score",
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if view.action in self.update_actions:
            return PermissionService.has_permission(user, self.update_permission)

        return any(
            PermissionService.has_permission(user, permission_code)
            for permission_code in self.view_permissions
        )


class KpiAutoCalculatePermission(BasePermission):
    calculate_permission = "KPI_AUTO_CALCULATE"

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return PermissionService.has_permission(user, self.calculate_permission)
