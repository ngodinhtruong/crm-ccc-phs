from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)
from apps.customers.models import Customer, CustomerAccount
from apps.tickets.models import (
    Ticket,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
)


BOT_DONE_CATEGORIES = ["FAQ", "RESEARCH", "CUSTOMER_CARE"]
SPAM_CATEGORIES = ["UNRELATED", "GREETING"]


def normalize_category(value):
    return str(value or "").strip().upper()


def normalize_state(value):
    return str(value or "").strip().lower()


def map_dashboard_category(category, reason=""):
    category = normalize_category(category)
    reason_text = str(reason or "").lower()

    if "giao dịch" in reason_text or "lệnh" in reason_text or "mua bán" in reason_text:
        return "Hỗ trợ Giao dịch"

    if "tài khoản" in reason_text or "đăng nhập" in reason_text or "xác thực" in reason_text:
        return "Quản lý Tài khoản PHS"

    if "app" in reason_text or "mobile" in reason_text or "ứng dụng" in reason_text:
        return "Ứng dụng PHS"

    if category == "CUSTOMER_CARE":
        return "Dịch vụ CSKH"

    if category == "FAQ":
        return "FAQ"

    if category == "RESEARCH":
        return "Tra cứu / Tư vấn"

    return "Khác"


def build_full_conversation(logs):
    lines = []

    for index, log in enumerate(logs, start=1):
        if log.question:
            lines.append(f"{index}. KH: {log.question}")

        if log.answer:
            lines.append(f"   Bot: {log.answer}")

    return "\n".join(lines)


def detect_outcome(session_id, main_category, latest_state, cskh_request):
    category = normalize_category(main_category)
    state = normalize_state(latest_state.state if latest_state else "")

    if cskh_request:
        return ChatbotSessionSummary.OUTCOME_CCC

    if category in SPAM_CATEGORIES:
        return ChatbotSessionSummary.OUTCOME_SPAM

    if state == "waiting_info":
        check_time = latest_state.external_created_at if latest_state else None

        if check_time and timezone.now() - check_time > timedelta(minutes=30):
            return ChatbotSessionSummary.OUTCOME_TIMEOUT

        return ChatbotSessionSummary.OUTCOME_WAITING_INFO

    if state == "collected":
        return ChatbotSessionSummary.OUTCOME_COLLECTED

    if state == "closed" and category in BOT_DONE_CATEGORIES:
        return ChatbotSessionSummary.OUTCOME_BOT_DONE

    if state == "closed":
        return ChatbotSessionSummary.OUTCOME_SPAM

    return ChatbotSessionSummary.OUTCOME_WAITING_INFO


def rebuild_chatbot_session_summaries():
    session_ids = set(ChatbotChatLog.objects.values_list("session_id", flat=True))
    session_ids.update(ChatbotState.objects.values_list("session_id", flat=True))
    session_ids.update(ChatbotCskhRequest.objects.values_list("session_id", flat=True))

    for session_id in session_ids:
        logs = list(
            ChatbotChatLog.objects.filter(session_id=session_id).order_by(
                "external_created_at",
                "id",
            )
        )

        latest_state = (
            ChatbotState.objects.filter(session_id=session_id)
            .order_by("-external_created_at", "-id")
            .first()
        )

        cskh_request = (
            ChatbotCskhRequest.objects.filter(session_id=session_id)
            .order_by("-external_created_at", "-id")
            .first()
        )

        first_log = logs[0] if logs else None
        last_log = logs[-1] if logs else None

        main_category = ""
        if cskh_request and cskh_request.reason:
            main_category = latest_state.category if latest_state else ""
        elif last_log:
            main_category = last_log.category or ""
        elif latest_state:
            main_category = latest_state.category or ""

        outcome_type = detect_outcome(
            session_id=session_id,
            main_category=main_category,
            latest_state=latest_state,
            cskh_request=cskh_request,
        )

        started_at = None
        ended_at = None

        if logs:
            started_at = logs[0].external_created_at
            ended_at = logs[-1].external_created_at

        if not started_at and latest_state:
            started_at = latest_state.external_created_at

        if cskh_request and cskh_request.external_created_at:
            ended_at = cskh_request.external_created_at

        ChatbotSessionSummary.objects.update_or_create(
            session_id=session_id,
            defaults={
                "user_id": (
                    cskh_request.user_id
                    if cskh_request
                    else latest_state.user_id
                    if latest_state
                    else first_log.user_id
                    if first_log
                    else ""
                ),
                "channel": (
                    cskh_request.channel
                    if cskh_request
                    else latest_state.channel
                    if latest_state
                    else first_log.channel
                    if first_log
                    else ""
                ),
                "main_category": normalize_category(main_category),
                "dashboard_category": map_dashboard_category(
                    main_category,
                    cskh_request.reason if cskh_request else "",
                ),
                "state": latest_state.state if latest_state else "",
                "outcome_type": outcome_type,
                "has_cskh_request": bool(cskh_request),
                "contact_info": cskh_request.contact_info if cskh_request else "",
                "contact_type": cskh_request.contact_type if cskh_request else "",
                "reason": cskh_request.reason if cskh_request else "",
                "first_question": first_log.question if first_log else "",
                "last_question": last_log.question if last_log else "",
                "full_conversation": build_full_conversation(logs),
                "started_at": started_at,
                "ended_at": ended_at,
            },
        )


def get_or_create_chatbot_source():
    source, _ = TicketSource.objects.get_or_create(
        source_code="CHATBOT",
        defaults={
            "source_name": "Chatbot",
            "is_active": True,
        },
    )

    return source


def get_or_create_ticket_status(code, name, is_final=False):
    status, _ = TicketStatus.objects.get_or_create(
        status_code=code,
        defaults={
            "status_name": name,
            "is_final": is_final,
            "is_active": True,
        },
    )

    return status


def get_or_create_support_category(summary):
    category_code = summary.dashboard_category or "Khác"

    category, _ = TicketSupportCategory.objects.get_or_create(
        category_code=category_code.upper().replace(" ", "_"),
        defaults={
            "category_name": category_code,
            "is_active": True,
        },
    )

    return category


def generate_ticket_code():
    today = timezone.localdate()
    prefix = f"CB{today.strftime('%Y%m%d')}"

    latest = (
        Ticket.objects.filter(ticket_code__startswith=prefix)
        .order_by("-ticket_code")
        .first()
    )

    if not latest:
        return f"{prefix}0001"

    last_number = int(latest.ticket_code[-4:])
    return f"{prefix}{last_number + 1:04d}"


def find_customer_by_contact(contact_type, contact_info):
    contact_type = str(contact_type or "").lower()
    contact_info = str(contact_info or "").strip()

    if not contact_info:
        return None, None

    if "account" in contact_type or "số tk" in contact_type or "stk" in contact_type:
        account = (
            CustomerAccount.objects.select_related("customer")
            .filter(account_number=contact_info)
            .first()
        )

        if account:
            return account.customer, account

    customer = Customer.objects.filter(
        Q(phone=contact_info) | Q(email=contact_info)
    ).first()

    return customer, None


def create_crm_tickets_from_chatbot(default_branch):
    chatbot_source = get_or_create_chatbot_source()
    status_new = get_or_create_ticket_status("NEW", "Mới", is_final=False)

    summaries = ChatbotSessionSummary.objects.filter(
        outcome_type=ChatbotSessionSummary.OUTCOME_CCC,
        ticket__isnull=True,
    )

    for summary in summaries:
        existing_ticket = Ticket.objects.filter(
            source=chatbot_source,
            source_ref_id=summary.session_id,
        ).first()

        if existing_ticket:
            summary.ticket = existing_ticket
            summary.save(update_fields=["ticket"])
            continue

        customer, customer_account = find_customer_by_contact(
            summary.contact_type,
            summary.contact_info,
        )

        support_category = get_or_create_support_category(summary)

        title = summary.reason or summary.last_question or "Yêu cầu từ Chatbot"

        request_content = "\n\n".join(
            [
                f"Session ID: {summary.session_id}",
                f"Kênh: {summary.channel or ''}",
                f"Thông tin KH: {summary.contact_info or ''}",
                f"Loại thông tin: {summary.contact_type or ''}",
                f"Lý do chuyển CCC: {summary.reason or ''}",
                "",
                "Nội dung hội thoại:",
                summary.full_conversation or "",
            ]
        )

        ticket = Ticket.objects.create(
            ticket_code=generate_ticket_code(),
            title=title[:255],
            customer=customer,
            customer_account=customer_account,
            handling_branch=default_branch,
            support_category=support_category,
            current_status=status_new,
            source=chatbot_source,
            source_ref_id=summary.session_id,
            request_content=request_content,
            classification_method="AUTO",
            created_by_user=None,
            updated_by_user=None,
        )

        summary.ticket = ticket
        summary.save(update_fields=["ticket"])