"""
Bỏ trạng thái trung gian "Chờ đóng" (PENDING_CLOSE) khỏi vòng đời ticket.

Vòng đời còn lại: Mở → Tiếp nhận → Đang xử lý → Đã xong (chờ đóng) → Đã đóng.
Việc "chờ đóng" vốn đã nằm ngay trong DONE_WAIT_CLOSE — ticket ở đó một tiếng
thì job SLA tự chuyển sang CLOSED — nên một trạng thái riêng chỉ làm vòng đời
dài thêm mà không mang thêm thông tin.

CANCELLED giữ nguyên: hủy không phải một bước trong vòng đời mà là một lối ra
riêng, vẫn chọn được ở phần Thông tin chung khi cần hủy ticket.

Ticket.current_status và TicketProcessLog.status là PROTECT nên phải dời mọi
tham chiếu sang DONE_WAIT_CLOSE trước khi xoá, không thì migration sẽ chết trên
môi trường đã lỡ dùng trạng thái này.
"""

from django.db import migrations

PENDING_CLOSE = "PENDING_CLOSE"
DONE_WAIT_CLOSE = "DONE_WAIT_CLOSE"

NEW_DONE_LABEL = "Đã xong (chờ đóng)"
OLD_DONE_LABEL = "Đã xong"

SORT_ORDER_AFTER = {
    "CREATED": 1,
    "ACCEPTED": 2,
    "PROCESSING": 3,
    "DONE_WAIT_CLOSE": 4,
    "CLOSED": 5,
    "CANCELLED": 6,
}

SORT_ORDER_BEFORE = {
    "CREATED": 1,
    "ACCEPTED": 2,
    "PROCESSING": 3,
    "DONE_WAIT_CLOSE": 4,
    "PENDING_CLOSE": 5,
    "CLOSED": 6,
    "CANCELLED": 7,
}


def remove_pending_close(apps, schema_editor):
    TicketStatus = apps.get_model("tickets", "TicketStatus")
    Ticket = apps.get_model("tickets", "Ticket")
    TicketProcessLog = apps.get_model("tickets", "TicketProcessLog")
    TicketUpdateLog = apps.get_model("tickets", "TicketUpdateLog")

    pending = TicketStatus.objects.filter(status_code=PENDING_CLOSE).first()
    done = TicketStatus.objects.filter(status_code=DONE_WAIT_CLOSE).first()

    if pending is not None:
        if done is not None:
            Ticket.objects.filter(current_status=pending).update(current_status=done)
            TicketProcessLog.objects.filter(status=pending).update(status=done)
            TicketUpdateLog.objects.filter(from_status=pending).update(from_status=done)
            TicketUpdateLog.objects.filter(to_status=pending).update(to_status=done)

        pending.delete()

    if done is not None:
        done.status_name = NEW_DONE_LABEL
        done.save(update_fields=["status_name"])

    for status_code, sort_order in SORT_ORDER_AFTER.items():
        TicketStatus.objects.filter(status_code=status_code).update(
            sort_order=sort_order
        )


def restore_pending_close(apps, schema_editor):
    TicketStatus = apps.get_model("tickets", "TicketStatus")

    TicketStatus.objects.update_or_create(
        status_code=PENDING_CLOSE,
        defaults={
            "status_name": "Chờ đóng",
            "sort_order": SORT_ORDER_BEFORE[PENDING_CLOSE],
            "is_active": True,
            "is_final": False,
        },
    )

    TicketStatus.objects.filter(status_code=DONE_WAIT_CLOSE).update(
        status_name=OLD_DONE_LABEL
    )

    for status_code, sort_order in SORT_ORDER_BEFORE.items():
        TicketStatus.objects.filter(status_code=status_code).update(
            sort_order=sort_order
        )


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0013_remove_ticketassignment_ticket_assi_to_unit_3e3d44_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(remove_pending_close, restore_pending_close),
    ]
