from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.common.constants import TaskStatus, SlaStatus
from apps.sla.models import (
    SlaPolicyTask,
    SlaPolicyTaskDependency,
    TicketSlaTracking,
    TicketTask,
    TicketTaskDependency,
    TicketTaskLog,
    TicketOrganizationUnitSlaTracking,
)


class SlaService:
    @staticmethod
    def create_sla_tracking_for_ticket(*, ticket, sla_policy):
        now = timezone.now()

        response_due_at = None
        assignment_due_at = None
        processing_due_at = None
        resolution_due_at = None

        if sla_policy.response_time_minutes is not None:
            response_due_at = now + timedelta(minutes=sla_policy.response_time_minutes)

        if sla_policy.assignment_time_minutes is not None:
            assignment_due_at = now + timedelta(minutes=sla_policy.assignment_time_minutes)

        if sla_policy.processing_time_minutes is not None:
            processing_due_at = now + timedelta(minutes=sla_policy.processing_time_minutes)

        if sla_policy.resolution_time_minutes is not None:
            resolution_due_at = now + timedelta(minutes=sla_policy.resolution_time_minutes)

        tracking, _ = TicketSlaTracking.objects.update_or_create(
            ticket=ticket,
            defaults={
                "sla_policy": sla_policy,
                "assigned_at": ticket.assigned_at,
                "processing_started_at": ticket.processing_started_at,
                "completed_at": ticket.done_at,
                "closed_at": ticket.closed_at,
                "response_due_at": response_due_at,
                "assignment_due_at": assignment_due_at,
                "processing_due_at": processing_due_at,
                "resolution_due_at": resolution_due_at,
                "standard_response_minutes": sla_policy.response_time_minutes,
                "standard_assignment_minutes": sla_policy.assignment_time_minutes,
                "standard_processing_minutes": sla_policy.processing_time_minutes,
                "standard_resolution_minutes": sla_policy.resolution_time_minutes,
                "sla_status": SlaStatus.PROCESSING,
                "updated_at": now,
            },
        )

        return tracking

    @staticmethod
    def resolve_task_branch(*, ticket, policy_task):
        resolve_type = policy_task.branch_resolve_type

        if resolve_type == "FIXED_BRANCH":
            return policy_task.default_branch

        if resolve_type == "TICKET_BRANCH":
            return ticket.handling_branch

        if resolve_type == "CUSTOMER_BRANCH":
            if ticket.customer_id:
                return ticket.customer.branch
            return ticket.handling_branch

        if resolve_type == "MANUAL_SELECT":
            return policy_task.default_branch or ticket.handling_branch

        if policy_task.default_branch_id:
            return policy_task.default_branch

        if policy_task.organization_unit_id and policy_task.organization_unit.branch_id:
            return policy_task.organization_unit.branch

        return ticket.handling_branch

    @staticmethod
    @transaction.atomic
    def copy_tasks_from_policy(*, ticket, sla_policy, created_by_user=None):
        now = timezone.now()

        policy_tasks = list(
            SlaPolicyTask.objects.filter(
                sla_policy=sla_policy,
                is_active=True,
            ).order_by("sort_order", "id")
        )

        dependencies = list(
            SlaPolicyTaskDependency.objects.filter(
                sla_policy=sla_policy,
            )
        )

        depended_task_ids = {dep.task_id for dep in dependencies}
        task_map = {}

        for policy_task in policy_tasks:
            task_status = (
                TaskStatus.PENDING
                if policy_task.id in depended_task_ids
                else TaskStatus.READY
            )

            ticket_task = TicketTask.objects.create(
                ticket=ticket,
                sla_policy_task=policy_task,
                task_name=policy_task.task_name,
                task_description=policy_task.task_description,
                organization_unit=policy_task.organization_unit,
                branch=SlaService.resolve_task_branch(
                    ticket=ticket,
                    policy_task=policy_task,
                ),
                assigned_employee=None,
                task_status=task_status,
                is_required=policy_task.is_required,
                is_sla_counted=policy_task.is_sla_counted,
                standard_minutes=policy_task.standard_minutes,
                actual_minutes=None,
                sla_status=SlaStatus.PROCESSING if policy_task.is_sla_counted else None,
                start_at=None,
                due_at=None,
                completed_at=None,
                created_by_user=created_by_user,
                created_at=now,
                updated_at=now,
            )

            task_map[policy_task.id] = ticket_task

            TicketTaskLog.objects.create(
                ticket=ticket,
                ticket_task=ticket_task,
                action_type="CREATE",
                to_status=task_status,
                created_by_user=created_by_user,
                created_at=now,
            )

        for dep in dependencies:
            task = task_map.get(dep.task_id)
            depends_on_task = task_map.get(dep.depends_on_task_id)

            if task is None or depends_on_task is None:
                continue

            TicketTaskDependency.objects.create(
                ticket=ticket,
                task=task,
                depends_on_task=depends_on_task,
                dependency_type=dep.dependency_type,
                created_at=now,
            )

        SlaService.rebuild_organization_unit_sla_tracking(ticket=ticket)

        return list(task_map.values())

    @staticmethod
    def rebuild_organization_unit_sla_tracking(*, ticket):
        now = timezone.now()

        TicketOrganizationUnitSlaTracking.objects.filter(ticket=ticket).delete()

        tasks = TicketTask.objects.filter(ticket=ticket).select_related(
            "organization_unit",
            "branch",
        )

        grouped = {}

        for task in tasks:
            if task.organization_unit_id is None:
                continue

            key = (task.organization_unit_id, task.branch_id)

            if key not in grouped:
                grouped[key] = {
                    "organization_unit": task.organization_unit,
                    "branch": task.branch,
                    "task_count": 0,
                    "completed_task_count": 0,
                    "overdue_task_count": 0,
                    "total_standard_minutes": 0,
                    "total_actual_minutes": 0,
                    "sla_status": SlaStatus.PROCESSING,
                }

            item = grouped[key]
            item["task_count"] += 1

            if task.task_status == TaskStatus.DONE:
                item["completed_task_count"] += 1

            if task.sla_status == SlaStatus.OVERDUE:
                item["overdue_task_count"] += 1
                item["sla_status"] = SlaStatus.OVERDUE

            item["total_standard_minutes"] += task.standard_minutes or 0
            item["total_actual_minutes"] += task.actual_minutes or 0

        for item in grouped.values():
            TicketOrganizationUnitSlaTracking.objects.create(
                ticket=ticket,
                organization_unit=item["organization_unit"],
                branch=item["branch"],
                total_standard_minutes=item["total_standard_minutes"],
                total_actual_minutes=item["total_actual_minutes"],
                task_count=item["task_count"],
                completed_task_count=item["completed_task_count"],
                overdue_task_count=item["overdue_task_count"],
                sla_status=item["sla_status"],
                created_at=now,
                updated_at=now,
            )