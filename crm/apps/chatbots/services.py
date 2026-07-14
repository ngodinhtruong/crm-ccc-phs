from collections import defaultdict

from django.db.models import Q
from django.utils import timezone

from apps.chatbots.constants import (
    UNCATEGORIZED_LABEL,
    category_label,
    is_spam_question,
    normalize_category,
    normalize_step,
)
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


def build_full_conversation(logs):
    lines = []

    for index, log in enumerate(logs, start=1):
        if log.question:
            lines.append(f"{index}. KH: {log.question}")

        if log.answer:
            lines.append(f"   Bot: {log.answer}")

    return "\n".join(lines)


def pick_session_category(logs):
    """
    Chủ đề của phiên = category được hỏi nhiều nhất trong phiên.
    Bỏ qua câu hỏi rác và các dòng chatbot chưa gán category.
    Hòa phiếu thì lấy category xuất hiện gần nhất.
    """
    counter = defaultdict(int)
    last_seen = {}

    for index, log in enumerate(logs):
        if is_spam_question(log.questionType):
            continue

        category = normalize_category(log.category)

        if not category:
            continue

        counter[category] += 1
        last_seen[category] = index

    if not counter:
        return ""

    return max(counter, key=lambda key: (counter[key], last_seen[key]))


def detect_outcome(logs, has_state, has_request):
    """
    Quyết định phiên được xử lý thế nào.

    Thứ tự ưu tiên bám theo nghiệp vụ:
      1. Có cskh_request  -> CCC (đã xin được thông tin, tạo ticket)
      2. Có cskh_state    -> PENDING (chatbot bí, KH chưa/không cho thông tin)
      3. Chỉ toàn câu rác -> SPAM
      4. Còn lại          -> BOT_DONE
    """
    if has_request:
        return ChatbotSessionSummary.OUTCOME_CCC

    if has_state:
        return ChatbotSessionSummary.OUTCOME_PENDING

    has_real_question = any(not is_spam_question(log.questionType) for log in logs)

    if has_real_question:
        return ChatbotSessionSummary.OUTCOME_BOT_DONE

    return ChatbotSessionSummary.OUTCOME_SPAM


def count_messages(logs, outcome):
    """
    Chia số lượt hỏi của phiên vào đúng nhóm.

    Câu rác luôn tính vào msg_count_spam, kể cả trong phiên CCC/PENDING,
    để "tổng tiếp nhận" = bot_done + ccc + spam + pending không bị đếm trùng.
    """
    spam = sum(1 for log in logs if is_spam_question(log.questionType))
    non_spam = len(logs) - spam

    counts = {
        "msg_count_total": len(logs),
        "msg_count_bot_done": 0,
        "msg_count_ccc": 0,
        "msg_count_spam": spam,
        "msg_count_pending": 0,
    }

    if outcome == ChatbotSessionSummary.OUTCOME_CCC:
        counts["msg_count_ccc"] = non_spam
    elif outcome == ChatbotSessionSummary.OUTCOME_PENDING:
        counts["msg_count_pending"] = non_spam
    else:
        counts["msg_count_bot_done"] = non_spam

    return counts


def first_non_empty(*values):
    for value in values:
        if value:
            return value

    return ""


def rebuild_chatbot_session_summaries(affected_session_ids=None):
    """Tính lại bảng tổng hợp phiên. Truyền session_ids để chỉ rebuild phần thay đổi."""
    if affected_session_ids is not None:
        session_ids = set(affected_session_ids)
    else:
        session_ids = set(ChatbotChatLog.objects.values_list("session_id", flat=True))
        session_ids.update(ChatbotState.objects.values_list("session_id", flat=True))
        session_ids.update(
            ChatbotCskhRequest.objects.values_list("session_id", flat=True)
        )

    session_ids = {sid for sid in session_ids if sid}

    if not session_ids:
        return 0

    logs_by_session = defaultdict(list)

    for log in ChatbotChatLog.objects.filter(session_id__in=session_ids).order_by(
        "external_created_at", "id"
    ):
        logs_by_session[log.session_id].append(log)

    # Giữ bản ghi mới nhất của mỗi session
    latest_state_by_session = {}

    for state in ChatbotState.objects.filter(session_id__in=session_ids).order_by(
        "external_created_at", "id"
    ):
        latest_state_by_session[state.session_id] = state

    latest_request_by_session = {}

    for request in ChatbotCskhRequest.objects.filter(
        session_id__in=session_ids
    ).order_by("external_created_at", "id"):
        latest_request_by_session[request.session_id] = request

    for session_id in session_ids:
        logs = logs_by_session.get(session_id, [])
        state = latest_state_by_session.get(session_id)
        request = latest_request_by_session.get(session_id)

        first_log = logs[0] if logs else None
        last_log = logs[-1] if logs else None

        outcome = detect_outcome(logs, has_state=bool(state), has_request=bool(request))
        counts = count_messages(logs, outcome)

        started_at = first_log.external_created_at if first_log else None
        ended_at = last_log.external_created_at if last_log else None

        if not started_at and state:
            started_at = state.external_created_at

        if request and request.external_created_at:
            ended_at = request.external_created_at

        # Lý do chuyển CCC: ưu tiên reason KH khai, fallback về reason của state
        reason = first_non_empty(
            request.reason if request else "",
            state.reason if state else "",
        )

        ChatbotSessionSummary.objects.update_or_create(
            session_id=session_id,
            defaults={
                "user_id": first_non_empty(
                    request.user_id if request else "",
                    state.user_id if state else "",
                    first_log.user_id if first_log else "",
                ),
                "channel": first_non_empty(
                    request.channel if request else "",
                    state.channel if state else "",
                    first_log.channel if first_log else "",
                ),
                "dashboard_category": pick_session_category(logs),
                "outcome_type": outcome,
                "has_cskh_state": bool(state),
                "has_cskh_request": bool(request),
                "state_step": normalize_step(state.step) if state else "",
                "contact_info": request.contact_info if request else "",
                "contact_type": request.contact_type if request else "",
                "reason": reason,
                "first_question": first_log.question if first_log else "",
                "last_question": last_log.question if last_log else "",
                "full_conversation": build_full_conversation(logs),
                "started_at": started_at,
                "ended_at": ended_at,
                **counts,
            },
        )

    return len(session_ids)


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
    category_name = category_label(summary.dashboard_category)
    category_code = category_name.upper().replace(" ", "_")[:50]

    category, _ = TicketSupportCategory.objects.get_or_create(
        category_code=category_code,
        defaults={
            "category_name": category_name,
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

    try:
        last_number = int(latest.ticket_code[len(prefix) :])
    except ValueError:
        last_number = 0

    return f"{prefix}{last_number + 1:04d}"


def find_customer_by_contact(contact_type, contact_info):
    contact_type = str(contact_type or "").lower()
    contact_info = str(contact_info or "").strip()

    if not contact_info:
        return None, None

    if "account" in contact_type or "stk" in contact_type or "số tk" in contact_type:
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
    """Tạo ticket CRM cho các phiên đã xin được thông tin khách (outcome = CCC)."""
    chatbot_source = get_or_create_chatbot_source()
    status_new = get_or_create_ticket_status("NEW", "Mới", is_final=False)

    summaries = ChatbotSessionSummary.objects.filter(
        outcome_type=ChatbotSessionSummary.OUTCOME_CCC,
        ticket__isnull=True,
    )

    created = 0

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

        title = first_non_empty(
            summary.reason,
            summary.last_question,
            "Yêu cầu từ Chatbot",
        )

        request_content = "\n".join(
            [
                f"Session ID: {summary.session_id}",
                f"Kênh: {summary.channel or ''}",
                f"Chủ đề: {category_label(summary.dashboard_category)}",
                f"Thông tin liên hệ: {summary.contact_info or ''} ({summary.contact_type or ''})",
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
            support_category=get_or_create_support_category(summary),
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
        created += 1

    return created
