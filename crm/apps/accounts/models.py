from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import TimeStampedModel


class User(AbstractUser):
    email = models.EmailField(unique=True)

    employee = models.OneToOneField(
        "branches.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_account",
    )

    status = models.CharField(max_length=20, default="ACTIVE")

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

    # OWN / BRANCH / MULTI_BRANCH / ALL
    scope_type = models.CharField(max_length=50)

    # GLOBAL / CCC / SALE_ADMIN
    group_code = models.CharField(
        max_length=50,
        choices=GROUP_CHOICES,
        default=GROUP_CCC,
        db_index=True,
    )

    class Meta:
        db_table = "roles"

    def __str__(self):
        return f"{self.role_name} ({self.group_code})"


class UserRole(models.Model):
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
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_roles"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                name="uq_user_role",
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.role}"


class UserBranchAccess(models.Model):
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
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_branch_access"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "branch"],
                name="uq_user_branch_access",
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.branch}"


class Permission(TimeStampedModel):
    permission_code = models.CharField(max_length=100, unique=True)
    permission_name = models.CharField(max_length=255)

    module_code = models.CharField(max_length=100, null=True, blank=True)
    action_code = models.CharField(max_length=100, null=True, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "permissions"

    def __str__(self):
        return self.permission_code


class RolePermission(models.Model):
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
    created_at = models.DateTimeField(null=True, blank=True)

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