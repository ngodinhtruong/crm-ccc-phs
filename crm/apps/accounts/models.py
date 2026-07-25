from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.constants import ScopeType
from apps.common.models import TimeStampedModel


SCOPE_CHOICES = [
    (ScopeType.OWN, "Cá nhân"),
    (ScopeType.ORGANIZATION_UNIT, "Đơn vị tổ chức"),
    (ScopeType.BRANCH, "Chi nhánh"),
    (ScopeType.MULTI_BRANCH, "Nhiều chi nhánh"),
    (ScopeType.ALL, "Toàn hệ thống"),
]


class User(AbstractUser):
    email = models.EmailField(unique=True)

    employee = models.OneToOneField(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_account",
    )

    status = models.CharField(max_length=20, default="ACTIVE", db_index=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email or self.username


class Role(TimeStampedModel):
    GROUP_GLOBAL = "GLOBAL"
    GROUP_CCC = "CCC"
    GROUP_SALE_ADMIN = "SALE_ADMIN"

    GROUP_CHOICES = [
        (GROUP_GLOBAL, "Global"),
        (GROUP_CCC, "CCC"),
        (GROUP_SALE_ADMIN, "Sale Admin"),
    ]

    role_code = models.CharField(max_length=50, unique=True)
    role_name = models.CharField(max_length=255)

    # Đây chỉ là scope mặc định khi gán role. Scope thực tế nằm trên UserRole.
    default_scope_type = models.CharField(
        max_length=50,
        choices=SCOPE_CHOICES,
        default=ScopeType.OWN,
        db_index=True,
    )

    group_code = models.CharField(
        max_length=50,
        default=GROUP_CCC,
        db_index=True,
        help_text=(
            "Nhóm nghiệp vụ của role, ví dụ GLOBAL, CCC, SALE_ADMIN, IT, "
            "ACCOUNTING. Không dùng trường này để xác định phòng ban."
        ),
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "roles"
        ordering = ["group_code", "role_code", "id"]

    def __str__(self):
        return f"{self.role_name} ({self.group_code})"

    @property
    def scope_type(self):
        """Alias đọc tương thích với API/code cũ."""
        return self.default_scope_type


class UserRole(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )

    scope_type = models.CharField(
        max_length=50,
        choices=SCOPE_CHOICES,
        blank=True,
        default="",
        db_index=True,
    )
    organization_unit = models.ForeignKey(
        "branches.OrganizationUnit",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_role_scopes",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_role_scopes",
    )
    include_descendants = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True, db_index=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_roles"
        ordering = ["user_id", "role_id", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                condition=Q(scope_type=ScopeType.OWN, is_active=True),
                name="uq_active_user_role_own",
            ),
            models.UniqueConstraint(
                fields=["user", "role"],
                condition=Q(scope_type=ScopeType.ALL, is_active=True),
                name="uq_active_user_role_all",
            ),
            models.UniqueConstraint(
                fields=["user", "role"],
                condition=Q(scope_type=ScopeType.MULTI_BRANCH, is_active=True),
                name="uq_active_user_role_multi_branch",
            ),
            models.UniqueConstraint(
                fields=["user", "role", "branch"],
                condition=Q(scope_type=ScopeType.BRANCH, is_active=True),
                name="uq_active_user_role_branch",
            ),
            models.UniqueConstraint(
                fields=["user", "role", "organization_unit"],
                condition=Q(scope_type=ScopeType.ORGANIZATION_UNIT, is_active=True),
                name="uq_active_user_role_organization_unit",
            ),
            models.CheckConstraint(
                condition=(Q(valid_to__isnull=True) | Q(valid_from__isnull=True) | Q(valid_to__gte=models.F("valid_from"))),
                name="ck_user_role_valid_to_after_from",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["scope_type"]),
            models.Index(fields=["organization_unit"]),
            models.Index(fields=["branch"]),
            models.Index(fields=["valid_from", "valid_to"]),
        ]

    def __str__(self):
        target = self.organization_unit or self.branch or self.scope_type
        return f"{self.user} - {self.role} - {target}"

    def clean(self):
        super().clean()

        if self.scope_type == ScopeType.ORGANIZATION_UNIT:
            if not self.organization_unit_id:
                raise ValidationError(
                    {"organization_unit": "Scope đơn vị tổ chức bắt buộc chọn đơn vị."}
                )
            if self.branch_id:
                raise ValidationError({"branch": "Không chọn branch cho scope đơn vị tổ chức."})

        elif self.scope_type == ScopeType.BRANCH:
            if not self.branch_id:
                raise ValidationError({"branch": "Scope chi nhánh bắt buộc chọn chi nhánh."})
            if self.organization_unit_id:
                raise ValidationError(
                    {"organization_unit": "Không chọn đơn vị cho scope chi nhánh."}
                )

        else:
            if self.organization_unit_id:
                raise ValidationError(
                    {"organization_unit": "Scope này không dùng đơn vị tổ chức."}
                )
            if self.branch_id:
                raise ValidationError({"branch": "Scope này không dùng chi nhánh trực tiếp."})

        if self.scope_type != ScopeType.ORGANIZATION_UNIT and self.include_descendants:
            raise ValidationError(
                {"include_descendants": "Chỉ scope đơn vị tổ chức mới dùng tùy chọn này."}
            )

        if self.valid_to and self.valid_from and self.valid_to < self.valid_from:
            raise ValidationError({"valid_to": "Thời điểm kết thúc phải sau thời điểm bắt đầu."})

    def save(self, *args, **kwargs):
        if not self.scope_type and self.role_id:
            self.scope_type = self.role.default_scope_type

        self.full_clean()
        super().save(*args, **kwargs)

    def is_effective(self, at=None):
        at = at or timezone.now()

        if not self.is_active:
            return False
        if self.valid_from and self.valid_from > at:
            return False
        if self.valid_to and self.valid_to < at:
            return False

        return True


class UserBranchAccess(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="branch_accesses",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="user_accesses",
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "user_branch_access"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "branch"],
                name="uq_user_branch_access",
            )
        ]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        return f"{self.user} - {self.branch}"


class Permission(TimeStampedModel):
    permission_code = models.CharField(max_length=100, unique=True)
    permission_name = models.CharField(max_length=255)

    module_code = models.CharField(max_length=100, null=True, blank=True)
    action_code = models.CharField(max_length=100, null=True, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "permissions"
        ordering = ["module_code", "action_code", "permission_code", "id"]

    def __str__(self):
        return self.permission_code


class RolePermission(TimeStampedModel):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )

    class Meta:
        db_table = "role_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="uq_role_permission",
            )
        ]

    def __str__(self):
        return f"{self.role} - {self.permission}"
