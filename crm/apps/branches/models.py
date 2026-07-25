from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel


class BranchStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Hoạt động"
    INACTIVE = "INACTIVE", "Ngừng hoạt động"


class OrganizationUnitType(models.TextChoices):
    COMPANY = "COMPANY", "Công ty"
    DIVISION = "DIVISION", "Khối"
    CENTER = "CENTER", "Trung tâm"
    DEPARTMENT = "DEPARTMENT", "Phòng ban"
    TEAM = "TEAM", "Nhóm"
    PROCESSING_UNIT = "PROCESSING_UNIT", "Đơn vị xử lý"
    PROJECT = "PROJECT", "Dự án"
    OTHER = "OTHER", "Khác"


class MembershipResponsibility(models.TextChoices):
    MEMBER = "MEMBER", "Thành viên"
    STAFF = "STAFF", "Nhân viên"
    SUPERVISOR = "SUPERVISOR", "Giám sát"
    MANAGER = "MANAGER", "Quản lý"
    HEAD = "HEAD", "Trưởng đơn vị"
    COORDINATOR = "COORDINATOR", "Điều phối"


class Branch(TimeStampedModel):
    branch_code = models.CharField(max_length=50, unique=True)
    branch_name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=BranchStatus.choices,
        default=BranchStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        db_table = "branches"
        ordering = ["branch_name", "id"]

    def __str__(self):
        return f"{self.branch_code} - {self.branch_name}"


class OrganizationUnit(TimeStampedModel):
    """
    Đơn vị tổ chức dạng cây.

    `branch = NULL` biểu thị đơn vị dùng chung toàn hệ thống. Một đơn vị con
    có thể thuộc chi nhánh cụ thể dù đơn vị cha là đơn vị toàn hệ thống.
    """

    unit_code = models.CharField(max_length=50, unique=True)
    unit_name = models.CharField(max_length=255)
    unit_type = models.CharField(
        max_length=30,
        choices=OrganizationUnitType.choices,
        default=OrganizationUnitType.DEPARTMENT,
        db_index=True,
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="organization_units",
    )

    description = models.TextField(null=True, blank=True)
    is_ticket_assignable = models.BooleanField(default=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "organization_units"
        ordering = ["sort_order", "unit_name", "id"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(id=models.F("parent_id")),
                name="ck_organization_unit_not_self_parent",
            ),
            models.UniqueConstraint(
                fields=["branch", "parent", "unit_name"],
                name="uq_organization_unit_name_in_parent",
                nulls_distinct=False,
            ),
        ]
        indexes = [
            models.Index(fields=["unit_code"]),
            models.Index(fields=["unit_type"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["is_active", "is_ticket_assignable"]),
        ]

    def __str__(self):
        return f"{self.unit_code} - {self.unit_name}"

    def clean(self):
        super().clean()

        if self.parent_id and self.pk and self.parent_id == self.pk:
            raise ValidationError({"parent": "Đơn vị không thể là cha của chính nó."})

        if self.parent_id:
            parent = self.parent

            if parent.branch_id and parent.branch_id != self.branch_id:
                raise ValidationError(
                    {
                        "branch": (
                            "Đơn vị con của một đơn vị thuộc chi nhánh phải "
                            "thuộc cùng chi nhánh."
                        )
                    }
                )

            ancestor = parent
            visited = set()

            while ancestor is not None:
                if ancestor.pk in visited:
                    raise ValidationError({"parent": "Cây đơn vị tổ chức có vòng lặp."})

                visited.add(ancestor.pk)

                if self.pk and ancestor.pk == self.pk:
                    raise ValidationError(
                        {"parent": "Không thể chọn một đơn vị con làm đơn vị cha."}
                    )

                ancestor = ancestor.parent

    def get_ancestor_ids(self, *, include_self=False):
        ids = []
        current = self if include_self else self.parent
        visited = set()

        while current is not None and current.pk not in visited:
            visited.add(current.pk)
            ids.append(current.pk)
            current = current.parent

        return ids

    def get_descendant_ids(self, *, include_self=False, active_only=True):
        ids = [self.pk] if include_self and self.pk else []
        frontier = [self.pk] if self.pk else []

        while frontier:
            queryset = OrganizationUnit.objects.filter(parent_id__in=frontier)

            if active_only:
                queryset = queryset.filter(is_active=True)

            child_ids = list(queryset.values_list("id", flat=True))

            if not child_ids:
                break

            ids.extend(child_ids)
            frontier = child_ids

        return ids

    def contains(self, other, *, include_descendants=True):
        if other is None or self.pk is None:
            return False

        if other.pk == self.pk:
            return True

        if not include_descendants:
            return False

        return self.pk in other.get_ancestor_ids()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Employee(TimeStampedModel):
    employee_code = models.CharField(max_length=50, unique=True)

    full_name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)

    # Chi nhánh công tác chính. Các đơn vị toàn hệ thống vẫn có thể chứa nhân
    # viên thuộc nhiều chi nhánh thông qua EmployeeOrganizationMembership.
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="employees",
    )

    position = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default="ACTIVE", db_index=True)

    class Meta:
        db_table = "employees"
        ordering = ["full_name", "id"]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["status"]),
            models.Index(fields=["employee_code"]),
        ]

    def __str__(self):
        return f"{self.employee_code} - {self.full_name}"

    def get_active_memberships(self):
        return self.organization_memberships.filter(is_active=True).select_related(
            "organization_unit",
            "organization_unit__branch",
            "organization_unit__parent",
        )

    def get_primary_membership(self):
        prefetched = getattr(self, "_prefetched_objects_cache", {}).get(
            "organization_memberships"
        )

        if prefetched is not None:
            active = [item for item in prefetched if item.is_active]
            primary = next((item for item in active if item.is_primary), None)
            return primary or (active[0] if active else None)

        return (
            self.organization_memberships.filter(is_active=True)
            .select_related("organization_unit", "organization_unit__branch")
            .order_by("-is_primary", "joined_at", "id")
            .first()
        )

    @property
    def primary_organization_unit(self):
        membership = self.get_primary_membership()
        return membership.organization_unit if membership else None

    @property
    def primary_membership_responsibility(self):
        membership = self.get_primary_membership()
        return membership.responsibility if membership else None

    @property
    def primary_membership_responsibility_label(self):
        membership = self.get_primary_membership()
        return membership.get_responsibility_display() if membership else None

    @property
    def department(self):
        """Alias chỉ đọc để code cũ vẫn hiển thị được trong giai đoạn chuyển đổi."""
        unit = self.primary_organization_unit
        return unit.unit_name if unit else ""


class EmployeeOrganizationMembership(TimeStampedModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    organization_unit = models.ForeignKey(
        OrganizationUnit,
        on_delete=models.CASCADE,
        related_name="employee_memberships",
    )

    responsibility = models.CharField(
        max_length=50,
        choices=MembershipResponsibility.choices,
        default=MembershipResponsibility.MEMBER,
        db_index=True,
    )
    is_primary = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "employee_organization_memberships"
        ordering = ["employee_id", "-is_primary", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_unit", "employee"],
                condition=Q(is_active=True),
                name="uq_active_employee_organization_membership",
            ),
            models.UniqueConstraint(
                fields=["employee"],
                condition=Q(is_active=True, is_primary=True),
                name="uq_primary_organization_membership_per_employee",
            ),
            models.CheckConstraint(
                condition=(Q(left_at__isnull=True) | Q(joined_at__isnull=True) | Q(left_at__gte=models.F("joined_at"))),
                name="ck_membership_left_after_joined",
            ),
        ]
        indexes = [
            models.Index(fields=["employee", "is_active"]),
            models.Index(fields=["organization_unit", "is_active"]),
            models.Index(fields=["responsibility"]),
            models.Index(fields=["is_primary"]),
        ]

    def __str__(self):
        return f"{self.employee} - {self.organization_unit}"

    def clean(self):
        super().clean()

        if (
            self.organization_unit_id
            and self.organization_unit.branch_id
            and self.employee_id
            and self.organization_unit.branch_id != self.employee.branch_id
        ):
            raise ValidationError(
                {
                    "organization_unit": (
                        "Nhân viên chỉ có thể thuộc đơn vị của cùng chi nhánh "
                        "hoặc đơn vị toàn hệ thống."
                    )
                }
            )

        if self.left_at and self.joined_at and self.left_at < self.joined_at:
            raise ValidationError({"left_at": "Ngày rời đơn vị phải sau ngày tham gia."})

        if self.is_primary and not self.is_active:
            raise ValidationError({"is_primary": "Đơn vị chính phải đang hoạt động."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
