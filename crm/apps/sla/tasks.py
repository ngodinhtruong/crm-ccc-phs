"""
Job quét SLA định kỳ.

Trước khi có job này, hệ thống chỉ phát hiện ticket trễ hạn một cách thụ động —
đúng lúc có người bấm đổi trạng thái. Ticket nằm im thì không ai biết nó đã trễ.

Job chạy nền theo lịch (Celery beat), quét cả 2 loại ticket:
  1. Ticket thường  → TicketSlaTracking
  2. Ticket chatbot → cột SLA ngay trên TicketChatbot

Việc job làm: đánh dấu OVERDUE → sinh TicketAlert → tạo TicketSlaReminder
theo các quy tắc leo thang (SlaEscalationRule) đã cấu hình.
"""

from datetime import timedelta

from celery import shared_task
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone

from apps.common.constants import SlaStatus
from apps.sla.models import (
    SlaEscalationRule,
    TicketAlert,
    TicketSlaReminder,
    TicketSlaTracking,
)

# Trạng thái coi như ticket đã kết thúc → không quét nữa
CLOSED_STATUS_CODES = ("CLOSED", "CANCELLED", "DA_XONG", "CHO_HUY")

ALERT_SLA_OVERDUE = "SLA_OVERDUE"
ALERT_SLA_72H = "SLA_72H_OVERDUE"


def _resolve_recipient(rule, ticket):
    """
    Tìm user nhận nhắc theo recipient_type của quy tắc leo thang.

    Hệ thống chưa có sơ đồ cấp bậc (manager/head/BOM) nên các cấp trên tạm
    quy về người xử lý; khi có mô hình phân cấp thì mở rộng ở đây.
    """
    recipient_type = (rule.recipient_type or "").upper()

    if recipient_type == "ASSIGNED_EMPLOYEE":
        employee = getattr(ticket, "assigned_employee", None)
        return getattr(employee, "user_account", None) or getattr(
            ticket, "owner_user", None
        )

    if recipient_type == "FOLLOWERS":
        follower = ticket.followers.select_related("user").first() if hasattr(
            ticket, "followers"
        ) else None
        return follower.user if follower else None

    # MANAGER / HEAD / BOM: chưa map được cấp bậc → gửi cho chủ ticket
    return getattr(ticket, "owner_user", None)


def _should_trigger(rule, overdue_minutes):
    """Quy tắc này đã tới lúc kích hoạt chưa, dựa trên số phút đã trễ."""
    trigger = (rule.trigger_type or "").upper()

    if trigger == "OVERDUE_IMMEDIATE":
        return overdue_minutes >= 0

    if trigger == "OVERDUE_AFTER_MINUTES":
        return overdue_minutes >= (rule.trigger_after_minutes or 0)

    if trigger == "DAILY_UNTIL_CLOSED":
        return overdue_minutes >= 0

    return False


def _create_alert(ticket, alert_type, title, content):
    """Tạo cảnh báo, tránh trùng: mỗi loại chỉ 1 cảnh báo ACTIVE cho một ticket."""
    exists = TicketAlert.objects.filter(
        ticket=ticket,
        alert_type=alert_type,
        status="ACTIVE",
    ).exists()

    if exists:
        return None

    now = timezone.now()

    return TicketAlert.objects.create(
        ticket=ticket,
        alert_type=alert_type,
        title=title,
        content=content,
        status="ACTIVE",
        triggered_at=now,
        created_at=now,
        updated_at=now,
    )


def _create_reminders(ticket, tracking, overdue_minutes):
    """Tạo nhắc nhở theo các quy tắc leo thang đang áp cho ticket."""
    rules = SlaEscalationRule.objects.filter(is_active=True).filter(
        Q(sla_policy__isnull=True) | Q(sla_policy=tracking.sla_policy)
    )

    created = 0
    now = timezone.now()

    for rule in rules:
        if not _should_trigger(rule, overdue_minutes):
            continue

        # Quy tắc lặp lại: chỉ nhắc tiếp khi đã qua đủ chu kỳ
        if (rule.trigger_type or "").upper() == "DAILY_UNTIL_CLOSED":
            interval = rule.repeat_interval_minutes or 1440
            recent = TicketSlaReminder.objects.filter(
                ticket=ticket,
                escalation_rule=rule,
                created_at__gte=now - timedelta(minutes=interval),
            ).exists()

            if recent:
                continue
        else:
            # Quy tắc một lần: đã nhắc rồi thì thôi
            if TicketSlaReminder.objects.filter(
                ticket=ticket, escalation_rule=rule
            ).exists():
                continue

        user = _resolve_recipient(rule, ticket)

        TicketSlaReminder.objects.create(
            ticket=ticket,
            sla_tracking=tracking,
            escalation_rule=rule,
            recipient_user=user,
            recipient_email=getattr(user, "email", None),
            channel=rule.channel,
            status="PENDING",
            created_at=now,
        )
        created += 1

    return created


def scan_normal_tickets():
    """Quét ticket thường (dựa trên TicketSlaTracking)."""
    now = timezone.now()
    result = {"checked": 0, "marked_overdue": 0, "alerts": 0, "reminders": 0}

    trackings = (
        TicketSlaTracking.objects.select_related("ticket", "sla_policy")
        .filter(resolution_due_at__isnull=False, resolution_due_at__lt=now)
        .exclude(ticket__current_status__status_code__in=CLOSED_STATUS_CODES)
    )

    for tracking in trackings:
        ticket = tracking.ticket
        result["checked"] += 1

        overdue_minutes = int(
            (now - tracking.resolution_due_at).total_seconds() / 60
        )

        # Đánh dấu quá hạn lần đầu
        if tracking.sla_status != SlaStatus.OVERDUE or not tracking.breached_at:
            tracking.sla_status = SlaStatus.OVERDUE
            tracking.breached_at = tracking.breached_at or tracking.resolution_due_at
            tracking.updated_at = now
            tracking.save(
                update_fields=["sla_status", "breached_at", "updated_at"]
            )
            result["marked_overdue"] += 1

        if _create_alert(
            ticket,
            ALERT_SLA_OVERDUE,
            f"Ticket {ticket.ticket_code} đã vượt SLA",
            f"Quá hạn hoàn tất {overdue_minutes} phút "
            f"(hạn: {tracking.resolution_due_at:%d/%m/%Y %H:%M}).",
        ):
            result["alerts"] += 1

        # Trễ quá 72 giờ → cảnh báo mức cao hơn
        if overdue_minutes >= 72 * 60 and _create_alert(
            ticket,
            ALERT_SLA_72H,
            f"Ticket {ticket.ticket_code} trễ trên 72 giờ",
            f"Đã quá hạn {overdue_minutes // 60} giờ, cần xử lý gấp.",
        ):
            result["alerts"] += 1

        result["reminders"] += _create_reminders(ticket, tracking, overdue_minutes)

    return result


def scan_chatbot_tickets():
    """Quét ticket chatbot (deadline lưu ngay trên TicketChatbot)."""
    from apps.chatbots.models import TicketChatbot

    now = timezone.now()
    result = {"checked": 0, "marked_overdue": 0}

    tickets = TicketChatbot.objects.filter(
        resolution_due_at__isnull=False,
        resolution_due_at__lt=now,
    ).exclude(current_status__status_code__in=CLOSED_STATUS_CODES)

    for ticket in tickets:
        result["checked"] += 1

        if (
            ticket.sla_status == TicketChatbot.SLA_OVERDUE
            and ticket.breached_at
        ):
            continue

        ticket.sla_status = TicketChatbot.SLA_OVERDUE
        ticket.breached_at = ticket.breached_at or ticket.resolution_due_at
        ticket.updated_at = now
        ticket.save(
            update_fields=["sla_status", "breached_at", "updated_at"]
        )
        result["marked_overdue"] += 1

    return result


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def scan_sla_overdue_task(self):
    """
    Quét toàn bộ ticket quá hạn SLA.

    Có khoá để 2 lần chạy không chồng lên nhau (giống task sync chatbot).
    """
    lock_key = "lock:scan_sla_overdue"
    acquired = cache.add(lock_key, "1", 60 * 5)

    if not acquired:
        return {"status": "SKIPPED", "reason": "Another scan is running"}

    try:
        normal = scan_normal_tickets()
        chatbot = scan_chatbot_tickets()

        return {
            "status": "SUCCESS",
            "normal_tickets": normal,
            "chatbot_tickets": chatbot,
        }
    finally:
        cache.delete(lock_key)
