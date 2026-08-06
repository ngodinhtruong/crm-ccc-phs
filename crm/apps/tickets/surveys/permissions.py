"""Ai được xem, ai được nhập và ai được sửa kết quả khảo sát."""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.services import PermissionService
from apps.common.constants import PermissionCode

# Sửa một dòng khảo sát dùng quyền riêng, không dùng chung với nhập mới.
EDIT_METHODS = {"PUT", "PATCH"}


class CanEnterSurvey(BasePermission):
    """
    Đọc: cần quyền ``SURVEY_VIEW``.
    Nhập mới: cần ``SURVEY_ENTRY`` — chỉ admin và CCC được cấp.
    Sửa: cần ``SURVEY_UPDATE``.

    Tra theo mã quyền chứ không theo tên vai trò: gán bằng dữ liệu
    (Role → RolePermission) nên đổi ai được nhập chỉ là việc cấu hình, không
    phải sửa code rồi deploy lại.

    Superuser đi qua hết — ``PermissionService.has_permission`` tự cho phép.

    Riêng phạm vi dữ liệu (thấy được ticket nào) do ``filter_tickets_by_user``
    quyết định dựa trên ``TICKET_VIEW``, không nằm ở đây. Có quyền nhập mà
    không có ticket trong phạm vi thì vẫn nhận 404 — hai lớp tách bạch.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return PermissionService.has_permission(
                request.user, PermissionCode.SURVEY_VIEW
            )

        if request.method in EDIT_METHODS:
            self.message = "Bạn không có quyền sửa kết quả khảo sát."

            return PermissionService.has_permission(
                request.user, PermissionCode.SURVEY_UPDATE
            )

        self.message = "Chỉ quản trị viên và nhân viên CCC được nhập kết quả khảo sát."

        return PermissionService.has_permission(
            request.user, PermissionCode.SURVEY_ENTRY
        )
