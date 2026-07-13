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
    """
    Tạm thời để trống việc phân loại chủ đề Dashboard.
    Sau này có rule mới thì viết logic vào đây.
    """
    return ""  


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
    state = normalize_state(latest_state.step if latest_state else "")

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

    if category in BOT_DONE_CATEGORIES:
        return ChatbotSessionSummary.OUTCOME_BOT_DONE

    if state == "closed":
        return ChatbotSessionSummary.OUTCOME_SPAM

    return ChatbotSessionSummary.OUTCOME_WAITING_INFO


from collections import defaultdict

def rebuild_chatbot_session_summaries(affected_session_ids=None):
    # 1. Determine which session IDs to process
    if affected_session_ids is not None:
        session_ids = set(affected_session_ids)
    else:
        # Full rebuild: collect all session IDs
        session_ids = set(ChatbotChatLog.objects.values_list("session_id", flat=True))
        session_ids.update(ChatbotState.objects.values_list("session_id", flat=True))
        session_ids.update(ChatbotCskhRequest.objects.values_list("session_id", flat=True))

    if not session_ids:
        return

    # 2. In-memory grouping (Fetch all related data for these sessions in 3 queries)
    logs_by_session = defaultdict(list)
    for log in ChatbotChatLog.objects.filter(session_id__in=session_ids).order_by("external_created_at", "id"):
        logs_by_session[log.session_id].append(log)

    latest_state_by_session = {}
    for state in ChatbotState.objects.filter(session_id__in=session_ids).order_by("external_created_at", "id"):
        latest_state_by_session[state.session_id] = state

    latest_request_by_session = {}
    for req in ChatbotCskhRequest.objects.filter(session_id__in=session_ids).order_by("external_created_at", "id"):
        latest_request_by_session[req.session_id] = req

    # 3. Process and save
    for session_id in session_ids:
        logs = logs_by_session.get(session_id, [])
        latest_state = latest_state_by_session.get(session_id)
        cskh_request = latest_request_by_session.get(session_id)

        first_log = logs[0] if logs else None
        last_log = logs[-1] if logs else None

        main_category = ""
        topic_category = ""
        if last_log:
            main_category = last_log.questionType or ""
            topic_category = last_log.category or ""

        msg_count_total = len(logs)
        msg_count_bot_done = 0
        msg_count_ccc = 0
        msg_count_spam = 0

        if cskh_request:
            msg_count_ccc = msg_count_total
            outcome_type = ChatbotSessionSummary.OUTCOME_CCC
        else:
            for log in logs:
                cat = normalize_category(log.questionType)
                if cat in SPAM_CATEGORIES:
                    msg_count_spam += 1
                else:
                    msg_count_bot_done += 1

            if msg_count_bot_done > 0:
                outcome_type = ChatbotSessionSummary.OUTCOME_BOT_DONE
            elif msg_count_spam > 0:
                outcome_type = ChatbotSessionSummary.OUTCOME_SPAM
            else:
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
                "dashboard_category": topic_category or map_dashboard_category(
                    main_category,
                    cskh_request.reason if cskh_request else "",
                ),
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
                "msg_count_total": msg_count_total,
                "msg_count_bot_done": msg_count_bot_done,
                "msg_count_ccc": msg_count_ccc,
                "msg_count_spam": msg_count_spam,
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