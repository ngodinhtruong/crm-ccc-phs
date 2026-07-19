from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.services import PermissionService
from apps.common.constants import (
    ClassificationMethod,
    NotificationType,
    SlaStatus,
    TicketActionType,
    TicketStatusCode,
)
from apps.sla.models import TicketSlaTracking
from apps.notifications.services import NotificationService
from apps.sla.services import SlaService
from apps.tickets.models import (
    Ticket,
    TicketStatus,
    TicketAccountLinkStatus,
    TicketProcessLog,
    TicketAssignment,
    TicketUpdateLog,
    TicketActivityLog,
)


class TicketService:
    @staticmethod
    def generate_ticket_code(*, branch=None):
        """
        Rule mã ticket: ngày + tháng + 2 số cuối năm + 3 số thứ tự trong ngày.
        Ví dụ: 150726001.
        """
        today = timezone.localdate()
        prefix = f"{today:%d%m%y}"

        existing_codes = Ticket.objects.filter(
            ticket_code__startswith=prefix,
        ).values_list("ticket_code", flat=True)

        max_sequence = 0

        for code in existing_codes:
            suffix = str(code)[len(prefix):]

            if suffix.isdigit():
                max_sequence = max(max_sequence, int(suffix))

        return f"{prefix}{max_sequence + 1:03d}"

    @staticmethod
    def resolve_account_link_status(*, customer_account):
        if customer_account is not None:
            return TicketAccountLinkStatus.LINKED

        return TicketAccountLinkStatus.UNLINKED

    @staticmethod
    @transaction.atomic
    def create_ticket(
        *,
        title=None,
        customer=None,
        company=None,
        customer_account=None,
        handling_branch=None,
        raw_account_number=None,
        assigned_unit=None,
        assigned_employee=None,
        owner_user=None,
        support_category=None,
        classification=None,
        current_status=None,
        priority=None,
        source=None,
        sla_policy=None,
        classification_method=ClassificationMethod.MANUAL,
        source_ref_id=None,
        error_group=None,
        error_type=None,
        error_note=None,
        related_system=None,
        external_status=None,
        last_synced_at=None,
        request_content=None,
        handling_solution=None,
        final_response=None,
        created_by_user=None,
        check_permission=True,
    ):
        now = timezone.now()
        if check_permission and not PermissionService.can_create_ticket(created_by_user):
            raise PermissionDenied("Bạn không có quyền tạo ticket.")
        created_status = current_status or TicketStatus.objects.get(
            status_code=TicketStatusCode.CREATED
        )

        owner_user = owner_user or created_by_user
        owner_employee = None

        if owner_user is not None:
            owner_employee = getattr(owner_user, "employee", None)

        account_link_status = TicketService.resolve_account_link_status(
            customer_account=customer_account,
        )

        for _ in range(5):
            ticket_code = TicketService.generate_ticket_code(
                branch=handling_branch
            )

            try:
                ticket = Ticket.objects.create(
                    ticket_code=ticket_code,
                    title=title,
                    customer=customer,
                    company=company,
                    customer_account=customer_account,
                    raw_account_number=raw_account_number,
                    account_link_status=account_link_status,
                    handling_branch=handling_branch,
                    assigned_unit=assigned_unit,
                    assigned_employee=assigned_employee,
                    owner_user=owner_user,
                    owner_employee=owner_employee,
                    support_category=support_category,
                    classification=classification,
                    current_status=created_status,
                    priority=priority,
                    source=source,
                    sla_policy=sla_policy,
                    classification_method=classification_method,
                    source_ref_id=source_ref_id,
                    error_group=error_group,
                    error_type=error_type,
                    error_note=error_note,
                    related_system=related_system,
                    external_status=external_status,
                    last_synced_at=last_synced_at,
                    request_content=request_content,
                    handling_solution=handling_solution,
                    final_response=final_response,
                    assigned_at=now if assigned_employee else None,
                    created_by_user=created_by_user,
                    updated_by_user=created_by_user,
                    created_at=now,
                    updated_at=now,
                )
                break
            except IntegrityError:
                ticket = None

        if ticket is None:
            raise IntegrityError("Could not generate unique ticket_code.")

        TicketProcessLog.objects.create(
            ticket=ticket,
            status=created_status,
            employee=assigned_employee,
            user=created_by_user,
            start_at=now,
            note="Ticket created",
            created_at=now,
        )

        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type=TicketActionType.CREATE,
            action_name="Create ticket",
            new_value=ticket.ticket_code,
            created_by_user=created_by_user,
            created_at=now,
            note="Ticket created",
        )

        if assigned_employee is not None:
            TicketAssignment.objects.create(
                ticket=ticket,
                to_branch=handling_branch,
                to_unit=assigned_unit,
                to_employee=assigned_employee,
                assigned_by_user=created_by_user,
                assigned_at=now,
                is_current=True,
                note="Initial assignment",
                created_at=now,
            )

            NotificationService.notify_ticket_assigned(
                ticket=ticket,
                assigned_employee=assigned_employee,
            )

        if sla_policy is not None:
            SlaService.create_sla_tracking_for_ticket(
                ticket=ticket,
                sla_policy=sla_policy,
            )

            SlaService.copy_tasks_from_policy(
                ticket=ticket,
                sla_policy=sla_policy,
                created_by_user=created_by_user,
            )

        return ticket
    
    @staticmethod  
    @transaction.atomic
    def assign_ticket(
        *,
        ticket,
        to_employee=None,
        to_unit=None,
        to_branch=None,
        assigned_by_user=None,
        transfer_reason=None,
        note=None,
        check_permission=True,
    ):
        
        now = timezone.now()

        # Lock ticket để tránh 2 người assign cùng lúc
        ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)


        if check_permission and not PermissionService.can_assign_ticket(
            assigned_by_user,
            ticket,
        ):
            raise PermissionDenied("Bạn không có quyền giao/chuyển ticket.")

        from_branch = ticket.handling_branch
        from_unit = ticket.assigned_unit
        from_employee = ticket.assigned_employee

        # Nếu không truyền chi nhánh mới, tự suy ra
        if to_branch is None:
            if to_employee is not None:
                to_branch = to_employee.branch
            elif to_unit is not None and to_unit.default_branch_id:
                to_branch = to_unit.default_branch
            else:
                to_branch = from_branch

        # Đóng assignment hiện tại nếu có
        TicketAssignment.objects.filter(
            ticket=ticket,
            is_current=True,
        ).update(
            is_current=False,
            unassigned_at=now,
        )

        # Tạo assignment mới
        assignment = TicketAssignment.objects.create(
            ticket=ticket,
            from_branch=from_branch,
            to_branch=to_branch,
            from_unit=from_unit,
            to_unit=to_unit,
            from_employee=from_employee,
            to_employee=to_employee,
            assigned_by_user=assigned_by_user,
            assigned_at=now,
            is_current=True,
            transfer_reason=transfer_reason,
            note=note,
            created_at=now,
        )

        # Update trạng thái xử lý hiện tại trên bảng tickets
        ticket.handling_branch = to_branch
        ticket.assigned_unit = to_unit
        ticket.assigned_employee = to_employee
        ticket.assigned_at = now
        ticket.updated_by_user = assigned_by_user
        ticket.updated_at = now
        ticket.save(
            update_fields=[
                "handling_branch",
                "assigned_unit",
                "assigned_employee",
                "assigned_at",
                "updated_by_user",
                "updated_at",
            ]
        )

        # Xác định action_type
        action_type = TicketActionType.ASSIGN_EMPLOYEE

        if from_branch_id := getattr(from_branch, "id", None):
            if to_branch and from_branch_id != to_branch.id:
                action_type = TicketActionType.TRANSFER_BRANCH

        if from_unit_id := getattr(from_unit, "id", None):
            if to_unit and from_unit_id != to_unit.id:
                action_type = TicketActionType.TRANSFER_UNIT

        # Ghi log cập nhật ticket
        TicketUpdateLog.objects.create(
            ticket=ticket,
            action_type=action_type,
            from_unit=from_unit,
            to_unit=to_unit,
            from_branch=from_branch,
            to_branch=to_branch,
            from_employee=from_employee,
            to_employee=to_employee,
            note=note or transfer_reason,
            created_by_user=assigned_by_user,
            created_at=now,
        )

        # Ghi activity log chung
        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type=action_type,
            action_name="Assign / transfer ticket",
            old_value=str(from_employee) if from_employee else "",
            new_value=str(to_employee) if to_employee else "",
            created_by_user=assigned_by_user,
            created_at=now,
            note=note or transfer_reason,
        )

        # Gửi notification cho nhân viên được giao
        if to_employee is not None:
            NotificationService.notify_ticket_assigned(
                ticket=ticket,
                assigned_employee=to_employee,
            )

        return assignment
    
    @staticmethod
    def _set_if_has_field(obj, field_name, value, update_fields):
        field_names = {field.name for field in obj._meta.fields}

        if field_name not in field_names:
            return

        setattr(obj, field_name, value)

        if field_name not in update_fields:
            update_fields.append(field_name)

    @staticmethod
    def _is_sla_overdue(*, tracking, now):
        if tracking is None:
            return False

        if tracking.sla_status == SlaStatus.OVERDUE:
            return True

        if tracking.breached_at is not None:
            return True

        if tracking.resolution_due_at is not None and now > tracking.resolution_due_at:
            return True

        return False

    @staticmethod
    def _close_current_process_log(*, ticket, now):
        current_log = (
            TicketProcessLog.objects.filter(
                ticket=ticket,
                end_at__isnull=True,
            )
            .order_by("-start_at", "-id")
            .first()
        )

        if current_log is None:
            return

        update_fields = ["end_at"]

        current_log.end_at = now

        if current_log.start_at is not None:
            duration_seconds = (now - current_log.start_at).total_seconds()
            current_log.duration_minutes = int(duration_seconds // 60)
            update_fields.append("duration_minutes")

        current_log.save(update_fields=update_fields)

    @staticmethod
    def _update_sla_tracking_on_status(
        *,
        ticket,
        tracking,
        to_status_code,
        now,
        breach_reason=None,
        breach_note=None,
    ):
        if tracking is None:
            return

        update_fields = ["updated_at"]
        tracking.updated_at = now

        if to_status_code == TicketStatusCode.ACCEPTED:
            if tracking.assigned_at is None:
                tracking.assigned_at = now
                update_fields.append("assigned_at")

        elif to_status_code == TicketStatusCode.PROCESSING:
            if tracking.processing_started_at is None:
                tracking.processing_started_at = now
                update_fields.append("processing_started_at")

        elif to_status_code == TicketStatusCode.DONE_WAIT_CLOSE:
            if tracking.completed_at is None:
                tracking.completed_at = now
                update_fields.append("completed_at")

        elif to_status_code == TicketStatusCode.CLOSED:
            if tracking.closed_at is None:
                tracking.closed_at = now
                update_fields.append("closed_at")

        is_overdue = TicketService._is_sla_overdue(
            tracking=tracking,
            now=now,
        )

        if is_overdue:
            tracking.sla_status = SlaStatus.OVERDUE

            if "sla_status" not in update_fields:
                update_fields.append("sla_status")

            if tracking.breached_at is None:
                tracking.breached_at = tracking.resolution_due_at or now
                update_fields.append("breached_at")

        elif to_status_code == TicketStatusCode.CLOSED:
            tracking.sla_status = SlaStatus.ON_TIME

            if "sla_status" not in update_fields:
                update_fields.append("sla_status")

        if breach_reason is not None:
            tracking.breach_reason = breach_reason
            tracking.breach_reason_submitted = True

            update_fields.append("breach_reason")
            update_fields.append("breach_reason_submitted")

        if breach_note is not None:
            tracking.breach_note = breach_note

            if "breach_note" not in update_fields:
                update_fields.append("breach_note")

            if is_overdue:
                tracking.breach_reason_submitted = True

                if "breach_reason_submitted" not in update_fields:
                    update_fields.append("breach_reason_submitted")

        tracking.save(update_fields=list(set(update_fields)))

    @staticmethod
    @transaction.atomic
    def update_status(
        *,
        ticket,
        to_status_code,
        updated_by_user=None,
        note=None,
        breach_reason=None,
        breach_note=None,
        cancelled_reason=None,
        check_permission=True,
    ):
        

        now = timezone.now()

        ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
        if check_permission and not PermissionService.can_update_ticket_status(
            updated_by_user,
            ticket,
        ):
            raise PermissionDenied("Bạn không có quyền cập nhật trạng thái ticket.")

        from_status = ticket.current_status
        to_status = TicketStatus.objects.get(status_code=to_status_code)

        if from_status_id := getattr(from_status, "id", None):
            if from_status_id == to_status.id:
                return ticket

        tracking = TicketSlaTracking.objects.filter(ticket=ticket).first()

        is_overdue = TicketService._is_sla_overdue(
            tracking=tracking,
            now=now,
        )

        if to_status_code == TicketStatusCode.CLOSED and is_overdue:
            has_existing_reason = False

            if tracking is not None:
                has_existing_reason = bool(
                    tracking.breach_reason_submitted
                    and (
                        tracking.breach_reason_id is not None
                        or tracking.breach_note
                    )
                )

            has_new_reason = bool(
                breach_reason is not None
                or (breach_note is not None and breach_note.strip())
            )

            if not has_existing_reason and not has_new_reason:
                raise ValidationError(
                    "Ticket đã vượt SLA. Cần nhập lý do vượt SLA trước khi đóng ticket."
                )

        update_fields = [
            "current_status",
            "updated_by_user",
            "updated_at",
        ]

        ticket.current_status = to_status
        ticket.updated_by_user = updated_by_user
        ticket.updated_at = now

        if to_status_code == TicketStatusCode.ACCEPTED:
            TicketService._set_if_has_field(
                ticket,
                "accepted_at",
                now,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "accepted_by_user",
                updated_by_user,
                update_fields,
            )

        elif to_status_code == TicketStatusCode.PROCESSING:
            TicketService._set_if_has_field(
                ticket,
                "processing_started_at",
                now,
                update_fields,
            )

        elif to_status_code == TicketStatusCode.DONE_WAIT_CLOSE:
            TicketService._set_if_has_field(
                ticket,
                "done_at",
                now,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "done_by_user",
                updated_by_user,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "is_locked_for_amend",
                True,
                update_fields,
            )

        elif to_status_code == TicketStatusCode.CLOSED:
            TicketService._set_if_has_field(
                ticket,
                "closed_at",
                now,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "closed_by_user",
                updated_by_user,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "is_locked_for_amend",
                True,
                update_fields,
            )

        elif to_status_code == TicketStatusCode.CANCELLED:
            TicketService._set_if_has_field(
                ticket,
                "cancelled_at",
                now,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "cancelled_by_user",
                updated_by_user,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "cancelled_reason",
                cancelled_reason,
                update_fields,
            )
            TicketService._set_if_has_field(
                ticket,
                "is_locked_for_amend",
                True,
                update_fields,
            )

        ticket.save(update_fields=update_fields)

        TicketService._close_current_process_log(
            ticket=ticket,
            now=now,
        )

        TicketProcessLog.objects.create(
            ticket=ticket,
            status=to_status,
            employee=ticket.assigned_employee,
            user=updated_by_user,
            start_at=now,
            note=note,
            created_at=now,
        )

        action_type = TicketActionType.UPDATE_STATUS

        if to_status_code == TicketStatusCode.CLOSED:
            action_type = TicketActionType.CLOSE

        elif to_status_code == TicketStatusCode.CANCELLED:
            action_type = TicketActionType.CANCEL

        TicketUpdateLog.objects.create(
            ticket=ticket,
            action_type=action_type,
            from_status=from_status,
            to_status=to_status,
            note=note,
            created_by_user=updated_by_user,
            created_at=now,
        )

        TicketActivityLog.objects.create(
            ticket=ticket,
            action_type=action_type,
            action_name="Update ticket status",
            old_value=from_status.status_name if from_status else "",
            new_value=to_status.status_name,
            created_by_user=updated_by_user,
            created_at=now,
            note=note,
        )

        TicketService._update_sla_tracking_on_status(
            ticket=ticket,
            tracking=tracking,
            to_status_code=to_status_code,
            now=now,
            breach_reason=breach_reason,
            breach_note=breach_note,
        )

        if ticket.assigned_employee_id:
            try:
                assigned_user = ticket.assigned_employee.user_account
            except Exception:
                assigned_user = None

            if assigned_user is not None:
                NotificationService.create_notification(
                    user=assigned_user,
                    ticket=ticket,
                    notification_type=NotificationType.STATUS_UPDATED,
                    title="Ticket được cập nhật trạng thái",
                    content=f"Ticket {ticket.ticket_code} đã chuyển sang trạng thái {to_status.status_name}.",
                )

        return ticket
    
    @staticmethod
    @transaction.atomic
    def amend_ticket(
        *,
        ticket,
        updated_by_user=None,
        check_permission=True,
        **changes,
    ):
        now = timezone.now()

        ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)

        if check_permission and not PermissionService.can_amend_ticket(
            updated_by_user,
            ticket,
        ):
            raise PermissionDenied("Bạn không có quyền sửa ticket này.")

        allowed_fields = {
            "title",
            "customer",
            "company",
            "customer_account",
            "raw_account_number",
            "support_category",
            "classification",
            "priority",
            "source",
            "sla_policy",
            "classification_method",
            "source_ref_id",
            "error_group",
            "error_type",
            "error_note",
            "related_system",
            "external_status",
            "last_synced_at",
            "request_content",
            "handling_solution",
            "final_response",
        }

        invalid_fields = set(changes.keys()) - allowed_fields

        if invalid_fields:
            raise ValidationError(
                f"Không được sửa các field này: {', '.join(invalid_fields)}"
            )

        model_field_names = {field.name for field in ticket._meta.fields}

        old_priority = ticket.priority
        old_sla_policy = ticket.sla_policy

        changed_items = []
        update_fields = ["updated_by_user", "updated_at"]

        for field_name, new_value in changes.items():
            if field_name not in model_field_names:
                continue

            old_value = getattr(ticket, field_name)

            if old_value == new_value:
                continue

            setattr(ticket, field_name, new_value)

            if field_name not in update_fields:
                update_fields.append(field_name)

            changed_items.append(
                {
                    "field_name": field_name,
                    "old_value": old_value,
                    "new_value": new_value,
                }
            )

        resolved_account_link_status = TicketService.resolve_account_link_status(
            customer_account=ticket.customer_account,
        )

        if ticket.account_link_status != resolved_account_link_status:
            old_value = ticket.account_link_status
            ticket.account_link_status = resolved_account_link_status

            if "account_link_status" not in update_fields:
                update_fields.append("account_link_status")

            changed_items.append(
                {
                    "field_name": "account_link_status",
                    "old_value": old_value,
                    "new_value": resolved_account_link_status,
                }
            )

        if not changed_items:
            return ticket

        ticket.updated_by_user = updated_by_user
        ticket.updated_at = now
        ticket.save(update_fields=update_fields)

        new_priority = ticket.priority
        new_sla_policy = ticket.sla_policy

        TicketUpdateLog.objects.create(
            ticket=ticket,
            action_type=TicketActionType.AMEND,
            old_priority=old_priority if old_priority != new_priority else None,
            new_priority=new_priority if old_priority != new_priority else None,
            old_sla_policy=old_sla_policy if old_sla_policy != new_sla_policy else None,
            new_sla_policy=new_sla_policy if old_sla_policy != new_sla_policy else None,
            note="Amend ticket information",
            created_by_user=updated_by_user,
            created_at=now,
        )

        for item in changed_items:
            TicketActivityLog.objects.create(
                ticket=ticket,
                action_type=TicketActionType.AMEND,
                action_name=f"Amend {item['field_name']}",
                old_value=str(item["old_value"]) if item["old_value"] is not None else "",
                new_value=str(item["new_value"]) if item["new_value"] is not None else "",
                created_by_user=updated_by_user,
                created_at=now,
                note="Ticket information updated",
            )

        if old_sla_policy != new_sla_policy and new_sla_policy is not None:
            SlaService.create_sla_tracking_for_ticket(
                ticket=ticket,
                sla_policy=new_sla_policy,
            )

        # Sửa ticket khi đang "Đã xong" → dời mốc hoàn thành tới lúc sửa, và
        # reset đồng hồ đếm 1h (auto-close tính lại từ lần sửa cuối cùng).
        current_code = (
            ticket.current_status.status_code if ticket.current_status else None
        )
        if current_code == TicketStatusCode.DONE_WAIT_CLOSE:
            tracking = getattr(ticket, "sla_tracking", None)
            if tracking:
                tracking.completed_at = now
                tracking.updated_at = now
                tracking.save(update_fields=["completed_at", "updated_at"])

        return ticket