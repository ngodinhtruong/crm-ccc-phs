from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    User,
    Role,
    UserRole,
    UserBranchAccess,
    Permission,
    RolePermission,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("id", "username", "email", "employee", "status", "is_staff", "is_active")
    search_fields = ("username", "email", "employee__full_name", "employee__employee_code")
    list_filter = ("status", "is_staff", "is_active")

    fieldsets = DjangoUserAdmin.fieldsets + (
        ("CRM Info", {"fields": ("employee", "status")}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "role_code", "role_name", "scope_type")
    search_fields = ("role_code", "role_name")
    list_filter = ("scope_type",)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "created_at")
    search_fields = ("user__username", "user__email", "role__role_code", "role__role_name")


@admin.register(UserBranchAccess)
class UserBranchAccessAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "branch", "created_at")
    search_fields = ("user__username", "user__email", "branch__branch_code", "branch__branch_name")


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "permission_code", "permission_name", "module_code", "action_code", "is_active")
    search_fields = ("permission_code", "permission_name")
    list_filter = ("module_code", "action_code", "is_active")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "role", "permission", "created_at")
    search_fields = ("role__role_code", "permission__permission_code")