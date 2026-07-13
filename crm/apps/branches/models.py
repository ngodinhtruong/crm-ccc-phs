from django.db import models
from apps.common.models import TimeStampedModel


class Branch(TimeStampedModel):
    branch_code = models.CharField(max_length=50, unique=True)
    branch_name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    class Meta:
        db_table = "branches"

    def __str__(self):
        return f"{self.branch_code} - {self.branch_name}"


class Employee(TimeStampedModel):
    employee_code = models.CharField(max_length=50, unique=True)
    
    full_name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)

    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="employees",
    )

    department = models.CharField(max_length=100, null=True, blank=True)
    position = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE")

    class Meta:
        db_table = "employees"

    def __str__(self):
        return f"{self.employee_code} - {self.full_name}"


class ProcessingUnit(TimeStampedModel):
    unit_code = models.CharField(max_length=50, unique=True)
    unit_name = models.CharField(max_length=255)

    default_branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="default_processing_units",
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "processing_units"

    def __str__(self):
        return self.unit_name


class ProcessingUnitMember(TimeStampedModel):
    processing_unit = models.ForeignKey(
        ProcessingUnit,
        on_delete=models.CASCADE,
        related_name="members",
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="processing_unit_memberships",
    )

    unit_role = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )  # STAFF / SUPERVISOR / MANAGER / HEAD

    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "processing_unit_members"
        constraints = [
            models.UniqueConstraint(
                fields=["processing_unit", "employee"],
                name="uq_processing_unit_employee",
            )
        ]
        indexes = [
            models.Index(fields=["processing_unit"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["unit_role"]),
        ]

    def __str__(self):
        return f"{self.employee} - {self.processing_unit}"