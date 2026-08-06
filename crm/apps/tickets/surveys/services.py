"""
Nghiệp vụ khảo sát CSAT: ghi nhận một lần gửi và đọc file khảo sát.

Quy tắc trung tâm: chỉ lần gửi THÀNH CÔNG mới tạo ra kết quả chính thức
(``TicketFeedback``). Lần thất bại vẫn được lưu vào lịch sử để tra lại, và
ticket đó còn được gửi lại. Ticket đã có một lần thành công thì thôi.
"""

import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from apps.tickets.models import (
    SurveyEntrySource,
    SurveySendStatus,
    TicketFeedback,
    TicketSurveyAuditLog,
    TicketSurveyLog,
)

# Giờ nghiệp vụ. File khảo sát ghi ngày giờ theo giờ Việt Nam, còn
# settings.TIME_ZONE là UTC — không gắn múi giờ thì mọi mốc lệch 7 tiếng và
# việc "tìm ticket trong đúng ngày gửi" sẽ tra nhầm ngày.
SURVEY_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")

SURVEY_STATUS_SENT = "SENT"
SURVEY_STATUS_RESPONDED = "RESPONDED"

# Số điện thoại nằm trong cột "Tên" chứ không phải cột "Số điện thoại" (cột đó
# rỗng toàn bộ file): "[Zalo] admin - 0913334686 - 2026-07-01 08:55:06".
_PHONE_IN_NAME = re.compile(r"\b(0\d{8,10})\b")


def extract_phone(message_name, fallback=""):
    """Số điện thoại của lần gửi, ưu tiên cột riêng rồi mới dò trong tên."""
    fallback = str(fallback or "").strip()

    if fallback:
        return fallback

    found = _PHONE_IN_NAME.search(str(message_name or ""))

    return found.group(1) if found else ""


def normalize_send_status(value):
    """
    Đưa trạng thái gửi về mã chuẩn.

    Nhận cả nhãn tiếng Việt trong file ("Thành công") lẫn mã đã chuẩn
    ("SUCCESS") — API gửi lên mã, còn file import gửi nhãn. Bỏ nhánh mã thì
    mọi bản ghi từ API bị ghi nhầm thành thất bại mà không báo lỗi gì.
    """
    text = str(value or "").strip()

    if text.upper() in dict(SurveySendStatus.CHOICES):
        return text.upper()

    return SurveySendStatus.FROM_LABEL.get(text.lower(), SurveySendStatus.FAILED)


def parse_rating(value):
    """
    Điểm khảo sát.

    Ô trống nghĩa là chưa khảo sát (``None``); số 0 là khách chấm 0 điểm.
    Hai thứ này khác nhau nên không được gộp về 0.
    """
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    try:
        return int(float(text))
    except (TypeError, ValueError):
        return None


def combine_sent_at(sent_date, sent_time=None):
    """Ghép ngày + giờ gửi thành một mốc có múi giờ Việt Nam."""
    if sent_date is None:
        return None

    if isinstance(sent_date, datetime):
        moment = sent_date
    else:
        moment = datetime.combine(sent_date, sent_time or time.min)

    if timezone.is_naive(moment):
        return moment.replace(tzinfo=SURVEY_TIMEZONE)

    return moment.astimezone(SURVEY_TIMEZONE)


def day_bounds(moment):
    """Khoảng nửa mở ``[đầu ngày, đầu ngày hôm sau)`` theo giờ Việt Nam."""
    local = combine_sent_at(moment)

    if local is None:
        return None, None

    start = local.replace(hour=0, minute=0, second=0, microsecond=0)

    return start, start + timedelta(days=1)


def month_bounds(moment):
    """
    Khoảng nửa mở ``[đầu tháng, đầu tháng sau)`` theo giờ Việt Nam.

    Phạm vi tìm ticket là cả tháng chứ không phải đúng ngày gửi: khảo sát
    thường được gửi vài ngày sau khi ticket đóng, khoá đúng ngày thì tra
    không ra ticket nào dù khách có ticket thật trong tháng.
    """
    local = combine_sent_at(moment)

    if local is None:
        return None, None

    start = local.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    return start, end


def has_successful_survey(ticket_id):
    """Ticket đã khảo sát thành công chưa — nếu rồi thì không gửi nữa."""
    return TicketSurveyLog.objects.filter(
        ticket_id=ticket_id,
        send_status=SurveySendStatus.SUCCESS,
    ).exists()


class SurveyAlreadyCompleted(Exception):
    """Ticket đã có một lần gửi thành công."""


@transaction.atomic
def record_survey(
    *,
    ticket,
    send_status,
    sent_at=None,
    rating_score=None,
    rating_note="",
    customer=None,
    customer_name_text="",
    phone="",
    message_name="",
    message_type="",
    message_template="",
    ticket_ref_text="",
    entry_source=SurveyEntrySource.MANUAL,
    created_by_user=None,
):
    """
    Ghi nhận một lần gửi khảo sát.

    Luôn thêm một dòng vào lịch sử. Chỉ khi thành công mới tạo/cập nhật kết
    quả chính thức của ticket.

    Ném :class:`SurveyAlreadyCompleted` nếu ticket đã khảo sát thành công —
    kiểm tra trong cùng transaction và khoá ticket lại, để hai người nhập
    cùng lúc không tạo ra hai bản chính thức.
    """
    send_status = normalize_send_status(send_status) if send_status else send_status

    if send_status not in dict(SurveySendStatus.CHOICES):
        raise ValueError(f"Trạng thái gửi không hợp lệ: {send_status!r}")

    # Khoá ticket để chặn hai lần ghi song song cùng vượt qua kiểm tra dưới.
    ticket.__class__.objects.select_for_update().filter(pk=ticket.pk).first()

    if has_successful_survey(ticket.pk):
        raise SurveyAlreadyCompleted(
            f"Ticket {ticket.ticket_code} đã có kết quả khảo sát thành công."
        )

    customer = customer or ticket.customer
    phone = extract_phone(message_name, phone)

    shared = {
        "customer": customer,
        "phone": phone,
        "message_name": message_name or "",
        "message_type": message_type or "",
        "message_template": message_template or "",
        "ticket_ref_text": ticket_ref_text or "",
        "rating_note": rating_note or "",
    }

    feedback = None

    if send_status == SurveySendStatus.SUCCESS:
        # Gửi thành công mới có kết quả chính thức. Điểm để trống nghĩa là
        # khách chưa phản hồi, khác với chấm 0 điểm.
        feedback, _ = TicketFeedback.objects.update_or_create(
            ticket=ticket,
            defaults={
                **shared,
                "survey_sent": True,
                "survey_status": (
                    SURVEY_STATUS_RESPONDED
                    if rating_score is not None
                    else SURVEY_STATUS_SENT
                ),
                "rating_score": rating_score,
                "sent_at": sent_at,
                "responded_at": sent_at if rating_score is not None else None,
                "updated_at": timezone.now(),
            },
        )

    log = TicketSurveyLog.objects.create(
        ticket=ticket,
        feedback=feedback,
        customer_name_text=customer_name_text or "",
        send_status=send_status,
        sent_at=sent_at,
        # Gửi hỏng thì khách không nhận được tin, nên không thể có điểm —
        # file vẫn ghi 0 ở các dòng "Thất bại", ghi lại sẽ thành điểm giả.
        rating_score=rating_score if send_status == SurveySendStatus.SUCCESS else None,
        entry_source=entry_source,
        created_by_user=created_by_user,
        created_at=timezone.now(),
        **shared,
    )

    log_survey_audit(
        log=log,
        action_type=TicketSurveyAuditLog.ACTION_CREATE,
        user=created_by_user,
        new_data=snapshot_survey(log),
        note="Nhập kết quả khảo sát",
    )

    return log


# ----------------------------------------------------------------------
# Sửa một dòng khảo sát đã nhập
# ----------------------------------------------------------------------

# Trường người nhập được sửa, kèm nhãn hiển thị trong nhật ký. Cố ý không có
# ``ticket``: dòng khảo sát là kết quả của một lần gửi cho đúng ticket đó,
# chuyển sang ticket khác thì điểm CSAT của cả hai ticket đều sai.
SURVEY_EDITABLE_FIELDS = (
    ("send_status", "Tình trạng gửi"),
    ("sent_at", "Thời điểm gửi"),
    ("rating_score", "Rate"),
    ("rating_note", "Mô tả rate"),
    ("customer_name_text", "Khách hàng"),
    ("phone", "Số điện thoại"),
    ("message_type", "Loại tin nhắn"),
    ("message_template", "Mẫu tin nhắn"),
    ("ticket_ref_text", "Ticket ghi trong file"),
)

SURVEY_FIELD_LABELS = dict(SURVEY_EDITABLE_FIELDS)


def _audit_value(value):
    """Giá trị đưa vào JSON của nhật ký — JSONField không nhận datetime."""
    if isinstance(value, datetime):
        return combine_sent_at(value).isoformat()

    return value


def snapshot_survey(log):
    """Ảnh chụp các trường sửa được của một dòng khảo sát."""
    return {
        name: _audit_value(getattr(log, name))
        for name, _label in SURVEY_EDITABLE_FIELDS
    }


def diff_survey(old_data, new_data):
    """Những trường đã đổi, kèm nhãn tiếng Việt để hiển thị lại về sau."""
    changed = {}

    for name, label in SURVEY_EDITABLE_FIELDS:
        before = (old_data or {}).get(name)
        after = (new_data or {}).get(name)

        if before != after:
            changed[name] = {"label": label, "old": before, "new": after}

    return changed


def log_survey_audit(
    *, log, action_type, user=None, old_data=None, new_data=None, note=""
):
    """
    Ghi một dòng nhật ký chỉnh sửa.

    Bấm lưu mà không đổi gì thì không ghi: nhật ký đầy những dòng rỗng sẽ che
    mất lần sửa thật sự.
    """
    changed_fields = None

    if action_type == TicketSurveyAuditLog.ACTION_UPDATE:
        changed_fields = diff_survey(old_data, new_data)

        if not changed_fields:
            return None

    return TicketSurveyAuditLog.objects.create(
        survey_log=log,
        action_type=action_type,
        old_data=old_data,
        new_data=new_data,
        changed_fields=changed_fields,
        changed_by_user=user if getattr(user, "is_authenticated", False) else None,
        note=note or "",
    )


def rebuild_feedback(ticket):
    """
    Dựng lại kết quả chính thức của ticket từ lịch sử gửi.

    Bất biến: ``TicketFeedback`` phản ánh lần gửi thành công gần nhất, và
    không còn lần nào thành công thì coi như chưa khảo sát. Sửa một dòng từ
    Thành công sang Thất bại mà để nguyên bảng kia thì báo cáo CSAT vẫn tính
    điểm của lần gửi vừa bị phủ nhận.
    """
    latest_success = (
        TicketSurveyLog.objects.filter(
            ticket=ticket, send_status=SurveySendStatus.SUCCESS
        )
        .order_by("-sent_at", "-id")
        .first()
    )

    if latest_success is None:
        # Không xoá hẳn dòng TicketFeedback: nó có thể đã tồn tại từ nguồn
        # khác trước khi có màn khảo sát. Chỉ trả nó về trạng thái chưa gửi.
        TicketFeedback.objects.filter(ticket=ticket).update(
            survey_sent=False,
            survey_status=None,
            rating_score=None,
            responded_at=None,
            updated_at=timezone.now(),
        )
        TicketSurveyLog.objects.filter(ticket=ticket).update(feedback=None)
        return None

    feedback, _ = TicketFeedback.objects.update_or_create(
        ticket=ticket,
        defaults={
            "customer": latest_success.customer,
            "phone": latest_success.phone or "",
            "message_name": latest_success.message_name or "",
            "message_type": latest_success.message_type or "",
            "message_template": latest_success.message_template or "",
            "ticket_ref_text": latest_success.ticket_ref_text or "",
            "rating_note": latest_success.rating_note or "",
            "survey_sent": True,
            "survey_status": (
                SURVEY_STATUS_RESPONDED
                if latest_success.rating_score is not None
                else SURVEY_STATUS_SENT
            ),
            "rating_score": latest_success.rating_score,
            "sent_at": latest_success.sent_at,
            "responded_at": (
                latest_success.sent_at
                if latest_success.rating_score is not None
                else None
            ),
            "updated_at": timezone.now(),
        },
    )

    TicketSurveyLog.objects.filter(
        ticket=ticket, send_status=SurveySendStatus.SUCCESS
    ).update(feedback=feedback)
    TicketSurveyLog.objects.filter(ticket=ticket).exclude(
        send_status=SurveySendStatus.SUCCESS
    ).update(feedback=None)

    return feedback


@transaction.atomic
def update_survey(*, log, changed_by_user=None, note="", **fields):
    """
    Sửa một dòng khảo sát đã nhập và ghi lại ai sửa, sửa gì.

    Ném :class:`SurveyAlreadyCompleted` khi đổi một dòng thất bại thành công
    trong khi ticket đã có lần thành công khác — bất biến "mỗi ticket một kết
    quả chính thức" phải giữ cả ở đường sửa, không riêng đường nhập mới.
    """
    unknown = set(fields) - set(SURVEY_FIELD_LABELS)

    if unknown:
        raise ValueError(f"Trường không sửa được: {', '.join(sorted(unknown))}")

    ticket = log.ticket

    # Khoá ticket như lúc nhập mới, để hai người sửa song song không cùng
    # biến dòng của mình thành lần thành công duy nhất.
    type(ticket).objects.select_for_update().filter(pk=ticket.pk).first()

    old_data = snapshot_survey(log)

    if "send_status" in fields:
        fields["send_status"] = normalize_send_status(fields["send_status"])

    becoming_success = (
        fields.get("send_status") == SurveySendStatus.SUCCESS
        and log.send_status != SurveySendStatus.SUCCESS
    )

    if becoming_success and (
        TicketSurveyLog.objects.filter(
            ticket=ticket, send_status=SurveySendStatus.SUCCESS
        )
        .exclude(pk=log.pk)
        .exists()
    ):
        raise SurveyAlreadyCompleted(
            f"Ticket {ticket.ticket_code} đã có kết quả khảo sát thành công."
        )

    for name, value in fields.items():
        setattr(log, name, value)

    if log.send_status != SurveySendStatus.SUCCESS:
        # Gửi hỏng thì khách không nhận được tin nên không thể có điểm.
        log.rating_score = None

    log.save()

    rebuild_feedback(ticket)
    log.refresh_from_db()

    log_survey_audit(
        log=log,
        action_type=TicketSurveyAuditLog.ACTION_UPDATE,
        user=changed_by_user,
        old_data=old_data,
        new_data=snapshot_survey(log),
        note=note,
    )

    return log


# ----------------------------------------------------------------------
# Đọc file khảo sát (.xlsx)
# ----------------------------------------------------------------------
_XL_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# Excel đếm ngày từ 30/12/1899 (giữ lại lỗi năm nhuận 1900 của Lotus 1-2-3).
_EXCEL_EPOCH = date(1899, 12, 30)

# Thứ tự cột trong file khảo sát xuất từ Zalo.
SURVEY_COLUMNS = (
    ("A", "message_name", "Tên"),
    ("B", "send_status", "Tình trạng"),
    ("C", "message_type", "Loại tin nhắn"),
    ("D", "customer_name_text", "Khách hàng"),
    ("E", "phone", "Số điện thoại"),
    ("F", "message_template", "Mẫu tin nhắn"),
    ("G", "sent_date", "Ngày bắt đầu gửi"),
    ("H", "sent_time", "Thời gian bắt đầu gửi"),
    ("I", "ticket_ref_text", "Ticket"),
    ("J", "rating_score", "Rate"),
    ("K", "rating_note", "Mô tả rate"),
)


def _column_letter(cell_ref):
    return "".join(ch for ch in cell_ref if ch.isalpha())


def _excel_serial_to_date(value):
    try:
        return _EXCEL_EPOCH + timedelta(days=int(float(value)))
    except (TypeError, ValueError):
        return None


def _parse_time(value):
    text = str(value or "").strip()

    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue

    # Excel cũng lưu giờ dưới dạng phân số của một ngày.
    try:
        fraction = float(text)
    except (TypeError, ValueError):
        return None

    seconds = int(round((fraction % 1) * 86400))

    return (datetime.min + timedelta(seconds=seconds)).time()


def read_survey_rows(file_obj):
    """
    Đọc file khảo sát .xlsx thành danh sách dict.

    Tự đọc bằng ``zipfile`` + XML thay vì openpyxl: .xlsx vốn là zip chứa XML,
    và dự án chưa có sẵn openpyxl nên thêm một phụ thuộc chỉ để đọc 11 cột là
    không đáng.
    """
    with zipfile.ZipFile(file_obj) as archive:
        names = archive.namelist()

        shared = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = [
                "".join(node.text or "" for node in item.iter(_XL_NS + "t"))
                for item in root
            ]

        sheet_path = next(
            (n for n in names if n.startswith("xl/worksheets/sheet")), None
        )

        if sheet_path is None:
            return []

        sheet = ET.fromstring(archive.read(sheet_path))

    by_key = {letter: key for letter, key, _label in SURVEY_COLUMNS}
    rows = []

    for index, row_node in enumerate(sheet.iter(_XL_NS + "row")):
        if index == 0:  # dòng tiêu đề
            continue

        raw = {}

        for cell in row_node.iter(_XL_NS + "c"):
            key = by_key.get(_column_letter(cell.get("r") or ""))

            if key is None:
                continue

            value_node = cell.find(_XL_NS + "v")
            value = "" if value_node is None else (value_node.text or "")

            if cell.get("t") == "s" and value:
                value = shared[int(value)]

            raw[key] = value

        if not any(str(v).strip() for v in raw.values()):
            continue

        rows.append(
            {
                "row_number": index + 1,
                "message_name": raw.get("message_name", ""),
                "send_status": normalize_send_status(raw.get("send_status")),
                "message_type": raw.get("message_type", ""),
                "customer_name_text": (raw.get("customer_name_text") or "").strip(),
                "phone": extract_phone(
                    raw.get("message_name"), raw.get("phone")
                ),
                "message_template": raw.get("message_template", ""),
                "sent_at": combine_sent_at(
                    _excel_serial_to_date(raw.get("sent_date")),
                    _parse_time(raw.get("sent_time")),
                ),
                "ticket_ref_text": (raw.get("ticket_ref_text") or "").strip(),
                "rating_score": parse_rating(raw.get("rating_score")),
                "rating_note": raw.get("rating_note", ""),
            }
        )

    return rows
