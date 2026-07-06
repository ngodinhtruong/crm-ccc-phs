from django.utils import timezone

from apps.common.constants import NotificationType
from apps.notifications.models import Notification


class NotificationService:
    @staticmethod
    def create_notification(
        *,
        user,
        ticket=None,
        notification_type,
        title,
        content=None,
    ):
        if user is None:
            return None

        return Notification.objects.create(
            user=user,
            ticket=ticket,
            notification_type=notification_type,
            title=title,
            content=content or "",
            is_read=False,
            created_at=timezone.now(),
        )

    @staticmethod
    def notify_ticket_assigned(*, ticket, assigned_employee):
        if assigned_employee is None:
            return None

        user = getattr(assigned_employee, "user_account", None)

        if user is None:
            return None

        return NotificationService.create_notification(
            user=user,
            ticket=ticket,
            notification_type=NotificationType.ASSIGNED_TICKET,
            title="Bạn được giao ticket mới",
            content=f"Ticket {ticket.ticket_code} đã được giao cho bạn xử lý.",
        )