from django.db.models import Q

from apps.accounts.services import PermissionService
from apps.common.constants import PermissionCode, ScopeType


def get_user_employee(user):
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "employee", None)


def get_accessible_branch_ids(user, permission_code=None):
    return list(
        PermissionService.get_user_branch_ids(
            user,
            permission_code=permission_code,
        )
    )


def get_accessible_organization_unit_ids(user, permission_code=None):
    return list(
        PermissionService.get_user_organization_unit_ids(
            user,
            permission_code=permission_code,
            include_descendants=True,
        )
    )


def get_user_scope(user, permission_code=None):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return ScopeType.ALL
    return PermissionService.get_highest_scope(
        user,
        permission_code=permission_code,
    )


def _build_scope_q(user, *, permission_code, own_q, branch_field, unit_field=None):
    employee = get_user_employee(user)
    result = Q(pk__in=[])

    for assignment in PermissionService.get_user_role_assignments(
        user,
        permission_code=permission_code,
    ):
        scope = assignment.scope_type

        if scope == ScopeType.ALL:
            return None

        if scope == ScopeType.OWN:
            result |= own_q(employee)

        elif scope == ScopeType.BRANCH:
            result |= Q(**{branch_field: assignment.branch_id})

        elif scope == ScopeType.MULTI_BRANCH:
            branch_ids = PermissionService.get_user_branch_ids(
                user,
                permission_code=permission_code,
            )
            result |= Q(**{f"{branch_field}__in": branch_ids})

        elif scope == ScopeType.ORGANIZATION_UNIT:
            if unit_field:
                unit_ids = {assignment.organization_unit_id}
                if assignment.include_descendants:
                    unit_ids.update(
                        assignment.organization_unit.get_descendant_ids(
                            include_self=False,
                        )
                    )
                result |= Q(**{f"{unit_field}__in": unit_ids})
            else:
                branch_id = assignment.organization_unit.branch_id
                if branch_id:
                    result |= Q(**{branch_field: branch_id})
                elif employee:
                    result |= Q(**{branch_field: employee.branch_id})

    return result


def filter_tickets_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    q = _build_scope_q(
        user,
        permission_code=PermissionCode.TICKET_VIEW,
        own_q=lambda employee: (
            Q(created_by_user=user)
            | (Q(assigned_employee=employee) if employee else Q(pk__in=[]))
        ),
        branch_field="handling_branch_id",
        unit_field="handling_unit_id",
    )
    return queryset if q is None else queryset.filter(q).distinct()


def filter_companies_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    from apps.customers.models import Customer

    visible_customers = filter_customers_by_user(Customer.objects.all(), user)
    company_ids = (
        visible_customers.exclude(company__isnull=True)
        .values_list("company_id", flat=True)
        .distinct()
    )
    return queryset.filter(
        Q(id__in=company_ids) | Q(created_by_user=user)
    ).distinct()


def filter_customers_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    from apps.customers.models import CustomerEmployeeAssignment

    def own_q(employee):
        q = Q(created_by_user=user)
        if employee:
            assigned_ids = CustomerEmployeeAssignment.objects.filter(
                employee=employee,
                is_current=True,
            ).values_list("customer_id", flat=True)
            q |= Q(id__in=assigned_ids)
        return q

    q = _build_scope_q(
        user,
        permission_code=None,
        own_q=own_q,
        branch_field="branch_id",
    )
    return queryset if q is None else queryset.filter(q).distinct()


def filter_employees_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    q = _build_scope_q(
        user,
        permission_code=None,
        own_q=lambda employee: Q(id=employee.id) if employee else Q(pk__in=[]),
        branch_field="branch_id",
        unit_field="organization_memberships__organization_unit_id",
    )
    return queryset if q is None else queryset.filter(q).distinct()


def filter_organization_units_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    q = Q(pk__in=[])

    for assignment in PermissionService.get_user_role_assignments(user):
        if assignment.scope_type == ScopeType.ALL:
            return queryset
        if assignment.scope_type == ScopeType.ORGANIZATION_UNIT:
            ids = {assignment.organization_unit_id}
            ids.update(assignment.organization_unit.get_ancestor_ids())
            if assignment.include_descendants:
                ids.update(
                    assignment.organization_unit.get_descendant_ids(
                        include_self=False,
                    )
                )
            q |= Q(id__in=ids)
        elif assignment.scope_type == ScopeType.BRANCH:
            q |= Q(branch_id=assignment.branch_id) | Q(branch__isnull=True)
        elif assignment.scope_type == ScopeType.MULTI_BRANCH:
            q |= Q(
                branch_id__in=PermissionService.get_user_branch_ids(user)
            ) | Q(branch__isnull=True)
        elif assignment.scope_type == ScopeType.OWN:
            unit_ids = PermissionService.get_employee_organization_unit_ids(
                get_user_employee(user),
                include_ancestors=True,
            )
            q |= Q(id__in=unit_ids)

    return queryset.filter(q).distinct()


def filter_branches_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset

    if PermissionService.get_highest_scope(user) == ScopeType.ALL:
        return queryset

    return queryset.filter(
        id__in=PermissionService.get_user_branch_ids(user)
    ).distinct()


def filter_sa_records_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser:
        return queryset
    if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_VIEW):
        return queryset.none()

    q = _build_scope_q(
        user,
        permission_code=PermissionCode.SA_RECORD_VIEW,
        own_q=lambda employee: (
            Q(pic_user=user)
            | (Q(pic_employee=employee) if employee else Q(pk__in=[]))
        ),
        branch_field="branch_id",
    )
    return queryset if q is None else queryset.filter(q).distinct()
