from rest_framework.permissions import BasePermission

from apps.accounts.services import PermissionService


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
        "save_weight_config"
    }

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if view.action in self.manage_actions:
            return PermissionService.has_permission(user, self.manage_permission)

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