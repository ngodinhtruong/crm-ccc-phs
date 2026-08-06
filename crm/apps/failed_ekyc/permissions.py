from rest_framework.permissions import BasePermission

from apps.ekyc.permissions import user_has_ekyc_permission


class HasFailedEkycPermission(BasePermission):
    """Failed eKYC currently follows the existing CCC/CS eKYC access policy."""

    def has_permission(self, request, view):
        return user_has_ekyc_permission(request.user)
