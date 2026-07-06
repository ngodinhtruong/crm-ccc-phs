from django.contrib import admin

from .models import (
    CustomerType,
    Company,
    CustomerSource,
    CustomerRating,
    MembershipTier,
    Customer,
    CustomerAccount,
    CustomerEmployeeAssignment,
)


@admin.register(CustomerType)
class CustomerTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "type_code", "type_name", "is_active")
    search_fields = ("type_code", "type_name")
    list_filter = ("is_active",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "company_code", "company_name", "tax_code", "phone", "email", "status")
    search_fields = ("company_code", "company_name", "tax_code", "phone", "email")
    list_filter = ("status",)


@admin.register(CustomerSource)
class CustomerSourceAdmin(admin.ModelAdmin):
    list_display = ("id", "source_code", "source_name", "is_active")
    search_fields = ("source_code", "source_name")
    list_filter = ("is_active",)


@admin.register(CustomerRating)
class CustomerRatingAdmin(admin.ModelAdmin):
    list_display = ("id", "rating_code", "rating_name", "score", "is_active")
    search_fields = ("rating_code", "rating_name")
    list_filter = ("is_active",)


@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ("id", "tier_code", "tier_name", "is_active")
    search_fields = ("tier_code", "tier_name")
    list_filter = ("is_active",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_code", "full_name", "phone", "email", "branch", "customer_type", "status")
    search_fields = ("customer_code", "external_customer_id", "full_name", "phone", "email", "identity_number")
    list_filter = ("branch", "customer_type", "source", "rating", "membership_tier", "status")


@admin.register(CustomerAccount)
class CustomerAccountAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "account_number", "opened_at", "account_status", "source_system")
    search_fields = ("account_number", "customer__full_name", "customer__customer_code")
    list_filter = ("account_status", "source_system")


@admin.register(CustomerEmployeeAssignment)
class CustomerEmployeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "employee", "role_type", "assigned_at", "unassigned_at", "is_current")
    search_fields = ("customer__full_name", "customer__customer_code", "employee__full_name", "employee__employee_code")
    list_filter = ("role_type", "is_current")