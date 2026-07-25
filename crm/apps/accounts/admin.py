from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    Permission,
    Role,
    RolePermission,
    User,
    UserBranchAccess,
    UserRole,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("CRM", {"fields": ("employee", "status")}),
    )
    list_display = DjangoUserAdmin.list_display + ("employee", "status")
    list_filter = DjangoUserAdmin.list_filter + ("status",)
    autocomplete_fields = ("employee",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "role_code",
        "role_name",
        "default_scope_type",
        "group_code",
        "is_active",
    )
    search_fields = ("role_code", "role_name")
    list_filter = ("default_scope_type", "group_code", "is_active")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "role",
        "scope_type",
        "organization_unit",
        "branch",
        "include_descendants",
        "is_active",
    )
    search_fields = ("user__username", "user__email", "role__role_code")
    list_filter = ("scope_type", "role", "branch", "is_active")
    autocomplete_fields = ("user", "role", "organization_unit", "branch")


@admin.register(UserBranchAccess)
class UserBranchAccessAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "branch", "is_active", "created_at")
    search_fields = ("user__username", "user__email", "branch__branch_name")
    list_filter = ("branch", "is_active")
    autocomplete_fields = ("user", "branch")


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "permission_code",
        "permission_name",
        "module_code",
        "action_code",
        "is_active",
    )
    search_fields = ("permission_code", "permission_name")
    list_filter = ("module_code", "action_code", "is_active")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "role", "permission", "created_at")
    search_fields = ("role__role_code", "permission__permission_code")
    list_filter = ("role", "permission__module_code")
    autocomplete_fields = ("role", "permission")
