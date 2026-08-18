"""
Số liệu tổng hợp cho màn Customer 360.

Gom bốn nguồn rời nhau về cùng một khách: giao dịch (``TransactionLog`` qua
``CustomerAccount``), cuộc gọi (``CallLog``), ticket và kết quả khảo sát
(``TicketSurveyLog``). Ba nguồn đầu nối bằng FK thẳng tới ``Customer``, riêng
giao dịch phải đi vòng qua tài khoản lưu ký vì một khách có thể có nhiều TK.

Mọi chuỗi thời gian đều trả về đủ 12 mốc tháng kể cả tháng không có số liệu:
biểu đồ trên cùng một trang phải khớp trục hoành với nhau, nếu mỗi chuỗi chỉ
trả về tháng có dữ liệu thì các cột lệch nhau và không đối chiếu được.
"""

from collections import Counter
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Max, Q, Sum
from django.utils import timezone

from apps.calls.models import CallLog
from apps.common.constants import MATCHED_ORDER_STATUSES
from apps.kpis.models import TransactionLog
from apps.tickets.models import SurveySendStatus, Ticket, TicketSurveyLog

# Dùng lại đúng ngưỡng hài lòng của dashboard khảo sát thay vì đặt lại số 4 ở
# đây — hai màn hình hiển thị cùng một chỉ số CSAT thì phải cùng một định nghĩa.
from apps.tickets.surveys.dashboard import SATISFIED_FROM

MONTHS_BACK = 12
RECENT_MONTHS = 6
INACTIVE_WARNING_DAYS = 90
TIMELINE_LIMIT = 100

# Ngưỡng phân loại hành vi giao dịch. Đặt tên theo đúng nhãn hiển thị để đọc
# code là biết màn hình đang nói gì.
BEHAVIOUR_LABELS = {
    "NONE": "Chưa giao dịch",
    "REGULAR": "Giao dịch đều",
    "BURST": "Bùng phát rồi tắt",
    "OCCASIONAL": "Thỉnh thoảng",
}

REGULAR_ACTIVE_MONTHS = 4
BURST_MONTH_ORDERS = 5


def _month_buckets(today, count=MONTHS_BACK):
    """``count`` mốc đầu tháng, cũ nhất trước, tháng hiện tại cuối cùng."""
    index = today.year * 12 + today.month - 1

    return [
        today.replace(year=(index - offset) // 12, month=(index - offset) % 12 + 1, day=1)
        for offset in range(count - 1, -1, -1)
    ]


def _month_code(moment):
    return f"{moment.year:04d}-{moment.month:02d}"


def _month_labels(month_start):
    return (
        f"Tháng {month_start.month}/{month_start.year}",
        f"T{month_start.month}/{month_start.year % 100:02d}",
    )


def _empty_series(months, **fields):
    """Khung 12 tháng với giá trị mặc định, để rồi đổ số liệu thật vào."""
    series = {}

    for month_start in months:
        label, short_label = _month_labels(month_start)
        series[_month_code(month_start)] = {
            "code": _month_code(month_start),
            "label": label,
            "short_label": short_label,
            **{key: value() for key, value in fields.items()},
        }

    return series


def _to_float(value):
    if value is None:
        return None

    return float(value) if isinstance(value, Decimal) else value


def _customer_header(customer):
    accounts = [
        account.account_number
        for account in customer.accounts.all()
        if account.account_number
    ]
    is_linked = len(accounts) > 0

    return {
        "id": customer.id,
        "customer_code": "",
        "full_name": customer.full_name,
        "phone": None if is_linked else customer.phone,
        "email": None if is_linked else customer.email,
        "branch_name": customer.branch.branch_name if customer.branch else None,
        "status": customer.status,
        "vip_type": (
            customer.membership_tier.tier_name
            if customer.membership_tier_id
            else (customer.rating.rating_name if customer.rating_id else "Khách thường")
        ),
        "account_numbers": accounts,
    }


def _transaction_series(matched_qs, months):
    """Giá trị mua/bán và số lệnh khớp theo tháng."""
    series = _empty_series(
        months,
        buy_value=lambda: 0.0,
        sell_value=lambda: 0.0,
        total_value=lambda: 0.0,
        orders=lambda: 0,
    )

    rows = matched_qs.values("transaction_date", "side")

    for row in rows:
        code = _month_code(row["transaction_date"])
        bucket = series.get(code)

        if bucket is None:
            continue

        bucket["orders"] += 1

    return list(series.values())


def _call_series(calls_qs, months):
    """Số cuộc gọi, cuộc kết nối được và tổng thời lượng theo tháng."""
    series = _empty_series(
        months,
        total=lambda: 0,
        connected=lambda: 0,
        missed=lambda: 0,
        duration_minutes=lambda: 0.0,
    )

    for row in calls_qs.values("call_time", "duration_seconds"):
        code = _month_code(timezone.localtime(row["call_time"]).date())
        bucket = series.get(code)

        if bucket is None:
            continue

        duration = row["duration_seconds"] or 0
        bucket["total"] += 1

        # Thời lượng 0 nghĩa là gọi nhỡ, không phải cuộc gọi dài 0 giây.
        if duration > 0:
            bucket["connected"] += 1
            bucket["duration_minutes"] += duration / 60
        else:
            bucket["missed"] += 1

    for bucket in series.values():
        bucket["duration_minutes"] = round(bucket["duration_minutes"], 1)

    return list(series.values())


def _survey_series(survey_qs, months):
    """
    Điểm khảo sát theo tháng.

    Chỉ tính lần gửi thành công: lần gửi hỏng thì khách chưa từng nhận được
    tin, gộp vào sẽ kéo tỷ lệ xuống mà không phản ánh chất lượng phục vụ.
    """
    series = _empty_series(
        months,
        rated=lambda: 0,
        satisfied=lambda: 0,
        score_sum=lambda: 0,
    )

    rows = survey_qs.filter(
        send_status=SurveySendStatus.SUCCESS,
        rating_score__isnull=False,
        sent_at__isnull=False,
    ).values("sent_at", "rating_score")

    for row in rows:
        code = _month_code(timezone.localtime(row["sent_at"]).date())
        bucket = series.get(code)

        if bucket is None:
            continue

        bucket["rated"] += 1
        bucket["score_sum"] += row["rating_score"]

        if row["rating_score"] >= SATISFIED_FROM:
            bucket["satisfied"] += 1

    items = []

    for bucket in series.values():
        rated = bucket.pop("rated")
        satisfied = bucket.pop("satisfied")
        score_sum = bucket.pop("score_sum")

        # None chứ không phải 0: tháng không ai đánh giá thì điểm không tồn
        # tại, khác hẳn với "được đánh giá 0 điểm".
        bucket["rated"] = rated
        bucket["avg_score"] = round(score_sum / rated, 2) if rated else None
        bucket["csat_percent"] = round(satisfied * 100 / rated, 2) if rated else None
        items.append(bucket)

    return items


def _behaviour(transaction_series, matched_qs, today):
    """Phân loại hành vi giao dịch, dùng chung cách gọi tên với dữ liệu seed."""
    orders_by_month = [item["orders"] for item in transaction_series]
    active_12m = sum(1 for count in orders_by_month if count > 0)
    active_6m = sum(1 for count in orders_by_month[-RECENT_MONTHS:] if count > 0)

    if not active_12m:
        pattern = "NONE"
    elif active_6m >= REGULAR_ACTIVE_MONTHS:
        pattern = "REGULAR"
    elif active_6m <= 1 and any(count >= BURST_MONTH_ORDERS for count in orders_by_month):
        pattern = "BURST"
    else:
        pattern = "OCCASIONAL"

    aggregate = matched_qs.aggregate(
        last_date=Max("transaction_date"),
    )

    last_date = aggregate["last_date"]

    channels = Counter(
        row["source_system"]
        for row in matched_qs.values("source_system")
        if row["source_system"]
    )

    return {
        "pattern": pattern,
        "pattern_label": BEHAVIOUR_LABELS[pattern],
        "active_months_6m": active_6m,
        "active_months_12m": active_12m,
        "avg_transaction_value": 0.0,
        "product_diversity": (
            matched_qs.exclude(product_code__isnull=True)
            .values("product_code")
            .distinct()
            .count()
        ),
        "preferred_channel": channels.most_common(1)[0][0] if channels else None,
        # None nghĩa là chưa từng giao dịch — khác hẳn "vừa giao dịch hôm nay".
        "days_inactive": (today - last_date).days if last_date else None,
        "inactive_warning": bool(
            last_date and (today - last_date).days > INACTIVE_WARNING_DAYS
        ),
    }


def _summary(customer, matched_qs, calls_qs, tickets_qs, survey_qs, today):
    year_start = today.replace(month=1, day=1)

    totals = matched_qs.aggregate(
        orders=Count("id"),
        orders_30d=Count(
            "id", filter=Q(transaction_date__gte=today - timedelta(days=30))
        ),
    )

    ratings = survey_qs.filter(
        send_status=SurveySendStatus.SUCCESS, rating_score__isnull=False
    ).aggregate(
        rated=Count("id"),
        avg_score=Avg("rating_score"),
        satisfied=Count("id", filter=Q(rating_score__gte=SATISFIED_FROM)),
    )

    rated = ratings["rated"]

    return {
        "tickets": tickets_qs.count(),
        "calls": calls_qs.count(),
        "transactions": totals["orders"],
        "total_value_ytd": 0.0,
        "orders_30d": totals["orders_30d"],
        "rated": rated,
        "avg_rating": round(ratings["avg_score"], 2) if rated else None,
        "csat_percent": (
            round(ratings["satisfied"] * 100 / rated, 2) if rated else None
        ),
    }


def _pic_label(full_name, employee_code):
    """
    Tên người phụ trách, kèm mã nhân viên khi có.

    Trả ``None`` nếu bản ghi chưa gắn nhân viên: giao diện cần phân biệt "chưa
    ghi nhận PIC" với một cái tên rỗng.
    """
    if not full_name:
        return None

    return f"{full_name} ({employee_code})" if employee_code else full_name


def _timeline(matched_qs, calls_qs, tickets_qs, survey_qs):
    """Dòng thời gian hợp nhất bốn nguồn, mới nhất trước."""
    items = []

    for row in matched_qs.order_by("-transaction_date")[:TIMELINE_LIMIT].values(
        "transaction_date", "side", "stock_code", "order_status", "source_system",
    ):
        items.append(
            {
                "type": "transaction",
                "date": row["transaction_date"].isoformat(),
                "title": f"{'Bán' if (row['side'] or '').upper() == 'SELL' else 'Mua'} {row['stock_code'] or ''}".strip(),
                "description": "",
                "value": None,
                "meta": row["source_system"],
                "pic": None,
            }
        )

    for row in calls_qs.order_by("-call_time")[:TIMELINE_LIMIT].values(
        "call_time",
        "call_direction",
        "duration_seconds",
        "note",
        "employee__full_name",
        "employee__employee_code",
    ):
        duration = row["duration_seconds"] or 0
        items.append(
            {
                "type": "call",
                "date": timezone.localtime(row["call_time"]).date().isoformat(),
                "title": (
                    "Gọi đến" if (row["call_direction"] or "").upper() == "INBOUND"
                    else "Gọi đi"
                ),
                "description": row["note"] or "",
                "value": None,
                "meta": f"{duration // 60} phút {duration % 60} giây" if duration else "Gọi nhỡ",
                # Người trực tiếp gọi. Cuộc gọi cũ có thể chưa gắn nhân viên
                # nên để None chứ không dựng chuỗi rỗng — giao diện phân biệt
                # được "chưa ghi nhận PIC" với "PIC tên rỗng".
                "pic": _pic_label(
                    row["employee__full_name"], row["employee__employee_code"]
                ),
            }
        )

    for row in tickets_qs.order_by("-created_at")[:TIMELINE_LIMIT].values(
        "ticket_code", "title", "created_at", "current_status__status_name"
    ):
        items.append(
            {
                "type": "ticket",
                "date": timezone.localtime(row["created_at"]).date().isoformat(),
                "title": row["ticket_code"] or "Ticket",
                "description": row["title"] or "",
                "value": None,
                "meta": row["current_status__status_name"],
                "pic": None,
            }
        )

    for row in survey_qs.filter(
        send_status=SurveySendStatus.SUCCESS,
        rating_score__isnull=False,
        sent_at__isnull=False,
    ).order_by("-sent_at")[:TIMELINE_LIMIT].values(
        "sent_at", "rating_score", "rating_note"
    ):
        items.append(
            {
                "type": "survey",
                "date": timezone.localtime(row["sent_at"]).date().isoformat(),
                "title": f"Khảo sát {row['rating_score']}/5",
                "description": row["rating_note"] or "",
                "value": row["rating_score"],
                "meta": None,
                "pic": None,
            }
        )

    items.sort(key=lambda item: item["date"], reverse=True)

    return items[:TIMELINE_LIMIT]


def build_customer_360(customer):
    """Toàn bộ số liệu của một khách cho màn 360."""
    today = timezone.localdate()
    months = _month_buckets(today)
    earliest = months[0]

    account_ids = list(customer.accounts.values_list("id", flat=True))

    transactions_qs = TransactionLog.objects.filter(customer_account_id__in=account_ids)
    matched_qs = transactions_qs.filter(order_status__in=MATCHED_ORDER_STATUSES)
    calls_qs = CallLog.objects.filter(customer=customer)
    tickets_qs = Ticket.objects.filter(customer=customer)
    survey_qs = TicketSurveyLog.objects.filter(customer=customer)

    transaction_series = _transaction_series(
        matched_qs.filter(transaction_date__gte=earliest), months
    )

    return {
        "customer": _customer_header(customer),
        "summary": _summary(
            customer, matched_qs, calls_qs, tickets_qs, survey_qs, today
        ),
        "behaviour": _behaviour(transaction_series, matched_qs, today),
        "series": {
            "transactions": transaction_series,
            "calls": _call_series(calls_qs.filter(call_time__date__gte=earliest), months),
            "surveys": _survey_series(survey_qs, months),
        },
        "timeline": _timeline(matched_qs, calls_qs, tickets_qs, survey_qs),
    }
