from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class CustomerType(models.Model):
    type_code = models.CharField(max_length=50, unique=True)
    type_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "customer_types"

    def __str__(self):
        return self.type_name


class Company(TimeStampedModel):
    company_code = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )

    company_name = models.CharField(max_length=255)

    phone = models.CharField(max_length=50, null=True, blank=True, unique=True)
    email = models.EmailField(max_length=255, null=True, blank=True, unique=True)
    website = models.URLField(max_length=255, null=True, blank=True)
    # Fax không unique: chi nhánh / công ty mẹ - con dùng chung một số fax là
    # chuyện bình thường.
    fax = models.CharField(max_length=50, null=True, blank=True)

    tax_code = models.CharField(max_length=50, null=True, blank=True)

    account_number = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True,
    )
    opened_at = models.DateField(null=True, blank=True)

    primary_contact = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_contact_companies",
    )

    source = models.ForeignKey(
        "customers.CustomerSource",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="companies",
    )

    rating = models.ForeignKey(
        "customers.CustomerRating",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="companies",
    )

    membership_tier = models.ForeignKey(
        "customers.MembershipTier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="companies",
    )

    assigned_employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_companies",
    )

    address = models.TextField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    province = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)
    ward = models.CharField(max_length=100, null=True, blank=True)

    description = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, default="ACTIVE")

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_companies",
    )

    updated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_companies",
    )

    class Meta:
        db_table = "companies"
        # phone/email không khai index ở đây: unique=True đã tự tạo unique index,
        # khai thêm sẽ thành 2 index trùng nhau trên cùng một cột.
        indexes = [
            models.Index(fields=["company_name"]),
            models.Index(fields=["tax_code"]),
            models.Index(fields=["account_number"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.company_name

class CustomerSource(models.Model):
    source_code = models.CharField(max_length=50, unique=True)
    source_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "customer_sources"

    def __str__(self):
        return self.source_name


class CustomerRating(models.Model):
    rating_code = models.CharField(max_length=50, unique=True)
    rating_name = models.CharField(max_length=255)
    score = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "customer_ratings"

    def __str__(self):
        return self.rating_name


class MembershipTier(models.Model):
    tier_code = models.CharField(max_length=50, unique=True)
    tier_name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "membership_tiers"

    def __str__(self):
        return self.tier_name


class Customer(TimeStampedModel):
    customer_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    external_customer_id = models.CharField(max_length=100, null=True, blank=True)

    customer_type = models.ForeignKey(
        CustomerType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="customers",
    )

    salutation = models.CharField(max_length=20, null=True, blank=True)
    full_name = models.CharField(max_length=255)

    identity_number = models.CharField(max_length=50, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)

    phone = models.CharField(max_length=50, null=True, blank=True, unique=True)
    email = models.EmailField(max_length=255, null=True, blank=True, unique=True)

    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="customers",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
    )

    source = models.ForeignKey(
        CustomerSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
    )

    rating = models.ForeignKey(
        CustomerRating,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
    )

    membership_tier = models.ForeignKey(
        MembershipTier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
    )

    address = models.TextField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    province = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)
    ward = models.CharField(max_length=100, null=True, blank=True)

    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customers",
    )

    updated_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_customers",
    )

    class Meta:
        db_table = "customers"
        # phone/email đã có unique index từ unique=True, không khai lại.
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["identity_number"]),
            models.Index(fields=["external_customer_id"]),
        ]

    def __str__(self):
        return self.full_name


class CustomerAccount(TimeStampedModel):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="accounts",
    )

    account_number = models.CharField(max_length=10, unique=True)
    opened_at = models.DateField(null=True, blank=True)
    account_status = models.CharField(max_length=50, null=True, blank=True)

    source_system = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "customer_accounts"
        indexes = [
            models.Index(fields=["account_number"]),
            models.Index(fields=["account_status"]),
        ]

    def __str__(self):
        return self.account_number


class CustomerEmployeeAssignment(TimeStampedModel):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="employee_assignments",
    )

    employee = models.ForeignKey(
        "branches.Employee",
        on_delete=models.PROTECT,
        related_name="customer_assignments",
    )

    # SALE_ADMIN / BROKER / REFERRER / OWNER
    role_type = models.CharField(max_length=50)

    assigned_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_assignments_created",
    )

    assigned_at = models.DateTimeField()
    unassigned_at = models.DateTimeField(null=True, blank=True)

    is_current = models.BooleanField(default=True)

    transfer_reason = models.TextField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "customer_employee_assignments"
        indexes = [
            models.Index(fields=["customer"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["role_type"]),
            models.Index(fields=["is_current"]),
        ]

    def __str__(self):
        return f"{self.customer} - {self.employee} - {self.role_type}"