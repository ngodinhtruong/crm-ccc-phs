from collections import defaultdict
from inspect import signature

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.chatbots.constants import (
    CONTACT_FIELD_LABELS,
    SENDER_LABELS,
    category_label,
    is_customer_sender,
    is_customer_turn,
    has_topic,
    is_faq_question,
    is_research_question,
    is_spam_question,
    normalize_category,
    normalize_sender_type,
    normalize_step,
)
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)
from apps.common.constants import ClassificationMethod, TicketStatusCode
from apps.customers.models import Customer, CustomerAccount
from apps.tickets.models import (
    Ticket,
    TicketAccountLinkStatus,
    TicketSource,
    TicketStatus,
)

# channel thô từ Supabase -> source_code trong ticket_sources.
# Kênh lạ rơi về CHATBOT chung thay vì tạo nguồn mới ngoài tầm kiểm soát.
CHANNEL_TO_SOURCE_CODE = {
    "xpro": "XPRO",
    "x pro": "XPRO",
    "zalo": "ZALO",
    "facebook": "FACEBOOK",
    "fb": "FACEBOOK",
    "web": "WEB",
    "website": "WEB",
    "app": "APP",
    "mobile": "APP",
}

FALLBACK_SOURCE_CODE = "CHATBOT"

CONTACT_TYPE_PHONE = "PHONE"
CONTACT_TYPE_EMAIL = "EMAIL"
CONTACT_TYPE_ACCOUNT = "ACCOUNT"
# Khách để lại từ hai mảnh thông tin trở lên (tên + SĐT + email...). Nguồn mới
# ghi thẳng contact_type = "MULTIPLE" cho trường hợp này, và khi đó không có
# MỘT loại liên hệ duy nhất để suy ra — phải đọc contact_payload.
CONTACT_TYPE_MULTIPLE = "MULTIPLE"

EMAIL_CONTACT_HINTS = ("email", "mail")
PHONE_CONTACT_HINTS = ("phone", "sdt", "điện thoại", "dien thoai", "mobile")

# Thứ tự tra khách hàng khi khách đưa nhiều mảnh thông tin cùng lúc.
#
# Số tài khoản trước: cột account_number là unique và do chính hệ thống PHS
# cấp, khớp được là chắc chắn đúng người. Điện thoại sau, email cuối — email
# hay là email dùng chung của gia đình/công ty nên dễ khớp nhầm nhất.
CONTACT_LOOKUP_ORDER = (
    ("account_number", CONTACT_TYPE_ACCOUNT),
    ("phone", CONTACT_TYPE_PHONE),
    ("email", CONTACT_TYPE_EMAIL),
)


def resolve_ticket_source(channel):
    """Kênh chatbot -> TicketSource. Không tra được thì dùng nguồn CHATBOT chung."""
    code = CHANNEL_TO_SOURCE_CODE.get(str(channel or "").strip().lower())

    source = TicketSource.objects.filter(source_code=code).first() if code else None

    return source or TicketSource.objects.filter(
        source_code=FALLBACK_SOURCE_CODE
    ).first()


def normalize_contact_type(raw_type, value=None, payload=None):
    """
    contact_type thô của chatbot -> mã chuẩn PHONE / EMAIL / ACCOUNT / MULTIPLE.

    Giá trị từ Supabase là chữ tự do nên phải dò từ khoá; không đoán được thì
    suy từ chính chuỗi khách đưa (có '@' thì là email).

    ``payload`` là khối thông tin có cấu trúc của nguồn mới. Khi khách để lại
    nhiều mảnh cùng lúc, nguồn ghi contact_type = "MULTIPLE" và ``value`` là
    chuỗi hiển thị ghép sẵn — suy loại từ chuỗi đó là ra kết quả vô nghĩa
    (chuỗi có '@' nên mọi thứ thành EMAIL). Nên khi có payload, loại liên hệ
    lấy theo mảnh tin cậy nhất khách đã đưa.
    """
    text = str(raw_type or "").strip().lower()

    if payload:
        keys = [key for key, _ in CONTACT_LOOKUP_ORDER if payload.get(key)]

        if len(keys) > 1:
            return CONTACT_TYPE_MULTIPLE

        if keys:
            return dict(CONTACT_LOOKUP_ORDER)[keys[0]]

    if text == CONTACT_TYPE_MULTIPLE.lower():
        return CONTACT_TYPE_MULTIPLE

    if is_account_contact(text):
        return CONTACT_TYPE_ACCOUNT

    if any(hint in text for hint in EMAIL_CONTACT_HINTS):
        return CONTACT_TYPE_EMAIL

    if any(hint in text for hint in PHONE_CONTACT_HINTS):
        return CONTACT_TYPE_PHONE

    value = str(value or "").strip()

    if not value:
        return None

    return CONTACT_TYPE_EMAIL if "@" in value else CONTACT_TYPE_PHONE


def build_full_conversation(logs):
    """
    Dựng lại hội thoại, chịu được cả hai kiểu ghi log của hai nguồn.

    xpro_chat_logs ghi mỗi dòng là trọn một cặp hỏi - đáp. chat_questions ghi
    mỗi dòng là một tin nhắn của một bên, nên phải đánh số theo lượt của khách
    và gọi đúng tên người nói — nếu không, tin của nhân viên bị gắn nhãn "Bot"
    và số thứ tự nhảy theo từng tin thay vì theo từng lượt hỏi.
    """
    lines = []
    index = 0

    for log in logs:
        sender = normalize_sender_type(getattr(log, "sender_type", None))

        # Nguồn xpro: một dòng là trọn một cặp hỏi - đáp.
        if not sender:
            index += 1

            if log.question:
                lines.append(f"{index}. KH: {log.question}")

            if log.answer:
                lines.append(f"   Bot: {log.answer}")

            continue

        # Nguồn chat_questions: một dòng là một tin nhắn của một bên.
        raw = log.question if is_customer_sender(sender) else log.answer
        text = (raw or "").strip()

        if not text:
            continue

        if is_customer_sender(sender):
            index += 1
            lines.append(f"{index}. KH: {text}")
        else:
            lines.append(f"   {SENDER_LABELS.get(sender, sender.upper())}: {text}")

    return "\n".join(lines)


def pick_session_category(logs):
    """
    Chủ đề của phiên = category được hỏi nhiều nhất trong phiên.

    Chỉ tính lượt CÓ chủ đề: nguồn chỉ gán chủ đề nghiệp vụ cho CUSTOMER_CARE,
    còn RESEARCH / GREETING / UNRELATED thì ghi chính tên loại vào cột
    category. Không lọc thì phiên phân tích cổ phiếu mang "chủ đề" là
    "research" và leo lên biểu đồ so sánh bot vs CCC như một chủ đề thật.

    Hòa phiếu thì lấy category xuất hiện gần nhất.
    """
    counter = defaultdict(int)
    last_seen = {}

    for index, log in enumerate(logs):
        # Dòng trả lời của bot/nhân viên không phải câu khách hỏi.
        if not is_customer_turn(log):
            continue

        if not has_topic(log.questionType):
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
      1. Có cskh_request     -> CCC (đã xin được thông tin, tạo ticket)
      2. Có cskh_state       -> PENDING (chatbot bí, KH chưa/không cho thông tin)
      3. Có câu FAQ          -> BOT_DONE (chatbot tự trả lời bằng kho tri thức)
      4. Có câu RESEARCH     -> RESEARCH (phân tích cổ phiếu, khuyến nghị)
      5. Có câu rác          -> SPAM (GREETING / UNRELATED)
      6. Còn lại             -> UNCLASSIFIED

    Bước 5 phải kiểm tra tường minh, không được để SPAM làm nhánh vét. Phiên
    mà chatbot chưa gán questionType cho lượt nào không phải là hỏi rác — đó
    là dữ liệu nguồn còn thiếu. Dồn vào SPAM thì tỷ lệ câu rác bị thổi phồng
    và lỗ hổng dữ liệu bị giấu đi.

    Bước 3 đứng trước bước 4 có chủ đích: phiên vừa hỏi FAQ vừa hỏi phân tích
    được tính là BOT_DONE, vì trả được câu nghiệp vụ mới là tín hiệu chính.

    RESEARCH là nhóm riêng chứ không gộp vào SPAM như trước — đó là việc bot
    làm được, gộp vào câu rác thì tỷ lệ tự động hóa bị báo thiếu, và khi đặt
    hai nền tảng cạnh nhau (XPro có RESEARCH, Zalo không) thì XPro trông tệ
    hơn một cách giả tạo.

    Chỉ đếm lượt của khách: nguồn chat_questions ghi mỗi tin nhắn một dòng nên
    dòng trả lời của bot/nhân viên không mang câu hỏi để phân loại.
    """
    if has_request:
        return ChatbotSessionSummary.OUTCOME_CCC

    if has_state:
        return ChatbotSessionSummary.OUTCOME_PENDING

    turns = [log for log in logs if is_customer_turn(log)]

    if any(is_faq_question(log.questionType) for log in turns):
        return ChatbotSessionSummary.OUTCOME_BOT_DONE

    if any(is_research_question(log.questionType) for log in turns):
        return ChatbotSessionSummary.OUTCOME_RESEARCH

    if any(is_spam_question(log.questionType) for log in turns):
        return ChatbotSessionSummary.OUTCOME_SPAM

    return ChatbotSessionSummary.OUTCOME_UNCLASSIFIED


def count_messages(logs, outcome):
    """
    Chia số lượt hỏi của phiên vào đúng nhóm.

    Bất biến cần giữ:
        msg_count_total = bot_done + ccc + spam + pending + research
                        + unclassified

    Chỉ đếm lượt của KHÁCH. Nguồn chat_questions ghi mỗi tin nhắn một dòng
    (khách / bot / nhân viên), nên đếm hết mọi dòng sẽ thổi phồng số lượt của
    phiên Zalo lên gấp hai, gấp ba so với phiên XPro.

    Câu rác luôn tính vào msg_count_spam, kể cả trong phiên CCC/PENDING, để
    "tổng tiếp nhận" không bị đếm trùng. Phiên SPAM thì dồn toàn bộ lượt vào
    msg_count_spam.

    Lượt không-rác đi theo nhóm của PHIÊN chứ không theo nhóm của từng lượt:
    lượt RESEARCH nằm trong một phiên BOT_DONE vẫn được cộng vào
    msg_count_bot_done.
    """
    turns = [log for log in logs if is_customer_turn(log)]

    spam = sum(1 for log in turns if is_spam_question(log.questionType))
    non_spam = len(turns) - spam

    counts = {
        "msg_count_total": len(turns),
        "msg_count_bot_done": 0,
        "msg_count_ccc": 0,
        "msg_count_spam": spam,
        "msg_count_pending": 0,
        "msg_count_research": 0,
        "msg_count_unclassified": 0,
    }

    if outcome == ChatbotSessionSummary.OUTCOME_CCC:
        counts["msg_count_ccc"] = non_spam
    elif outcome == ChatbotSessionSummary.OUTCOME_PENDING:
        counts["msg_count_pending"] = non_spam
    elif outcome == ChatbotSessionSummary.OUTCOME_BOT_DONE:
        counts["msg_count_bot_done"] = non_spam
    elif outcome == ChatbotSessionSummary.OUTCOME_RESEARCH:
        counts["msg_count_research"] = non_spam
    elif outcome == ChatbotSessionSummary.OUTCOME_UNCLASSIFIED:
        counts["msg_count_unclassified"] = non_spam
    else:
        counts["msg_count_spam"] = len(turns)

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

    # Rebuild toàn bộ thì dọn luôn phiên đã biến mất khỏi cả ba bảng nguồn.
    # Không dọn thì summary cũ nằm lại vĩnh viễn và bị đếm vào mọi KPI: đổi
    # cách sinh khóa phiên (hoặc xóa dữ liệu nguồn) là sinh ra một lô "phiên
    # ma" mà không có gì báo.
    if affected_session_ids is None:
        stale = ChatbotSessionSummary.objects.exclude(session_id__in=session_ids)
        stale_count = stale.count()

        if stale_count:
            stale.delete()

    if not session_ids:
        return 0

    logs_by_session = defaultdict(list)

    log_queryset = ChatbotChatLog.objects.filter(
        session_id__in=session_ids
    ).only(
        "id",
        "session_id",
        "user_id",
        "channel",
        "question",
        "answer",
        "questionType",
        "category",
        # is_customer_turn() đọc cột này; thiếu ở đây là mỗi dòng log sinh
        # thêm một query phụ khi rebuild.
        "sender_type",
        "source_name",
        "external_created_at",
    ).order_by("external_created_at", "id")

    for log in log_queryset.iterator(chunk_size=2000):
        logs_by_session[log.session_id].append(log)

    # Giữ bản ghi mới nhất của mỗi session
    latest_state_by_session = {}

    state_queryset = ChatbotState.objects.filter(
        session_id__in=session_ids
    ).only(
        "id",
        "session_id",
        "user_id",
        "channel",
        "step",
        "reason",
        "category",
        "category_id",
        "external_created_at",
    ).order_by("external_created_at", "id")

    for state in state_queryset.iterator(chunk_size=2000):
        latest_state_by_session[state.session_id] = state

    latest_request_by_session = {}

    request_queryset = ChatbotCskhRequest.objects.filter(
        session_id__in=session_ids
    ).only(
        "id",
        "session_id",
        "user_id",
        "channel",
        "contact_info",
        "contact_payload",
        "contact_type",
        "reason",
        "category",
        "category_id",
        "external_created_at",
    ).order_by("external_created_at", "id")

    for request in request_queryset.iterator(chunk_size=2000):
        latest_request_by_session[request.session_id] = request

    for session_id in session_ids:
        logs = logs_by_session.get(session_id, [])
        state = latest_state_by_session.get(session_id)
        request = latest_request_by_session.get(session_id)

        first_log = logs[0] if logs else None
        last_log = logs[-1] if logs else None

        # Mốc thời gian lấy theo mọi dòng (phiên bắt đầu / kết thúc lúc nào),
        # nhưng câu hỏi phải lấy từ lượt của khách: dòng cuối của phiên Zalo
        # thường là tin của bot hoặc nhân viên, lấy nhầm thì last_question
        # rỗng và ticket mất luôn tiêu đề.
        customer_logs = [log for log in logs if is_customer_turn(log)]
        first_customer = customer_logs[0] if customer_logs else None
        last_customer = customer_logs[-1] if customer_logs else None

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

        # Chủ đề của phiên: ưu tiên nhãn chatbot chốt lúc bàn giao (trên
        # cskh_request, rồi cskh_state) trước khi suy ra từ các lượt chat.
        #
        # Cùng một hệ nhãn nên không lệch chuẩn, nhưng nhãn lúc bàn giao là
        # nhãn của chính yêu cầu được chuyển cho CCC, còn nhãn suy từ lượt chat
        # là chủ đề được hỏi NHIỀU nhất — phiên hỏi lan man rồi mới chốt một
        # việc khác sẽ bị xếp nhầm chủ đề, và ticket nhận sai phân loại.
        category = first_non_empty(
            normalize_category(request.category) if request else "",
            normalize_category(state.category) if state else "",
            pick_session_category(logs),
        )
        category_id = first_non_empty(
            request.category_id if request else None,
            state.category_id if state else None,
        ) or None

        contact_payload = (request.contact_payload if request else None) or None

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
                    "ZALO" if first_log and first_log.source_name == "chat_questions" else "XPRO" if first_log else "",
                ),
                "dashboard_category": category,
                "dashboard_category_id": category_id,
                "outcome_type": outcome,
                "has_cskh_state": bool(state),
                "has_cskh_request": bool(request),
                "state_step": normalize_step(state.step) if state else "",
                "contact_info": request.contact_info if request else "",
                "contact_payload": contact_payload,
                "contact_name": (contact_payload or {}).get("full_name") or "",
                "contact_type": normalize_contact_type(
                    request.contact_type if request else None,
                    request.contact_info if request else None,
                    payload=contact_payload,
                ) or "",
                "reason": reason,
                "first_question": first_customer.question if first_customer else "",
                "last_question": last_customer.question if last_customer else "",
                "full_conversation": build_full_conversation(logs),
                "started_at": started_at,
                "ended_at": ended_at,
                **counts,
            },
        )

    updated_count = len(session_ids)

    # Dashboard cache theo section phải được làm mới sau khi bảng summary đổi.
    from apps.chatbots.dashboard.cache import bump_chatbot_dashboard_cache_version

    transaction.on_commit(bump_chatbot_dashboard_cache_version)
    return updated_count


def is_account_contact(contact_type):
    """Loại liên hệ có phải là số tài khoản không (dựa trên contact_type)."""
    contact_type = str(contact_type or "").lower()

    return (
        "account" in contact_type
        or "stk" in contact_type
        or "số tk" in contact_type
        or "tài khoản" in contact_type
    )


def lookup_one_contact(kind, value):
    """Tra khách hàng bằng đúng MỘT mảnh thông tin."""
    value = str(value or "").strip()

    if not value:
        return None, None

    if kind == CONTACT_TYPE_ACCOUNT:
        account = (
            CustomerAccount.objects.select_related("customer")
            .filter(account_number=value)
            .first()
        )

        if account:
            return account.customer, account

        return None, None

    if kind == CONTACT_TYPE_EMAIL:
        return Customer.objects.filter(email__iexact=value).first(), None

    if kind == CONTACT_TYPE_PHONE:
        return Customer.objects.filter(phone=value).first(), None

    return None, None


def find_customer_by_contact(contact_type, contact_info, payload=None):
    """
    Tra khách hàng theo ĐÚNG loại thông tin khách đưa.

    Trước đây hàm này luôn chạy `phone=x OR email=x` cho mọi trường hợp, nên
    một số điện thoại trùng email của người khác sẽ khớp nhầm. Giờ tách theo
    contact_type: ACCOUNT tra số tài khoản, PHONE tra số điện thoại, EMAIL tra
    email. Cả ba cột đều unique nên kết quả là duy nhất.

    ``payload`` là khối thông tin có cấu trúc của nguồn mới (số TK / SĐT /
    email / họ tên trong cùng một jsonb). Có payload thì tra lần lượt theo
    ``CONTACT_LOOKUP_ORDER`` và lấy kết quả đầu tiên khớp — khách đưa cả SĐT
    lẫn email mà chỉ tra một cái thì bỏ lỡ những ca nối được.

    Không có payload là dữ liệu nguồn cũ (một giá trị đơn) — giữ nguyên đường
    cũ để bản ghi đã đồng bộ trước đây không đổi cách hiểu.
    """
    if payload:
        for key, kind in CONTACT_LOOKUP_ORDER:
            customer, account = lookup_one_contact(kind, payload.get(key))

            if customer or account:
                return customer, account

        return None, None

    contact_info = str(contact_info or "").strip()

    if not contact_info:
        return None, None

    return lookup_one_contact(
        normalize_contact_type(contact_type, contact_info),
        contact_info,
    )


def resolve_default_branch(branch_code=None):
    """
    Chi nhánh xử lý mặc định cho ticket sinh từ chatbot.

    Thứ tự: mã truyền vào -> ``CHATBOT_DEFAULT_BRANCH_CODE`` -> chi nhánh đầu
    tiên. Trả None nếu hệ thống chưa có chi nhánh nào; phía gọi tự quyết định
    báo lỗi vì ``Ticket.handling_branch`` là NOT NULL.
    """
    from apps.branches.models import Branch

    branch_code = branch_code or getattr(
        settings,
        "CHATBOT_DEFAULT_BRANCH_CODE",
        None,
    )

    if branch_code:
        return Branch.objects.filter(branch_code=branch_code).first()

    return Branch.objects.order_by("id").first()


def get_default_sla_policy():
    """
    Chính sách SLA áp cho ticket chatbot.

    Ưu tiên policy được đánh dấu is_default; không có thì lấy policy active đầu tiên.
    Trả None nếu hệ thống chưa cấu hình SLA nào — khi đó ticket vẫn tạo được,
    chỉ là không có đồng hồ đếm.
    """
    from apps.sla.models import SlaPolicy

    return (
        SlaPolicy.objects.filter(is_default=True, is_active=True).first()
        or SlaPolicy.objects.filter(is_active=True).order_by("id").first()
    )


def relink_ticket_customer(ticket):
    """
    Dò lại khách hàng cho ticket chưa nối được.

    Dùng khi khách hàng được tạo SAU khi ticket đã sinh ra: mở lại ticket thì
    tự nối. Trả về True nếu vừa nối được (đã lưu), False nếu vẫn chưa ra khách.
    """
    if ticket.customer_id or ticket.customer_account_id:
        return False

    contact_type = getattr(ticket, "contact_type", None)
    contact_value = (
        getattr(ticket, "contact_value", None)
        or getattr(ticket, "raw_account_number", None)
    )

    customer, account = find_customer_by_contact(
        contact_type,
        contact_value,
    )

    if not customer and not account:
        return False

    ticket.customer = customer
    ticket.customer_account = account

    # account_link_status nói về TK liên kết, nên chỉ LINKED khi có số tài khoản
    if account is not None:
        ticket.account_link_status = TicketAccountLinkStatus.LINKED

    ticket.updated_at = timezone.now()
    ticket.save(
        update_fields=[
            "customer",
            "customer_account",
            "account_link_status",
            "updated_at",
        ]
    )

    return True


def primary_contact_value(summary):
    """
    Một giá trị liên hệ duy nhất để lưu lên ticket.

    Lấy mảnh tin cậy nhất khách đã đưa (số TK -> SĐT -> email) chứ không lấy
    chuỗi hiển thị đã ghép nhãn: cột này để tra cứu và đối chiếu, nhét cả
    "Họ tên: vivi | SĐT: 0377929765" vào là biến nó thành cột không tra được.
    """
    payload = summary.contact_payload or {}

    for key, _ in CONTACT_LOOKUP_ORDER:
        if payload.get(key):
            return str(payload[key])

    return summary.contact_info or ""


def build_contact_lines(summary):
    """
    Khối thông tin liên hệ in trong nội dung ticket.

    Tách từng mảnh ra từng dòng có nhãn thay vì in nguyên chuỗi gộp: CCC gọi
    khách theo tên, tra cứu theo số tài khoản, gọi theo số điện thoại — nhìn
    một dãy ghép chung thì phải tự đoán đâu là gì.
    """
    payload = summary.contact_payload or {}

    if not payload:
        return [
            f"Thông tin liên hệ: {summary.contact_info or ''} "
            f"({summary.contact_type or ''})"
        ]

    lines = [f"Loại liên hệ: {summary.contact_type or ''}"]

    lines.extend(
        f"{label}: {payload[key]}"
        for key, label in CONTACT_FIELD_LABELS
        if payload.get(key)
    )

    # Nguồn thêm key mới mà CRM chưa biết tên tiếng Việt: vẫn in ra, để thông
    # tin khách đã cung cấp không bị nuốt mất trong im lặng.
    known = {key for key, _ in CONTACT_FIELD_LABELS}

    lines.extend(
        f"{key}: {value}"
        for key, value in payload.items()
        if key not in known
    )

    return lines


def build_chatbot_ticket_kwargs(*, summary, default_branch, created_status, policy):
    """Tạo kwargs tương thích với phiên bản TicketService hiện tại.

    Một số nhánh backend đã có contact_type/contact_value, một số nhánh cũ chỉ
    có raw_account_number. Kiểm tra signature giúp chatbot tạo ticket được trong
    cả hai trường hợp, thay vì lỗi unexpected keyword argument.
    """
    from apps.tickets.services import TicketService

    payload = summary.contact_payload or {}

    customer, customer_account = find_customer_by_contact(
        summary.contact_type,
        summary.contact_info,
        payload=payload,
    )
    normalized_contact_type = normalize_contact_type(
        summary.contact_type,
        summary.contact_info,
        payload=payload,
    )

    # Tiêu đề ticket: vấn đề chatbot đã tóm tắt (cột `issue` của nguồn, đổ vào
    # `reason`) mô tả đúng việc cần xử lý. Câu hỏi cuối chỉ là phương án dự
    # phòng — nó thường là câu khách đọc số điện thoại, không nói lên việc gì.
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
            *build_contact_lines(summary),
            f"Lý do chuyển CCC: {summary.reason or ''}",
            "",
            "Nội dung hội thoại:",
            summary.full_conversation or "",
        ]
    )

    kwargs = {
        "title": title[:255],
        "customer": customer,
        "customer_account": customer_account,
        "handling_branch": default_branch,
        "current_status": created_status,
        "source": resolve_ticket_source(summary.channel),
        "sla_policy": policy,
        "classification_method": ClassificationMethod.AUTO,
        "source_ref_id": summary.session_id,
        "request_content": request_content,
        "created_by_user": None,
        "check_permission": False,
    }

    parameters = signature(TicketService.create_ticket).parameters

    if "contact_type" in parameters:
        kwargs["contact_type"] = normalized_contact_type

    if "contact_value" in parameters:
        kwargs["contact_value"] = primary_contact_value(summary)

    # Nhánh Ticket cũ chưa có contact_type/contact_value vẫn lưu được số tài
    # khoản thô để CCC tra cứu sau.
    #
    # Với nguồn mới, số tài khoản nằm trong contact_payload chứ không còn là
    # cả giá trị contact_info — lấy nguyên contact_info là nhét cả chuỗi "Họ
    # tên: ... | SĐT: ..." vào cột số tài khoản.
    raw_account_number = payload.get("account_number") or (
        summary.contact_info
        if normalized_contact_type == CONTACT_TYPE_ACCOUNT and not payload
        else ""
    )

    if (
        "raw_account_number" in parameters
        and raw_account_number
        and customer_account is None
    ):
        kwargs["raw_account_number"] = raw_account_number[:50]

    return kwargs


def create_crm_tickets_from_chatbot(default_branch=None):
    """
    Tạo ticket cho các phiên đã xin được thông tin khách (outcome = CCC).

    Ticket vào thẳng bảng `tickets` dùng chung với ticket tạo tay:
    - Nguồn (source) lấy theo kênh chatbot: XPRO / ZALO / FACEBOOK...
    - classification_method = AUTO để phân biệt với ticket người tạo.
    - Thông tin khách đưa lưu nguyên ở contact_type + contact_value.
    - Nối mềm khách hàng nếu tra ra, không thì để trống.
    - Chưa gán người xử lý (owner_user = null) → nằm hàng chờ chung,
      trạng thái CREATED, ai cũng thấy, tự bấm nhận.

    default_branch bắt buộc vì Ticket.handling_branch là NOT NULL.
    """
    from apps.tickets.services import TicketService

    if default_branch is None:
        raise ValueError(
            "Thiếu chi nhánh mặc định — Ticket.handling_branch không cho phép trống."
        )

    summaries = ChatbotSessionSummary.objects.filter(
        outcome_type=ChatbotSessionSummary.OUTCOME_CCC,
        ticket__isnull=True,
    )

    created_status = TicketStatus.objects.filter(
        status_code=TicketStatusCode.CREATED
    ).first()

    policy = get_default_sla_policy()
    created = 0

    for summary in summaries:
        # Chống tạo trùng: một phiên chỉ sinh đúng một ticket.
        # Tra theo source_ref_id đơn thuần chứ không dựa vào ràng buộc DB —
        # ràng buộc của Ticket là cặp (source, source_ref_id), nên nếu phiên
        # đổi kênh thì DB vẫn cho tạo ticket thứ hai cho cùng session.
        existing_ticket = Ticket.objects.filter(
            source_ref_id=summary.session_id,
            classification_method=ClassificationMethod.AUTO,
        ).first()

        if existing_ticket:
            summary.ticket = existing_ticket
            summary.save(update_fields=["ticket"])
            continue

        with transaction.atomic():
            # Khóa summary để hai worker chạy đồng thời không tạo hai ticket.
            locked_summary = (
                ChatbotSessionSummary.objects.select_for_update()
                .select_related("ticket")
                .get(pk=summary.pk)
            )

            if locked_summary.ticket_id:
                continue

            existing_ticket = Ticket.objects.filter(
                source_ref_id=locked_summary.session_id,
                classification_method=ClassificationMethod.AUTO,
            ).first()

            if existing_ticket:
                locked_summary.ticket = existing_ticket
                locked_summary.save(update_fields=["ticket"])
                continue

            ticket = TicketService.create_ticket(
                **build_chatbot_ticket_kwargs(
                    summary=locked_summary,
                    default_branch=default_branch,
                    created_status=created_status,
                    policy=policy,
                )
            )

        # create_ticket gán owner_user = created_by_user; chatbot phải để trống
        # thì ticket mới nằm ở hàng chờ cho người khác nhận.
            if ticket.owner_user_id is not None:
                ticket.owner_user = None
                ticket.owner_employee = None
                ticket.save(update_fields=["owner_user", "owner_employee"])

            locked_summary.ticket = ticket
            locked_summary.save(update_fields=["ticket"])
            created += 1

    return created
