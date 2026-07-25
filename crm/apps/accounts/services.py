from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import RolePermission, UserBranchAccess, UserRole
from apps.branches.models import EmployeeOrganizationMembership, OrganizationUnit
from apps.common.constants import PermissionCode, RoleCode, ScopeType, TicketStatusCode


class PermissionService:
    SCOPE_PRIORITY = {
        ScopeType.OWN: 10,
        ScopeType.ORGANIZATION_UNIT: 20,
        ScopeType.BRANCH: 30,
        ScopeType.MULTI_BRANCH: 40,
        ScopeType.ALL: 50,
    }

    @staticmethod
    def get_user_role_assignments(user, permission_code=None):
        if user is None or not user.is_authenticated:
            return UserRole.objects.none()

        now = timezone.now()
        queryset = (
            UserRole.objects.select_related(
                "role",
                "branch",
                "organization_unit",
                "organization_unit__branch",
                "organization_unit__parent",
            )
            .filter(
                user=user,
                is_active=True,
                role__is_active=True,
            )
            .filter(Q(valid_from__isnull=True) | Q(valid_from__lte=now))
            .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=now))
        )

        if permission_code:
            queryset = queryset.filter(
                role__role_permissions__permission__permission_code=permission_code,
                role__role_permissions__permission__is_active=True,
            )

        return queryset.distinct()

    @staticmethod
    def get_user_roles(user, permission_code=None):
        if user is None or not user.is_authenticated:
            return []

        seen = set()
        result = []

        for assignment in PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        ):
            if assignment.role_id in seen:
                continue
            seen.add(assignment.role_id)
            result.append(assignment.role)

        return result

    @staticmethod
    def get_user_role_codes(user, permission_code=None):
        return [
            role.role_code
            for role in PermissionService.get_user_roles(
                user,
                permission_code=permission_code,
            )
        ]

    @staticmethod
    def has_role(user, role_code):
        return role_code in PermissionService.get_user_role_codes(user)

    @staticmethod
    def has_permission(user, permission_code):
        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        ).exists()

    @staticmethod
    def get_highest_scope(user, permission_code=None):
        if user is None or not user.is_authenticated:
            return None

        if user.is_superuser:
            return ScopeType.ALL

        assignments = PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        )
        scopes = [assignment.scope_type for assignment in assignments]

        if not scopes:
            return None

        return max(
            scopes,
            key=lambda value: PermissionService.SCOPE_PRIORITY.get(value, 0),
        )

    @staticmethod
    def get_user_branch_ids(user, permission_code=None):
        if user is None or not user.is_authenticated:
            return set()

        branch_ids = set()
        employee = getattr(user, "employee", None)

        if employee is not None and employee.branch_id:
            branch_ids.add(employee.branch_id)

        branch_ids.update(
            UserBranchAccess.objects.filter(
                user=user,
                is_active=True,
            ).values_list("branch_id", flat=True)
        )

        assignments = PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        )

        for assignment in assignments:
            if assignment.branch_id:
                branch_ids.add(assignment.branch_id)
            if (
                assignment.organization_unit_id
                and assignment.organization_unit.branch_id
            ):
                branch_ids.add(assignment.organization_unit.branch_id)

        return branch_ids

    @staticmethod
    def get_employee_organization_unit_ids(employee, *, include_ancestors=False):
        if employee is None:
            return set()

        units = list(
            OrganizationUnit.objects.filter(
                employee_memberships__employee=employee,
                employee_memberships__is_active=True,
                is_active=True,
            ).select_related("parent")
        )
        ids = {unit.id for unit in units}

        if include_ancestors:
            for unit in units:
                ids.update(unit.get_ancestor_ids())

        return ids

    @staticmethod
    def get_user_organization_unit_ids(
        user,
        permission_code=None,
        *,
        include_descendants=True,
        include_memberships=True,
    ):
        if user is None or not user.is_authenticated:
            return set()

        unit_ids = set()

        if include_memberships:
            unit_ids.update(
                PermissionService.get_employee_organization_unit_ids(
                    getattr(user, "employee", None),
                )
            )

        for assignment in PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        ):
            unit = assignment.organization_unit

            if unit is None:
                continue

            unit_ids.add(unit.id)

            if include_descendants and assignment.include_descendants:
                unit_ids.update(unit.get_descendant_ids(include_self=False))

        return unit_ids

    @staticmethod
    def _organization_unit_scope_matches(assignment, target_unit):
        if target_unit is None or assignment.organization_unit_id is None:
            return False

        return assignment.organization_unit.contains(
            target_unit,
            include_descendants=assignment.include_descendants,
        )

    @staticmethod
    def is_ticket_owner(user, ticket):
        if user is None or ticket is None:
            return False

        if ticket.owner_user_id == user.id:
            return True

        employee = getattr(user, "employee", None)
        return bool(employee and ticket.owner_employee_id == employee.id)

    @staticmethod
    def is_ticket_assignee(user, ticket):
        if user is None or ticket is None:
            return False

        employee = getattr(user, "employee", None)
        return bool(employee and ticket.assigned_employee_id == employee.id)

    @staticmethod
    def is_related_organization_unit_member_for_ticket(user, ticket):
        if user is None or ticket is None or ticket.handling_unit_id is None:
            return False

        employee = getattr(user, "employee", None)

        if employee is None:
            return False

        return EmployeeOrganizationMembership.objects.filter(
            organization_unit_id=ticket.handling_unit_id,
            employee_id=employee.id,
            is_active=True,
        ).exists()

    # Alias cũ để các module chưa chuyển tên vẫn chạy.
    is_related_dept_member_for_ticket = is_related_organization_unit_member_for_ticket

    @staticmethod
    def can_access_ticket_by_scope(user, ticket, permission_code=None):
        if user is None or ticket is None:
            return False

        if user.is_superuser:
            return True

        assignments = PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        )

        for assignment in assignments:
            if assignment.scope_type == ScopeType.ALL:
                return True

            if assignment.scope_type == ScopeType.OWN:
                if (
                    PermissionService.is_ticket_owner(user, ticket)
                    or PermissionService.is_ticket_assignee(user, ticket)
                ):
                    return True

            elif assignment.scope_type == ScopeType.ORGANIZATION_UNIT:
                if PermissionService._organization_unit_scope_matches(
                    assignment,
                    ticket.handling_unit,
                ):
                    return True

            elif assignment.scope_type == ScopeType.BRANCH:
                if ticket.handling_branch_id == assignment.branch_id:
                    return True

            elif assignment.scope_type == ScopeType.MULTI_BRANCH:
                if ticket.handling_branch_id in PermissionService.get_user_branch_ids(
                    user,
                    permission_code=permission_code,
                ):
                    return True

        return False

    @staticmethod
    def can_view_ticket(user, ticket):
        return PermissionService.can_access_ticket_by_scope(
            user,
            ticket,
            permission_code=PermissionCode.TICKET_VIEW,
        )

    @staticmethod
    def can_create_ticket(user):
        return PermissionService.has_permission(user, PermissionCode.TICKET_CREATE)

    @staticmethod
    def can_assign_ticket(user, ticket=None):
        if not PermissionService.has_permission(user, PermissionCode.TICKET_ASSIGN):
            return False

        if ticket is None:
            return True

        return PermissionService.can_access_ticket_by_scope(
            user,
            ticket,
            permission_code=PermissionCode.TICKET_ASSIGN,
        )

    @staticmethod
    def can_amend_ticket(user, ticket):
        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not PermissionService.has_permission(user, PermissionCode.TICKET_AMEND):
            return False

        if ticket is None:
            return False

        status_code = (
            ticket.current_status.status_code if ticket.current_status else None
        )

        if status_code in [TicketStatusCode.CLOSED, TicketStatusCode.CANCELLED]:
            return False

        if (
            getattr(ticket, "is_locked_for_amend", False)
            and status_code != TicketStatusCode.DONE_WAIT_CLOSE
        ):
            return False

        return PermissionService.is_ticket_owner(user, ticket)

    @staticmethod
    def can_update_ticket_status(user, ticket):
        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not PermissionService.has_permission(
            user,
            PermissionCode.TICKET_UPDATE_STATUS,
        ):
            return False

        if ticket is None:
            return False

        if not PermissionService.can_access_ticket_by_scope(
            user,
            ticket,
            permission_code=PermissionCode.TICKET_UPDATE_STATUS,
        ):
            return False

        return (
            PermissionService.is_ticket_owner(user, ticket)
            or PermissionService.is_ticket_assignee(user, ticket)
            or PermissionService.is_related_organization_unit_member_for_ticket(
                user,
                ticket,
            )
        )

    @staticmethod
    def can_create_sla(user):
        return PermissionService.has_permission(user, PermissionCode.SLA_CREATE)

    @staticmethod
    def can_amend_sla(user):
        return PermissionService.has_permission(user, PermissionCode.SLA_AMEND)

    @staticmethod
    def can_activate_deactivate_sla(user):
        return PermissionService.has_permission(
            user,
            PermissionCode.SLA_ACTIVATE_DEACTIVATE,
        )

    @staticmethod
    def can_view_sla(user):
        return PermissionService.has_permission(user, PermissionCode.SLA_VIEW)

    @staticmethod
    def can_view_call_history(user, call_log=None):
        permission_code = PermissionCode.CALL_HISTORY_VIEW

        if not PermissionService.has_permission(user, permission_code):
            return False

        if call_log is None or user.is_superuser:
            return True

        employee = getattr(user, "employee", None)

        for assignment in PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        ):
            if assignment.scope_type == ScopeType.ALL:
                return True
            if assignment.scope_type == ScopeType.OWN:
                if employee and call_log.employee_id == employee.id:
                    return True
            elif assignment.scope_type == ScopeType.BRANCH:
                if call_log.branch_id == assignment.branch_id:
                    return True
            elif assignment.scope_type == ScopeType.MULTI_BRANCH:
                if call_log.branch_id in PermissionService.get_user_branch_ids(
                    user,
                    permission_code=permission_code,
                ):
                    return True
            elif assignment.scope_type == ScopeType.ORGANIZATION_UNIT:
                call_employee = getattr(call_log, "employee", None)
                unit_ids = PermissionService.get_employee_organization_unit_ids(
                    call_employee,
                    include_ancestors=assignment.include_descendants,
                )
                if assignment.organization_unit_id in unit_ids:
                    return True

        return False

    @staticmethod
    def can_listen_call_record(user, call_log):
        if not PermissionService.has_permission(
            user,
            PermissionCode.CALL_HISTORY_LISTEN,
        ):
            return False

        if user.is_superuser:
            return True

        role_codes = PermissionService.get_user_role_codes(
            user,
            permission_code=PermissionCode.CALL_HISTORY_LISTEN,
        )

        if RoleCode.CS_STAFF in role_codes:
            employee = getattr(user, "employee", None)

            if employee is None or call_log is None:
                return False

            if call_log.employee_id == employee.id:
                return True

            if call_log.ticket_id and call_log.ticket.assigned_employee_id == employee.id:
                return True

            return False

        return PermissionService.can_view_call_history(user, call_log)

    @staticmethod
    def is_sa_record_pic(user, record):
        if user is None or record is None:
            return False

        if record.pic_user_id == user.id:
            return True

        employee = getattr(user, "employee", None)
        return bool(employee and record.pic_employee_id == employee.id)

    @staticmethod
    def can_access_sa_record_by_scope(user, record, permission_code=None):
        if user is None or not user.is_authenticated or record is None:
            return False

        if user.is_superuser:
            return True

        permission_code = permission_code or PermissionCode.SA_RECORD_VIEW
        employee = getattr(user, "employee", None)

        for assignment in PermissionService.get_user_role_assignments(
            user,
            permission_code=permission_code,
        ):
            if assignment.scope_type == ScopeType.ALL:
                return True
            if assignment.scope_type == ScopeType.OWN:
                if PermissionService.is_sa_record_pic(user, record):
                    return True
            elif assignment.scope_type == ScopeType.BRANCH:
                if record.branch_id == assignment.branch_id:
                    return True
            elif assignment.scope_type == ScopeType.MULTI_BRANCH:
                if record.branch_id in PermissionService.get_user_branch_ids(
                    user,
                    permission_code=permission_code,
                ):
                    return True
            elif assignment.scope_type == ScopeType.ORGANIZATION_UNIT:
                # SaleAdminRecord chưa lưu organization_unit, nên scope đơn vị
                # được giới hạn về branch của đơn vị/nhân viên.
                branch_id = assignment.organization_unit.branch_id
                if branch_id and record.branch_id == branch_id:
                    return True
                if employee and record.branch_id == employee.branch_id:
                    return True

        return False

    @staticmethod
    def can_view_sa_record(user, record=None):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_VIEW):
            return False
        if record is None:
            return True
        return PermissionService.can_access_sa_record_by_scope(
            user,
            record,
            permission_code=PermissionCode.SA_RECORD_VIEW,
        )

    @staticmethod
    def can_create_sa_record(user):
        return PermissionService.has_permission(user, PermissionCode.SA_RECORD_CREATE)

    @staticmethod
    def can_update_sa_record(user, record):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_UPDATE):
            return False
        return PermissionService.can_access_sa_record_by_scope(
            user,
            record,
            permission_code=PermissionCode.SA_RECORD_UPDATE,
        )

    @staticmethod
    def can_delete_sa_record(user, record):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_DELETE):
            return False
        return PermissionService.can_access_sa_record_by_scope(
            user,
            record,
            permission_code=PermissionCode.SA_RECORD_DELETE,
        )

    @staticmethod
    def can_import_sa_record(user):
        return PermissionService.has_permission(user, PermissionCode.SA_RECORD_IMPORT)

    @staticmethod
    def can_view_sa_record_audit(user, record=None):
        if not PermissionService.has_permission(
            user,
            PermissionCode.SA_RECORD_AUDIT_VIEW,
        ):
            return False
        if record is None:
            return True
        return PermissionService.can_access_sa_record_by_scope(
            user,
            record,
            permission_code=PermissionCode.SA_RECORD_AUDIT_VIEW,
        )

    @staticmethod
    def can_view_sa_dashboard(user):
        return PermissionService.has_permission(user, PermissionCode.SA_DASHBOARD_VIEW)

    @staticmethod
    def can_view_sa_kpi_self(user):
        return PermissionService.has_permission(user, PermissionCode.SA_KPI_VIEW_SELF)

    @staticmethod
    def can_view_sa_kpi_branch(user):
        return PermissionService.has_permission(user, PermissionCode.SA_KPI_VIEW_BRANCH)

    @staticmethod
    def can_config_sa_kpi(user):
        return PermissionService.has_permission(user, PermissionCode.SA_KPI_CONFIG)

    @staticmethod
    def can_view_customer_360(user):
        return PermissionService.has_permission(user, PermissionCode.CUSTOMER_360_VIEW)
