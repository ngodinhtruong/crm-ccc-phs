from apps.accounts.models import RolePermission, UserBranchAccess, UserRole
from apps.branches.models import ProcessingUnitMember
from apps.common.constants import PermissionCode, RoleCode, ScopeType, TicketStatusCode

class PermissionService:
    @staticmethod
    def get_user_roles(user):
        if user is None or not user.is_authenticated:
            return []

        return [
            user_role.role
            for user_role in UserRole.objects.select_related("role").filter(user=user)
        ]

    @staticmethod
    def get_user_role_codes(user):
        return [role.role_code for role in PermissionService.get_user_roles(user)]

    @staticmethod
    def has_role(user, role_code):
        return role_code in PermissionService.get_user_role_codes(user)

    @staticmethod
    def has_permission(user, permission_code):
        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        role_ids = UserRole.objects.filter(
            user=user,
        ).values_list("role_id", flat=True)

        return RolePermission.objects.filter(
            role_id__in=role_ids,
            permission__permission_code=permission_code,
            permission__is_active=True,
        ).exists()

    @staticmethod
    def get_highest_scope(user):
        """
        Ưu tiên scope:
        ALL > MULTI_BRANCH > BRANCH > OWN
        """

        if user is None or not user.is_authenticated:
            return None

        if user.is_superuser:
            return ScopeType.ALL

        roles = PermissionService.get_user_roles(user)
        scopes = {role.scope_type for role in roles}

        if ScopeType.ALL in scopes:
            return ScopeType.ALL

        if ScopeType.MULTI_BRANCH in scopes:
            return ScopeType.MULTI_BRANCH

        if ScopeType.BRANCH in scopes:
            return ScopeType.BRANCH

        if ScopeType.OWN in scopes:
            return ScopeType.OWN

        return None

    @staticmethod
    def get_user_branch_ids(user):
        if user is None or not user.is_authenticated:
            return set()

        branch_ids = set()

        employee = getattr(user, "employee", None)

        if employee is not None and employee.branch_id:
            branch_ids.add(employee.branch_id)

        extra_branch_ids = UserBranchAccess.objects.filter(
            user=user,
        ).values_list("branch_id", flat=True)

        branch_ids.update(extra_branch_ids)

        return branch_ids

    @staticmethod
    def is_ticket_owner(user, ticket):
        if user is None or ticket is None:
            return False

        if ticket.owner_user_id == user.id:
            return True

        employee = getattr(user, "employee", None)

        if employee is not None and ticket.owner_employee_id == employee.id:
            return True

        return False

    @staticmethod
    def is_ticket_assignee(user, ticket):
        if user is None or ticket is None:
            return False

        employee = getattr(user, "employee", None)

        if employee is None:
            return False

        return ticket.assigned_employee_id == employee.id

    @staticmethod
    def is_related_dept_member_for_ticket(user, ticket):
        """
        User thuộc phòng ban xử lý của ticket thì được xem/cập nhật task/status liên quan.
        """

        if user is None or ticket is None:
            return False

        employee = getattr(user, "employee", None)

        if employee is None or ticket.assigned_unit_id is None:
            return False

        return ProcessingUnitMember.objects.filter(
            processing_unit_id=ticket.assigned_unit_id,
            employee_id=employee.id,
            is_active=True,
        ).exists()

    @staticmethod
    def can_access_ticket_by_scope(user, ticket):
        if user is None or ticket is None:
            return False

        if user.is_superuser:
            return True

        scope = PermissionService.get_highest_scope(user)

        if scope == ScopeType.ALL:
            return True

        if scope == ScopeType.MULTI_BRANCH:
            return ticket.handling_branch_id in PermissionService.get_user_branch_ids(user)

        if scope == ScopeType.BRANCH:
            employee = getattr(user, "employee", None)

            if employee is None:
                return False

            return ticket.handling_branch_id == employee.branch_id

        if scope == ScopeType.OWN:
            return (
                PermissionService.is_ticket_owner(user, ticket)
                or PermissionService.is_ticket_assignee(user, ticket)
            )

        return False

    @staticmethod
    def can_view_ticket(user, ticket):
        return (
            PermissionService.has_permission(user, PermissionCode.TICKET_VIEW)
            and PermissionService.can_access_ticket_by_scope(user, ticket)
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

        return PermissionService.can_access_ticket_by_scope(user, ticket)

    @staticmethod
    def can_amend_ticket(user, ticket):
        """
        Rule đã chốt:
        - Superuser được sửa tất cả
        - Có quyền TICKET_AMEND
        - Chỉ owner được amend
        - Ticket đã DONE/CLOSED/CANCELLED thì không amend
        """

        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not PermissionService.has_permission(user, PermissionCode.TICKET_AMEND):
            return False

        if ticket is None:
            return False

        if getattr(ticket, "is_locked_for_amend", False):
            return False

        if ticket.current_status and ticket.current_status.status_code in [
            TicketStatusCode.DONE_WAIT_CLOSE,
            TicketStatusCode.CLOSED,
            TicketStatusCode.CANCELLED,
        ]:
            return False

        return PermissionService.is_ticket_owner(user, ticket)
    @staticmethod
    def can_update_ticket_status(user, ticket):
        """
        Rule:
        - Superuser được update tất cả
        - Owner được update status ticket của mình
        - Assignee được update ticket đang xử lý
        - Related department member được update khi ticket thuộc unit của họ
        """

        if user is None or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not PermissionService.has_permission(user, PermissionCode.TICKET_UPDATE_STATUS):
            return False

        if ticket is None:
            return False

        if not PermissionService.can_access_ticket_by_scope(user, ticket):
            return False

        return (
            PermissionService.is_ticket_owner(user, ticket)
            or PermissionService.is_ticket_assignee(user, ticket)
            or PermissionService.is_related_dept_member_for_ticket(user, ticket)
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
        if not PermissionService.has_permission(user, PermissionCode.CALL_HISTORY_VIEW):
            return False

        if call_log is None:
            return True

        if user.is_superuser:
            return True

        scope = PermissionService.get_highest_scope(user)

        if scope == ScopeType.ALL:
            return True

        if scope == ScopeType.MULTI_BRANCH:
            return call_log.branch_id in PermissionService.get_user_branch_ids(user)

        employee = getattr(user, "employee", None)

        if employee is None:
            return False

        if scope == ScopeType.BRANCH:
            return call_log.branch_id == employee.branch_id

        if scope == ScopeType.OWN:
            return call_log.employee_id == employee.id

        return False

    @staticmethod
    def can_listen_call_record(user, call_log):
        """
        Rule:
        - Phải có quyền CALL_HISTORY_LISTEN
        - CS Staff chỉ nghe được call của ticket họ xử lý
        - IC/Manager/BOM theo scope rộng hơn
        """

        if not PermissionService.has_permission(user, PermissionCode.CALL_HISTORY_LISTEN):
            return False

        if user.is_superuser:
            return True

        role_codes = PermissionService.get_user_role_codes(user)

        if RoleCode.CS_STAFF in role_codes:
            employee = getattr(user, "employee", None)

            if employee is None:
                return False

            if call_log is None:
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

        if employee and record.pic_employee_id == employee.id:
            return True

        return False

    @staticmethod
    def can_access_sa_record_by_scope(user, record):
        if user is None or not user.is_authenticated or record is None:
            return False

        if user.is_superuser:
            return True

        scope = PermissionService.get_highest_scope(user)

        if scope == ScopeType.ALL:
            return True

        if scope == ScopeType.MULTI_BRANCH:
            return record.branch_id in PermissionService.get_user_branch_ids(user)

        if scope == ScopeType.BRANCH:
            return record.branch_id in PermissionService.get_user_branch_ids(user)

        if scope == ScopeType.OWN:
            return PermissionService.is_sa_record_pic(user, record)

        return False

    @staticmethod
    def can_view_sa_record(user, record=None):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_VIEW):
            return False

        if record is None:
            return True

        return PermissionService.can_access_sa_record_by_scope(user, record)

    @staticmethod
    def can_create_sa_record(user):
        return PermissionService.has_permission(user, PermissionCode.SA_RECORD_CREATE)

    @staticmethod
    def can_update_sa_record(user, record):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_UPDATE):
            return False

        if record is None:
            return False

        return PermissionService.can_access_sa_record_by_scope(user, record)

    @staticmethod
    def can_delete_sa_record(user, record):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_DELETE):
            return False

        if record is None:
            return False

        return PermissionService.can_access_sa_record_by_scope(user, record)

    @staticmethod
    def can_import_sa_record(user):
        return PermissionService.has_permission(user, PermissionCode.SA_RECORD_IMPORT)

    @staticmethod
    def can_view_sa_record_audit(user, record=None):
        if not PermissionService.has_permission(user, PermissionCode.SA_RECORD_AUDIT_VIEW):
            return False

        if record is None:
            return True

        return PermissionService.can_access_sa_record_by_scope(user, record)

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