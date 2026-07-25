from django.contrib import admin

from .models import (
    Branch,
    Employee,
    EmployeeOrganizationMembership,
    OrganizationUnit,
)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("id", "branch_code", "branch_name", "status")
    search_fields = ("branch_code", "branch_name")
    list_filter = ("status",)


class EmployeeOrganizationMembershipInline(admin.TabularInline):
    model = EmployeeOrganizationMembership
    extra = 0
    autocomplete_fields = ("organization_unit",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "employee_code",
        "full_name",
        "email",
        "phone",
        "branch",
        "primary_unit",
        "position",
        "status",
    )
    search_fields = (
        "employee_code",
        "full_name",
        "email",
        "phone",
        "organization_memberships__organization_unit__unit_name",
    )
    list_filter = (
        "branch",
        "organization_memberships__organization_unit",
        "position",
        "status",
    )
    inlines = [EmployeeOrganizationMembershipInline]

    @admin.display(description="Đơn vị chính")
    def primary_unit(self, obj):
        return obj.primary_organization_unit


@admin.register(OrganizationUnit)
class OrganizationUnitAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "unit_code",
        "unit_name",
        "unit_type",
        "parent",
        "branch",
        "is_ticket_assignable",
        "is_active",
    )
    search_fields = ("unit_code", "unit_name")
    list_filter = (
        "unit_type",
        "branch",
        "is_ticket_assignable",
        "is_active",
    )
    autocomplete_fields = ("parent", "branch")


@admin.register(EmployeeOrganizationMembership)
class EmployeeOrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "organization_unit",
        "employee",
        "responsibility",
        "is_primary",
        "is_active",
        "joined_at",
        "left_at",
    )
    search_fields = (
        "organization_unit__unit_name",
        "employee__full_name",
        "employee__employee_code",
    )
    list_filter = (
        "organization_unit",
        "responsibility",
        "is_primary",
        "is_active",
    )
    autocomplete_fields = ("organization_unit", "employee")
