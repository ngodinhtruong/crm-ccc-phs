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

from apps.common.constants import SlaStatus, TicketStatusCode
from apps.sla.models import (
    SlaEscalationRule,
    TicketAlert,
    TicketSlaReminder,
    TicketSlaTracking,
)

# Trạng thái coi như ticket đã kết thúc → không quét nữa.
# Dùng hằng số thay vì chuỗi rời để không lệch khi đổi mã trạng thái.
CLOSED_STATUS_CODES = (
    TicketStatusCode.CLOSED,
    TicketStatusCode.CANCELLED,
)

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


# Ticket ở "Đã xong" quá số phút này thì tự đóng
AUTO_CLOSE_AFTER_MINUTES = 60

# Ghi trong log để phân biệt với thao tác của người dùng thật
AUTO_CLOSE_NOTE = (
    f"Hệ thống tự đóng sau {AUTO_CLOSE_AFTER_MINUTES} phút "
    "kể từ khi ticket ở trạng thái Đã xong."
)


def _close_process_log(ticket, now):
    """Đóng khoảng thời gian đang mở ở TicketProcessLog và tính số phút."""
    from apps.tickets.models import TicketProcessLog

    current_log = (
        TicketProcessLog.objects.filter(ticket=ticket, end_at__isnull=True)
        .order_by("-start_at", "-id")
        .first()
    )

    if current_log is None:
        return

    current_log.end_at = now
    update_fields = ["end_at"]

    if current_log.start_at is not None:
        duration = (now - current_log.start_at).total_seconds()
        current_log.duration_minutes = int(duration // 60)
        update_fields.append("duration_minutes")

    current_log.save(update_fields=update_fields)


def _write_auto_close_logs(ticket, from_status, to_status, now):
    """
    Ghi vết cho ticket thường.

    Auto-close không đi qua TicketService.update_status nên phải tự ghi log,
    nếu không việc đóng ticket sẽ biến mất khỏi lịch sử.
    """
    from apps.common.constants import TicketActionType
    from apps.tickets.models import TicketActivityLog, TicketUpdateLog

    TicketUpdateLog.objects.create(
        ticket=ticket,
        action_type=TicketActionType.CLOSE,
        from_status=from_status,
        to_status=to_status,
        note=AUTO_CLOSE_NOTE,
        created_by_user=None,
        created_at=now,
    )

    TicketActivityLog.objects.create(
        ticket=ticket,
        action_type=TicketActionType.CLOSE,
        action_name="Tự động đóng ticket",
        old_value=from_status.status_name if from_status else "",
        new_value=to_status.status_name if to_status else "",
        created_by_user=None,
        created_at=now,
        note=AUTO_CLOSE_NOTE,
    )


def _finalize_sla_tracking(ticket, now):
    """Chốt mốc closed_at và kết luận SLA trên bảng tracking."""
    tracking = getattr(ticket, "sla_tracking", None)

    if tracking is None:
        return

    update_fields = ["updated_at"]
    tracking.updated_at = now

    if tracking.closed_at is None:
        tracking.closed_at = now
        update_fields.append("closed_at")

    if tracking.sla_status != SlaStatus.OVERDUE:
        overdue = bool(
            tracking.breached_at
            or (
                tracking.resolution_due_at
                and now > tracking.resolution_due_at
            )
        )
        tracking.sla_status = (
            SlaStatus.OVERDUE if overdue else SlaStatus.ON_TIME
        )
        update_fields.append("sla_status")

    tracking.save(update_fields=update_fields)


def _write_chatbot_auto_close_log(ticket, from_label, now):
    """Ghi vết auto-close cho ticket chatbot."""
    from apps.chatbots.models import TicketChatbotActivityLog

    TicketChatbotActivityLog.objects.create(
        ticket=ticket,
        action_type="UPDATE_STATUS",
        action_name="Tự động đóng ticket",
        old_value=from_label or "",
        new_value=ticket.status_label or "",
        created_by_user=None,
        created_at=now,
        note=AUTO_CLOSE_NOTE,
    )


def auto_close_done_tickets():
    """
    Ticket ở 'Đã xong' (DONE_WAIT_CLOSE) quá 1 tiếng → tự chuyển 'Đã đóng' (CLOSED).
    Mốc đếm là completed_at; sửa ticket khi đang Đã xong sẽ dời mốc này.
    Áp cho cả ticket thường lẫn ticket chatbot.
    """
    from apps.chatbots.models import TicketChatbot
    from apps.tickets.models import Ticket, TicketStatus

    now = timezone.now()
    threshold = now - timedelta(minutes=AUTO_CLOSE_AFTER_MINUTES)
    result = {"normal_closed": 0, "chatbot_closed": 0}

    closed_status = TicketStatus.objects.filter(
        status_code=TicketStatusCode.CLOSED
    ).first()
    if not closed_status:
        return result

    # ── Ticket thường: mốc completed_at nằm ở TicketSlaTracking ──
    normal = (
        Ticket.objects.select_related("current_status", "sla_tracking")
        .filter(current_status__status_code=TicketStatusCode.DONE_WAIT_CLOSE)
        .filter(sla_tracking__completed_at__isnull=False)
        .filter(sla_tracking__completed_at__lt=threshold)
    )

    for ticket in normal:
        from_status = ticket.current_status

        ticket.current_status = closed_status
        ticket.closed_at = now
        ticket.is_locked_for_amend = True
        ticket.updated_at = now
        ticket.save(
            update_fields=[
                "current_status",
                "closed_at",
                "is_locked_for_amend",
                "updated_at",
            ]
        )

        _close_process_log(ticket, now)
        _write_auto_close_logs(ticket, from_status, closed_status, now)
        _finalize_sla_tracking(ticket, now)

        result["normal_closed"] += 1

    # ── Ticket chatbot: mốc done_at nằm ngay trên ticket ──
    chatbot = (
        TicketChatbot.objects.select_related("current_status")
        .filter(current_status__status_code=TicketStatusCode.DONE_WAIT_CLOSE)
        .filter(done_at__isnull=False, done_at__lt=threshold)
    )

    for ticket in chatbot:
        from_label = ticket.status_label

        ticket.current_status = closed_status

        # Chốt kết luận SLA ngay lúc đóng, không để treo None
        if ticket.sla_status != TicketChatbot.SLA_OVERDUE:
            ticket.sla_status = (
                TicketChatbot.SLA_OVERDUE
                if ticket.is_sla_overdue
                else TicketChatbot.SLA_ON_TIME
            )

        ticket.updated_at = now
        ticket.save(
            update_fields=["current_status", "sla_status", "updated_at"]
        )

        _write_chatbot_auto_close_log(ticket, from_label, now)

        result["chatbot_closed"] += 1

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
        auto_closed = auto_close_done_tickets()

        return {
            "status": "SUCCESS",
            "normal_tickets": normal,
            "chatbot_tickets": chatbot,
            "auto_closed": auto_closed,
        }
    finally:
        cache.delete(lock_key)
