"""
Số liệu cho dashboard khảo sát CSAT.

Chỉ tính trên các lần gửi THÀNH CÔNG khi nói về đánh giá: lần gửi hỏng thì
khách chưa từng nhận được tin, gộp vào mẫu số sẽ kéo tỷ lệ phản hồi xuống mà
không phản ánh chất lượng phục vụ.

Module tự lo phần chia kỳ tháng/quý/năm thay vì mượn ``apps.chatbots.dashboard
.periods``: ở đây chỉ cần ba mốc, còn kéo cả module kia sang thì app ticket
phụ thuộc vào dashboard của app chatbot chỉ để lấy vài hàm cộng tháng.
"""

from datetime import datetime, timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncMonth, TruncQuarter, TruncYear
from django.utils.dateparse import parse_date

from apps.tickets.models import SurveySendStatus, TicketSurveyLog
from apps.tickets.surveys.services import SURVEY_TIMEZONE

GRANULARITY_MONTH = "month"
GRANULARITY_QUARTER = "quarter"
GRANULARITY_YEAR = "year"

GRANULARITIES = (GRANULARITY_MONTH, GRANULARITY_QUARTER, GRANULARITY_YEAR)
DEFAULT_GRANULARITY = GRANULARITY_MONTH

# Điểm từ mức này trở lên coi là khách hài lòng. CSAT (%) là tỷ lệ khách hài
# lòng trên tổng số khách đã chấm, không phải điểm trung bình quy về phần trăm.
SATISFIED_FROM = 4

# Mục tiêu do nghiệp vụ đặt, hiện ở cột "MỤC TIÊU" của bảng so sánh.
TARGETS = {
    "csat_percent": 80,
    "rated": 12,
    "average_score": 4,
    "response_rate": 20,
}


def normalize_granularity(value):
    value = (value or "").strip().lower()

    return value if value in GRANULARITIES else DEFAULT_GRANULARITY


def _local(year, month, day=1):
    return datetime(year, month, day, tzinfo=SURVEY_TIMEZONE)


def _add_months(start, months):
    """Cộng/trừ tháng cho một mốc đầu kỳ (ngày luôn là 1 nên không tràn)."""
    index = (start.year * 12 + start.month - 1) + months

    return _local(index // 12, index % 12 + 1)


def quarter_of(moment):
    return (moment.month - 1) // 3 + 1


def parse_period(granularity, value, today=None):
    """
    Chuỗi kỳ -> mốc đầu kỳ.

    Nhận ``2026-06`` (tháng), ``2026-Q2`` (quý), ``2026`` (năm). Đọc không ra
    thì lấy kỳ hiện tại — người dùng mở dashboard lần đầu chưa chọn gì.
    """
    granularity = normalize_granularity(granularity)
    text = (value or "").strip().upper()
    now = today or datetime.now(SURVEY_TIMEZONE)

    try:
        if granularity == GRANULARITY_YEAR:
            return _local(int(text), 1)

        if granularity == GRANULARITY_QUARTER:
            year, quarter = text.split("-Q")
            quarter = int(quarter)

            if not 1 <= quarter <= 4:
                raise ValueError(text)

            return _local(int(year), 3 * (quarter - 1) + 1)

        year, month = text.split("-")
        month = int(month)

        if not 1 <= month <= 12:
            raise ValueError(text)

        return _local(int(year), month)
    except (AttributeError, TypeError, ValueError):
        return period_start(granularity, now)


def period_start(granularity, moment):
    """Mốc đầu kỳ chứa ``moment``."""
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return _local(moment.year, 1)

    if granularity == GRANULARITY_QUARTER:
        return _local(moment.year, 3 * (quarter_of(moment) - 1) + 1)

    return _local(moment.year, moment.month)


def period_bounds(granularity, start):
    """Khoảng nửa mở ``[start, end)`` của kỳ."""
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return start, _local(start.year + 1, 1)

    if granularity == GRANULARITY_QUARTER:
        return start, _add_months(start, 3)

    return start, _add_months(start, 1)


def previous_period(granularity, start):
    """Mốc đầu kỳ liền trước — cột so sánh của bảng Key comparison."""
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return _local(start.year - 1, 1)

    if granularity == GRANULARITY_QUARTER:
        return _add_months(start, -3)

    return _add_months(start, -1)


def period_code(granularity, start):
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return f"{start.year:04d}"

    if granularity == GRANULARITY_QUARTER:
        return f"{start.year:04d}-Q{quarter_of(start)}"

    return f"{start.year:04d}-{start.month:02d}"


def period_label(granularity, start):
    """Nhãn đầy đủ — dùng cho tiêu đề và cột của bảng so sánh."""
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return f"Năm {start.year}"

    if granularity == GRANULARITY_QUARTER:
        return f"Quý {quarter_of(start)}/{start.year}"

    return f"Tháng {start.month:02d}/{start.year}"


def period_short_label(granularity, start):
    """
    Nhãn ngắn cho trục hoành, đúng kiểu dashboard chatbot: ``T07/2026``.

    Trục có tới 12 mốc nên viết đủ chữ "Tháng" thì các nhãn chồng lên nhau
    hoặc bị Recharts bỏ bớt.
    """
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return f"Năm {start.year}"

    if granularity == GRANULARITY_QUARTER:
        return f"Q{quarter_of(start)}/{start.year}"

    return f"T{start.month:02d}/{start.year}"


# Mốc cha của biểu đồ so sánh: xem theo tháng hay quý thì lấy trọn năm làm
# nền, xem theo năm thì lấy năm nay và năm ngoái.
COMPARISON_YEARS = 2

_TRUNC = {
    GRANULARITY_MONTH: TruncMonth,
    GRANULARITY_QUARTER: TruncQuarter,
    GRANULARITY_YEAR: TruncYear,
}


def iter_periods(granularity, lo, hi):
    """
    Sinh mốc đầu của từng kỳ trong khoảng nửa mở ``[lo, hi)``.

    Dùng để điền kỳ trống: biểu đồ phải hiện đủ 4 quý trong năm, quý không có
    khảo sát nào thì cột bằng 0 chứ không biến mất khỏi trục.
    """
    cursor = period_start(granularity, lo)

    while cursor < hi:
        yield cursor
        cursor = period_bounds(granularity, cursor)[1]


def series_window(granularity, anchor, today=None):
    """
    Khoảng của biểu đồ so sánh kỳ.

    Tháng và quý lấy trọn năm chứa kỳ đang xem; năm lấy hai năm gần nhất.
    Cắt phần tương lai vì kỳ chưa tới luôn bằng 0 và làm biểu đồ trống một
    nửa — xem tháng 8 thì vẽ T01..T08, không kéo tới T12.
    """
    granularity = normalize_granularity(granularity)
    now = today or datetime.now(SURVEY_TIMEZONE)

    if granularity == GRANULARITY_YEAR:
        lo = _local(anchor.year - COMPARISON_YEARS + 1, 1)
    else:
        lo = _local(anchor.year, 1)

    hi = _local(anchor.year + 1, 1)

    # Chặn ở cuối kỳ hiện tại chứ không phải đúng lúc này, để kỳ đang chạy
    # vẫn là một cột trọn vẹn.
    current_end = period_bounds(granularity, period_start(granularity, now))[1]

    return lo, min(hi, current_end)


def build_period_series(base_queryset, granularity, anchor, today=None):
    """Số liệu từng kỳ trong khoảng so sánh, kỳ trống vẫn có mặt với giá trị 0."""
    granularity = normalize_granularity(granularity)
    lo, hi = series_window(granularity, anchor, today=today)

    if lo >= hi:
        return []

    rows = (
        base_queryset.filter(sent_at__gte=lo, sent_at__lt=hi)
        .annotate(bucket=_TRUNC[granularity]("sent_at", tzinfo=SURVEY_TIMEZONE))
        .values("bucket")
        .annotate(
            total=Count("id"),
            success=Count("id", filter=Q(send_status=SurveySendStatus.SUCCESS)),
            rated=Count(
                "id",
                filter=Q(
                    send_status=SurveySendStatus.SUCCESS,
                    rating_score__isnull=False,
                ),
            ),
            satisfied=Count(
                "id",
                filter=Q(
                    send_status=SurveySendStatus.SUCCESS,
                    rating_score__gte=SATISFIED_FROM,
                ),
            ),
            average_score=Avg(
                "rating_score",
                filter=Q(
                    send_status=SurveySendStatus.SUCCESS,
                    rating_score__isnull=False,
                ),
            ),
        )
    )

    by_code = {}

    for row in rows:
        if not row["bucket"]:
            continue

        local = row["bucket"].astimezone(SURVEY_TIMEZONE)
        by_code[period_code(granularity, local)] = row

    anchor_code = period_code(granularity, anchor)
    items = []

    for start in iter_periods(granularity, lo, hi):
        code = period_code(granularity, start)
        row = by_code.get(code)

        success = row["success"] if row else 0
        rated = row["rated"] if row else 0

        items.append(
            {
                "code": code,
                "label": period_label(granularity, start),
                # Nhãn trục hoành; nhãn đầy đủ để dành cho tooltip.
                "short_label": period_short_label(granularity, start),
                # Kỳ đang xem — tô đậm để phân biệt với các kỳ làm nền.
                "is_current": code == anchor_code,
                "total": row["total"] if row else 0,
                "success": success,
                "failed": (row["total"] if row else 0) - success,
                "rated": rated,
                "unrated": success - rated,
                # Khách chấm từ 4 sao trở lên — phần tử tạo nên CSAT (%).
                "satisfied": row["satisfied"] if row else 0,
                # ``None`` chứ không phải 0: tháng không gửi khảo sát nào thì
                # tỷ lệ phản hồi không tồn tại, khác hẳn với "gửi mà không ai
                # trả lời". Vẽ 0% cho tháng trống sẽ thành một đường đáy dài
                # đọc ra như dịch vụ tệ suốt nửa năm.
                "response_rate": _ratio(rated, success) if success else None,
                "average_score": (
                    round(row["average_score"], 2) if rated else None
                ),
                "csat_percent": (
                    _ratio(row["satisfied"] if row else 0, rated)
                    if rated
                    else None
                ),
            }
        )

    return items


def _ratio(part, whole):
    """Phần trăm, làm tròn 2 chữ số. Mẫu số 0 thì trả 0 chứ không lỗi."""
    if not whole:
        return 0.0

    return round(part * 100 / whole, 2)


def compute_metrics(queryset):
    """
    Các con số của một kỳ.

    ``rated`` chỉ đếm lần gửi thành công có điểm: điểm để trống nghĩa là khách
    chưa phản hồi, khác hẳn với chấm 0 điểm nên không được gộp làm một.
    """
    counts = queryset.aggregate(
        total=Count("id"),
        success=Count("id", filter=Q(send_status=SurveySendStatus.SUCCESS)),
        rated=Count(
            "id",
            filter=Q(
                send_status=SurveySendStatus.SUCCESS,
                rating_score__isnull=False,
            ),
        ),
        satisfied=Count(
            "id",
            filter=Q(
                send_status=SurveySendStatus.SUCCESS,
                rating_score__gte=SATISFIED_FROM,
            ),
        ),
        average_score=Avg(
            "rating_score",
            filter=Q(
                send_status=SurveySendStatus.SUCCESS,
                rating_score__isnull=False,
            ),
        ),
    )

    success = counts["success"]
    rated = counts["rated"]

    return {
        "total": counts["total"],
        "failed": counts["total"] - success,
        "success": success,
        "rated": rated,
        "unrated": success - rated,
        "response_rate": _ratio(rated, success),
        "average_score": round(counts["average_score"], 2) if rated else 0.0,
        "csat_percent": _ratio(counts["satisfied"], rated),
    }


def compute_categories(queryset):
    """Bảng "Kết quả khảo sát theo danh mục", sắp theo số gửi giảm dần."""
    rows = (
        queryset.filter(send_status=SurveySendStatus.SUCCESS)
        .values("ticket__support_category__category_name")
        .annotate(
            sent=Count("id"),
            rated=Count("id", filter=Q(rating_score__isnull=False)),
            satisfied=Count("id", filter=Q(rating_score__gte=SATISFIED_FROM)),
            average_score=Avg("rating_score", filter=Q(rating_score__isnull=False)),
        )
        .order_by("-sent")
    )

    return [
        {
            "category": row["ticket__support_category__category_name"] or "Khác",
            "sent": row["sent"],
            "rated": row["rated"],
            "response_rate": _ratio(row["rated"], row["sent"]),
            "average_score": (
                round(row["average_score"], 2) if row["rated"] else 0.0
            ),
            "csat_percent": _ratio(row["satisfied"], row["rated"]),
        }
        for row in rows
    ]


def _change_percent(current, previous):
    """
    Thay đổi tương đối so với kỳ trước.

    Kỳ trước bằng 0 thì không có phần trăm nào đúng cả (chia cho 0), trả
    ``None`` để màn hình hiện "—" thay vì bịa ra một con số.
    """
    if not previous:
        return None

    return round((current - previous) * 100 / previous, 1)


# (khóa, nhãn, đơn vị) — thứ tự đúng như bảng Key comparison của nghiệp vụ.
COMPARISON_ROWS = (
    ("csat_percent", "CSAT Score (%)", "percent"),
    ("rated", "Số phản hồi KH", "count"),
    ("average_score", "Điểm trung bình (1–5★)", "score"),
    ("response_rate", "Tỷ lệ phản hồi (%)", "percent"),
)


def build_comparison(current, previous):
    return [
        {
            "key": key,
            "label": label,
            "unit": unit,
            "current": current[key],
            "previous": previous[key],
            "change_percent": _change_percent(current[key], previous[key]),
            "target": TARGETS[key],
        }
        for key, label, unit in COMPARISON_ROWS
    ]


def _range_label(start, end):
    """Nhãn của một khoảng tự chọn; ``end`` là mốc mở nên lùi lại một ngày."""
    last = end - timedelta(days=1)

    return f"{start:%d/%m/%Y} - {last:%d/%m/%Y}"


def resolve_window(
    granularity, period_value, start_text=None, end_text=None, today=None
):
    """
    Khoảng thời gian của dashboard, kèm khoảng liền trước để so sánh.

    Có ``start``/``end`` thì đó là khoảng tự chọn, và kỳ so sánh là khoảng
    dài bằng đúng như vậy nằm ngay trước — so tháng 7 (31 ngày) với "30 ngày
    trước đó" mới có nghĩa, chứ so với cả quý thì con số nào cũng tụt.
    """
    granularity = normalize_granularity(granularity)

    custom_start = parse_date(start_text or "")
    custom_end = parse_date(end_text or "")

    if custom_start and custom_end and custom_end >= custom_start:
        start = _local(custom_start.year, custom_start.month, custom_start.day)
        end = _local(custom_end.year, custom_end.month, custom_end.day) + timedelta(
            days=1
        )
        span = end - start

        return {
            "granularity": "custom",
            "start": start,
            "end": end,
            "previous_start": start - span,
            "previous_end": start,
            "code": f"{custom_start.isoformat()}..{custom_end.isoformat()}",
            "label": _range_label(start, end),
            "previous_label": _range_label(start - span, start),
        }

    start = parse_period(granularity, period_value, today=today)
    end = period_bounds(granularity, start)[1]
    prev_start = previous_period(granularity, start)

    return {
        "granularity": granularity,
        "start": start,
        "end": end,
        "previous_start": prev_start,
        "previous_end": period_bounds(granularity, prev_start)[1],
        "code": period_code(granularity, start),
        "label": period_label(granularity, start),
        "previous_label": period_label(granularity, prev_start),
    }


def build_survey_dashboard(
    base_queryset,
    granularity,
    period_value,
    start_text=None,
    end_text=None,
    today=None,
):
    """Toàn bộ dữ liệu một lần gọi: kỳ này, kỳ trước, và bảng theo danh mục."""
    window = resolve_window(
        granularity, period_value, start_text, end_text, today=today
    )

    def within(lo, hi):
        return base_queryset.filter(sent_at__gte=lo, sent_at__lt=hi)

    current_qs = within(window["start"], window["end"])
    current = compute_metrics(current_qs)
    previous = compute_metrics(
        within(window["previous_start"], window["previous_end"])
    )

    return {
        "granularity": window["granularity"],
        "period": {
            "code": window["code"],
            "label": window["label"],
            "start": window["start"].date().isoformat(),
            # Nhãn "01 - 30/06" cần ngày cuối nằm trong kỳ, không phải mốc mở.
            "end": (window["end"] - timedelta(days=1)).date().isoformat(),
        },
        "previous_period": {"label": window["previous_label"]},
        "metrics": current,
        "previous_metrics": previous,
        "comparison": build_comparison(current, previous),
        "categories": compute_categories(current_qs),
        # Chuỗi kỳ để vẽ biểu đồ so sánh. Khoảng tự chọn không rơi gọn vào
        # một kỳ nào nên lấy mốc đầu khoảng làm neo.
        "series": build_period_series(
            base_queryset,
            normalize_granularity(granularity),
            window["start"],
            today=today,
        ),
    }


def scoped_survey_logs(tickets):
    """Khảo sát của những ticket người dùng được phép xem."""
    return TicketSurveyLog.objects.filter(ticket__in=tickets)
