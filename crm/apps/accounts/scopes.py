from django.db.models import Q

from apps.accounts.services import PermissionService


def get_user_employee(user):
    if not user or not user.is_authenticated:
        return None

    return getattr(user, "employee", None)


def get_accessible_branch_ids(user):
    """
    Lấy danh sách branch user được phép truy cập.
    Bao gồm:
    - branch của employee
    - branch được gán trong user_branch_access
    """

    branch_ids = set()

    employee = get_user_employee(user)

    if employee and employee.branch_id:
        branch_ids.add(employee.branch_id)

    try:
        extra_branch_ids = PermissionService.get_user_branch_ids(user)
        branch_ids.update(extra_branch_ids)
    except Exception:
        pass

    return list(branch_ids)


def get_user_scope(user):
    if user.is_superuser:
        return "ALL"

    return PermissionService.get_highest_scope(user)


def filter_tickets_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    scope = get_user_scope(user)
    employee = get_user_employee(user)

    if scope == "ALL":
        return queryset

    if scope in ["BRANCH", "MULTI_BRANCH"]:
        branch_ids = get_accessible_branch_ids(user)
        return queryset.filter(handling_branch_id__in=branch_ids).distinct()

    if scope == "OWN":
        q = Q(created_by_user=user)

        if employee:
            q |= Q(assigned_employee=employee)

        return queryset.filter(q).distinct()

    return queryset.none()


def filter_customers_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    scope = get_user_scope(user)
    employee = get_user_employee(user)

    if scope == "ALL":
        return queryset

    if scope in ["BRANCH", "MULTI_BRANCH"]:
        branch_ids = get_accessible_branch_ids(user)
        return queryset.filter(branch_id__in=branch_ids).distinct()

    if scope == "OWN":
        from apps.customers.models import CustomerEmployeeAssignment

        q = Q(created_by_user=user)

        if employee:
            assigned_customer_ids = CustomerEmployeeAssignment.objects.filter(
                employee=employee,
                is_current=True,
            ).values_list("customer_id", flat=True)

            q |= Q(id__in=assigned_customer_ids)

        return queryset.filter(q).distinct()

    return queryset.none()


def filter_employees_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    scope = get_user_scope(user)
    employee = get_user_employee(user)

    if scope == "ALL":
        return queryset

    if scope in ["BRANCH", "MULTI_BRANCH"]:
        branch_ids = get_accessible_branch_ids(user)
        return queryset.filter(branch_id__in=branch_ids).distinct()

    if scope == "OWN":
        if employee:
            return queryset.filter(id=employee.id)

        return queryset.none()

    return queryset.none()


def filter_branches_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    scope = get_user_scope(user)

    if scope == "ALL":
        return queryset

    branch_ids = get_accessible_branch_ids(user)
    return queryset.filter(id__in=branch_ids).distinct()


def filter_sa_records_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser:
        return queryset

    from apps.common.constants import PermissionCode

    if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_VIEW):
        return queryset.none()

    scope = get_user_scope(user)
    employee = get_user_employee(user)

    if scope == "ALL":
        return queryset

    if scope in ["BRANCH", "MULTI_BRANCH"]:
        branch_ids = get_accessible_branch_ids(user)

        if not branch_ids:
            return queryset.none()

        return queryset.filter(branch_id__in=branch_ids).distinct()

    if scope == "OWN":
        q = Q(pic_user=user)

        if employee:
            q |= Q(pic_employee=employee)

        return queryset.filter(q).distinct()

    return queryset.none()