from django.db import migrations


def retire_pending_close(apps, schema_editor):
    """
    Bỏ trạng thái 'Chờ đóng' khỏi luồng ticket và đổi nhãn 'Đã xong'.

    Không xóa dòng PENDING_CLOSE: ticket_update_logs trỏ tới TicketStatus bằng
    SET_NULL nên xóa sẽ âm thầm làm rỗng lịch sử, còn tickets/ticket_chatbots/
    ticket_process_logs dùng PROTECT nên xóa sẽ vỡ migration ở môi trường còn
    dữ liệu. Tắt is_active là đủ vì mọi API danh mục đều lọc is_active=True,
    và code đã có whitelist chặn set mã này.
    """
    TicketStatus = apps.get_model("tickets", "TicketStatus")
    Ticket = apps.get_model("tickets", "Ticket")
    TicketChatbot = apps.get_model("chatbots", "TicketChatbot")

    done = TicketStatus.objects.filter(status_code="DONE_WAIT_CLOSE").first()
    pending = TicketStatus.objects.filter(status_code="PENDING_CLOSE").first()

    if done:
        done.status_name = "Đã xong (chờ đóng)"
        done.save(update_fields=["status_name"])

    if not pending:
        return

    # Ticket đang kẹt ở 'Chờ đóng' → đưa về 'Đã xong (chờ đóng)' để job
    # auto_close_done_tickets tự đóng sau 1 giờ, thay vì treo vô hạn.
    if done:
        Ticket.objects.filter(current_status=pending).update(current_status=done)
        TicketChatbot.objects.filter(current_status=pending).update(
            current_status=done
        )

    pending.status_name = "Chờ đóng (đã ngưng dùng)"
    pending.is_active = False
    pending.save(update_fields=["status_name", "is_active"])


def restore_pending_close(apps, schema_editor):
    """Bật lại dòng cũ. Không khôi phục được ticket đã bị chuyển trạng thái."""
    TicketStatus = apps.get_model("tickets", "TicketStatus")

    TicketStatus.objects.filter(status_code="PENDING_CLOSE").update(
        status_name="Chờ đóng",
        is_active=True,
    )
    TicketStatus.objects.filter(status_code="DONE_WAIT_CLOSE").update(
        status_name="Đã xong",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0009_ticket_account_link_status_and_code_rule"),
        ("chatbots", "0011_ticketchatbotactivitylog"),
    ]

    operations = [
        migrations.RunPython(retire_pending_close, restore_pending_close),
    ]
