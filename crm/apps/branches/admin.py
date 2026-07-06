from django.contrib import admin

from .models import Branch, Employee, ProcessingUnit, ProcessingUnitMember


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("id", "branch_code", "branch_name", "status")
    search_fields = ("branch_code", "branch_name")
    list_filter = ("status",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "employee_code", "full_name", "email", "phone", "branch", "department", "position", "status")
    search_fields = ("employee_code", "full_name", "email", "phone")
    list_filter = ("branch", "department", "position", "status")


@admin.register(ProcessingUnit)
class ProcessingUnitAdmin(admin.ModelAdmin):
    list_display = ("id", "unit_code", "unit_name", "default_branch", "is_active")
    search_fields = ("unit_code", "unit_name")
    list_filter = ("default_branch", "is_active")


@admin.register(ProcessingUnitMember)
class ProcessingUnitMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "processing_unit", "employee", "unit_role", "is_active", "joined_at", "left_at")
    search_fields = ("processing_unit__unit_name", "employee__full_name", "employee__employee_code")
    list_filter = ("processing_unit", "unit_role", "is_active")