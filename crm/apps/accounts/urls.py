from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import (
    MeAPIView,
    PermissionViewSet,
    RolePermissionViewSet,
    RoleViewSet,
    UserBranchAccessViewSet,
    UserRoleViewSet,
    UserViewSet,
)


router = DefaultRouter()

router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")
router.register("permissions", PermissionViewSet, basename="permission")
router.register("user-roles", UserRoleViewSet, basename="user-role")
router.register("role-permissions", RolePermissionViewSet, basename="role-permission")
router.register("user-branch-access", UserBranchAccessViewSet, basename="user-branch-access")

urlpatterns = [
    path("me/", MeAPIView.as_view(), name="me"),
] + router.urls