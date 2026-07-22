from datetime import datetime, time

from django.db import migrations
from django.utils import timezone


def backfill_created_at(apps, schema_editor):
    """
    Điền created_at cho ticket chatbot cũ.

    TimeStampedModel để created_at null=True và không auto_now_add, còn code tạo
    ticket trước đây không gán tay → toàn bộ ticket chatbot có created_at NULL,
    nên vô hình với mọi báo cáo lọc theo khoảng ngày.

    Thứ tự ưu tiên lấy mốc: thời điểm bắt đầu phiên chat → ngày nhúng trong
    ticket_code (CB + YYYYMMDD, luôn có) → thời điểm chạy migration.
    """
    TicketChatbot = apps.get_model("chatbots", "TicketChatbot")
    ChatbotSessionSummary = apps.get_model("chatbots", "ChatbotSessionSummary")

    started_by_ticket = dict(
        ChatbotSessionSummary.objects.filter(
            ticket_chatbot__isnull=False,
            started_at__isnull=False,
        ).values_list("ticket_chatbot_id", "started_at")
    )

    now = timezone.now()

    for ticket in TicketChatbot.objects.filter(created_at__isnull=True):
        stamp = started_by_ticket.get(ticket.id) or _date_from_code(ticket.ticket_code) or now

        ticket.created_at = stamp
        ticket.updated_at = ticket.updated_at or stamp
        ticket.save(update_fields=["created_at", "updated_at"])


def _date_from_code(code):
    """CB202607160001 -> datetime 2026-07-16 00:00 (theo timezone hiện hành)."""
    if not code or not code.startswith("CB") or len(code) < 10:
        return None

    try:
        day = datetime.strptime(code[2:10], "%Y%m%d").date()
    except ValueError:
        return None

    return timezone.make_aware(datetime.combine(day, time.min))


def noop(apps, schema_editor):
    """Không xoá lại created_at: mất mốc thì báo cáo theo kỳ hỏng lần nữa."""


class Migration(migrations.Migration):

    dependencies = [
        ("chatbots", "0011_ticketchatbotactivitylog"),
    ]

    operations = [
        migrations.RunPython(backfill_created_at, noop),
    ]
