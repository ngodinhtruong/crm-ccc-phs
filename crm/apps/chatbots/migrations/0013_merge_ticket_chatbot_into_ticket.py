from django.db import migrations


# channel thô từ Supabase -> source_code trong ticket_sources
CHANNEL_TO_SOURCE = {
    "xpro": "XPRO",
    "x pro": "XPRO",
    "zalo": "ZALO",
    "facebook": "FACEBOOK",
    "fb": "FACEBOOK",
    "web": "WEB",
    "app": "APP",
}

# contact_type thô từ chatbot -> mã chuẩn của Ticket
ACCOUNT_HINTS = ("account", "stk", "số tk", "so tk", "tài khoản", "tai khoan")
EMAIL_HINTS = ("email", "mail")


def normalize_contact_type(raw, value):
    text = str(raw or "").lower()

    if any(h in text for h in ACCOUNT_HINTS):
        return "ACCOUNT"

    if any(h in text for h in EMAIL_HINTS):
        return "EMAIL"

    if "phone" in text or "sdt" in text or "điện thoại" in text:
        return "PHONE"

    # Không đoán được từ contact_type thì suy từ chính giá trị
    if value and "@" in str(value):
        return "EMAIL"

    return "PHONE" if value else None


def migrate_chatbot_tickets(apps, schema_editor):
    """
    Chuyển ticket_chatbots sang bảng tickets dùng chung.

    Ánh xạ:
      link_status        -> account_link_status (trùng giá trị)
      account_number/phone/contact_info -> contact_value + contact_type
      channel            -> source (XPRO/ZALO/FACEBOOK...), fallback CHATBOT
      9 cột SLA inline   -> TicketSlaTracking
      send_survey        -> TicketFeedback.survey_sent
      activity log riêng -> TicketActivityLog
    """
    TicketChatbot = apps.get_model("chatbots", "TicketChatbot")
    TicketChatbotActivityLog = apps.get_model("chatbots", "TicketChatbotActivityLog")
    ChatbotSessionSummary = apps.get_model("chatbots", "ChatbotSessionSummary")

    Ticket = apps.get_model("tickets", "Ticket")
    TicketSource = apps.get_model("tickets", "TicketSource")
    TicketActivityLog = apps.get_model("tickets", "TicketActivityLog")
    TicketFeedback = apps.get_model("tickets", "TicketFeedback")
    TicketSlaTracking = apps.get_model("sla", "TicketSlaTracking")
    Branch = apps.get_model("branches", "Branch")

    sources = {s.source_code: s for s in TicketSource.objects.all()}
    chatbot_source = sources.get("CHATBOT")

    # handling_branch của Ticket là NOT NULL; ticket chatbot cũ có thể để trống.
    fallback_branch = Branch.objects.order_by("id").first()

    if fallback_branch is None:
        raise RuntimeError(
            "Chưa có chi nhánh nào — không thể chuyển ticket chatbot sang bảng tickets."
        )

    for old in TicketChatbot.objects.all().iterator():
        source = None

        if old.channel:
            source = sources.get(CHANNEL_TO_SOURCE.get(str(old.channel).strip().lower()))

        source = source or chatbot_source

        contact_value = old.account_number or old.phone or old.contact_info
        contact_type = normalize_contact_type(old.contact_type, contact_value)

        # account_number có mặt nghĩa là khách đưa số TK, ưu tiên kết luận đó
        if old.account_number:
            contact_type = "ACCOUNT"

        new = Ticket.objects.create(
            ticket_code=old.ticket_code,
            title=old.title,
            customer=old.customer,
            customer_account=old.customer_account,
            account_link_status=old.link_status or "UNLINKED",
            contact_type=contact_type,
            contact_value=contact_value,
            handling_branch=old.handling_branch or fallback_branch,
            assigned_unit=old.assigned_unit,
            assigned_employee=old.assigned_employee,
            owner_user=old.owner_user,
            current_status=old.current_status,
            priority=old.priority,
            source=source,
            sla_policy=old.sla_policy,
            classification_method="AUTO",
            source_ref_id=old.source_ref_id,
            request_content=old.request_content or old.reason,
            handling_solution=old.handling_solution,
            accepted_at=old.accepted_at,
            accepted_by_user=old.accepted_by_user,
            done_at=old.done_at,
            cancelled_at=old.cancelled_at,
            cancelled_reason=old.cancelled_reason,
            created_at=old.created_at,
            updated_at=old.updated_at,
        )

        # 9 cột SLA inline -> bảng tracking dùng chung
        if old.sla_policy_id or old.resolution_due_at or old.sla_status:
            TicketSlaTracking.objects.create(
                ticket=new,
                sla_policy=old.sla_policy,
                response_due_at=old.response_due_at,
                assignment_due_at=old.assignment_due_at,
                processing_due_at=old.processing_due_at,
                resolution_due_at=old.resolution_due_at,
                breached_at=old.breached_at,
                sla_status=old.sla_status,
                breach_reason=old.breach_reason,
                breach_note=old.breach_note,
                breach_reason_submitted=old.breach_reason_submitted,
                completed_at=old.done_at,
                created_at=old.created_at,
                updated_at=old.updated_at,
            )

        # send_survey -> bảng feedback dùng chung
        if old.send_survey:
            TicketFeedback.objects.create(
                ticket=new,
                customer=old.customer,
                survey_sent=True,
                survey_status="SENT",
                created_at=old.created_at,
                updated_at=old.updated_at,
            )

        # Lịch sử thay đổi: 2 bảng có cấu trúc giống hệt nhau
        TicketActivityLog.objects.bulk_create(
            [
                TicketActivityLog(
                    ticket=new,
                    action_type=log.action_type,
                    action_name=log.action_name,
                    old_value=log.old_value,
                    new_value=log.new_value,
                    created_by_user=log.created_by_user,
                    created_at=log.created_at,
                    note=log.note,
                )
                for log in TicketChatbotActivityLog.objects.filter(ticket=old)
            ]
        )

        # Nối phiên chat về ticket mới qua FK ticket đã có sẵn
        ChatbotSessionSummary.objects.filter(ticket_chatbot=old).update(ticket=new)


def noop(apps, schema_editor):
    """Không khôi phục: bảng ticket_chatbots bị xoá ở migration kế tiếp."""


class Migration(migrations.Migration):

    dependencies = [
        ("chatbots", "0012_backfill_ticketchatbot_created_at"),
        ("tickets", "0011_ticket_contact_type_value"),
        ("sla", "0006_ticket_account_link_status_and_code_rule"),
        ("branches", "0003_alter_branch_id_alter_employee_id_and_more"),
    ]

    operations = [
        migrations.RunPython(migrate_chatbot_tickets, noop),
    ]
