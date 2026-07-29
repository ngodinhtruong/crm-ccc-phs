"""
Chuẩn hóa kỳ thời gian của dashboard chatbot: ngày / tuần / tháng / quý / năm.

Trước đây bốn hàm trong ``aggregations.py`` tự lặp lại cùng một khối
if/elif chọn hàm Trunc rồi tự ``strftime`` ra key và nhãn. Mỗi lần thêm một
đơn vị thời gian mới là phải sửa đủ bốn chỗ, và thực tế nhãn tháng đã trôi
thành hai kiểu khác nhau ("T07/2026" và "Tháng 07/2026"). Gom về một chỗ để
thêm quý/năm chỉ phải khai báo một lần.

Toàn bộ hàm ở đây cắt kỳ theo GIỜ VIỆT NAM, không theo ``settings.TIME_ZONE``
(đang là UTC). Nếu cắt theo UTC thì phiên chat lúc 05:00 ngày 01/01/2026 giờ
Việt Nam sẽ bị tính sang 31/12/2025 — rơi nhầm quý và nhầm năm, đúng ngay chỗ
người dùng nhìn khi so sánh kỳ.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models.functions import (
    TruncDate,
    TruncMonth,
    TruncQuarter,
    TruncWeek,
    TruncYear,
)
from django.utils import timezone

# Múi giờ nghiệp vụ. Chỉ áp dụng cho dashboard chatbot nên không đụng tới
# cách các module khác (ticket, KPI, SLA) đang hiển thị thời gian.
DASHBOARD_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")

GRANULARITY_DAY = "day"
GRANULARITY_WEEK = "week"
GRANULARITY_MONTH = "month"
GRANULARITY_QUARTER = "quarter"
GRANULARITY_YEAR = "year"

ALL_GRANULARITIES = (
    GRANULARITY_DAY,
    GRANULARITY_WEEK,
    GRANULARITY_MONTH,
    GRANULARITY_QUARTER,
    GRANULARITY_YEAR,
)

DEFAULT_GRANULARITY = GRANULARITY_MONTH

GRANULARITY_LABELS = {
    GRANULARITY_DAY: "Ngày",
    GRANULARITY_WEEK: "Tuần",
    GRANULARITY_MONTH: "Tháng",
    GRANULARITY_QUARTER: "Quý",
    GRANULARITY_YEAR: "Năm",
}

# Kỳ cha của từng mốc — khoảng được nới ra khi bộ lọc quá hẹp.
PARENT_GRANULARITY = {
    GRANULARITY_DAY: GRANULARITY_WEEK,
    GRANULARITY_WEEK: GRANULARITY_MONTH,
    GRANULARITY_MONTH: GRANULARITY_YEAR,
    GRANULARITY_QUARTER: GRANULARITY_YEAR,
    # Năm không có kỳ cha nên lấy COMPARISON_YEARS năm gần nhất.
    GRANULARITY_YEAR: None,
}

# Mốc năm không có kỳ cha nên lấy N năm gần nhất làm khoảng so sánh.
COMPARISON_YEARS = 2

# Ngưỡng suy ra mốc từ độ dài khoảng lọc (đơn vị: ngày, đã tính cả 2 đầu).
#   <= 31   -> ngày   (lọc trong một tháng, ví dụ 01 -> 15)
#   <= 92   -> tuần   (một tới ba tháng)
#   <= 366  -> tháng  (tới trọn một năm, ví dụ T1 -> T12)
#   > 366   -> năm    (nhiều năm)
_RANGE_THRESHOLDS = (
    (31, GRANULARITY_DAY),
    (92, GRANULARITY_WEEK),
    (366, GRANULARITY_MONTH),
)


def granularity_for_range(span_days):
    """
    Suy ra mốc thời gian phù hợp từ độ dài khoảng lọc.

    Người dùng không phải tự chọn mốc: chọn một ngày thì xem theo ngày, chọn
    trọn năm thì xem theo tháng, chọn nhiều năm thì xem theo năm. Trả về
    ``DEFAULT_GRANULARITY`` khi không xác định được khoảng.
    """
    if span_days is None:
        return DEFAULT_GRANULARITY

    for threshold, granularity in _RANGE_THRESHOLDS:
        if span_days <= threshold:
            return granularity

    return GRANULARITY_YEAR


_TRUNC_BY_GRANULARITY = {
    GRANULARITY_DAY: TruncDate,
    GRANULARITY_WEEK: TruncWeek,
    GRANULARITY_MONTH: TruncMonth,
    GRANULARITY_QUARTER: TruncQuarter,
    GRANULARITY_YEAR: TruncYear,
}


def normalize_granularity(value, default=DEFAULT_GRANULARITY):
    """Ép giá trị người dùng gửi lên về một granularity hợp lệ."""
    candidate = str(value or "").strip().lower()

    return candidate if candidate in ALL_GRANULARITIES else default


def quarter_of(value):
    """Quý (1-4) của một date/datetime."""
    return (value.month - 1) // 3 + 1


def period_trunc(granularity, field="started_at"):
    """Hàm Trunc tương ứng, đã gắn múi giờ Việt Nam."""
    granularity = normalize_granularity(granularity)

    return _TRUNC_BY_GRANULARITY[granularity](field, tzinfo=DASHBOARD_TIMEZONE)


def period_key(granularity, value):
    """
    Khóa sắp xếp được của một kỳ.

    Khóa phải sắp xếp đúng bằng so sánh chuỗi vì các hàm aggregate đang dùng
    ``sorted(period_map.keys())``. ``strftime`` không có mã cho quý nên quý
    được ghép tay; "2026-Q1" < "2026-Q2" nên thứ tự vẫn đúng.
    """
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return f"{value.year:04d}"

    if granularity == GRANULARITY_QUARTER:
        return f"{value.year:04d}-Q{quarter_of(value)}"

    if granularity == GRANULARITY_MONTH:
        return value.strftime("%Y-%m")

    if granularity == GRANULARITY_WEEK:
        return value.strftime("%Y-W%W")

    return value.strftime("%Y-%m-%d")


def period_label(granularity, value):
    """Nhãn tiếng Việt hiển thị trên trục hoành."""
    granularity = normalize_granularity(granularity)

    if granularity == GRANULARITY_YEAR:
        return f"Năm {value.year}"

    if granularity == GRANULARITY_QUARTER:
        return f"Q{quarter_of(value)}/{value.year}"

    if granularity == GRANULARITY_MONTH:
        return f"T{value.strftime('%m/%Y')}"

    if granularity == GRANULARITY_WEEK:
        return f"Tuần {value.strftime('%W')} ({value.strftime('%d/%m')})"

    return value.strftime("%d/%m")


def _as_local(value):
    """Đưa một datetime/date bất kỳ về datetime theo giờ Việt Nam."""
    if isinstance(value, datetime):
        if timezone.is_aware(value):
            return value.astimezone(DASHBOARD_TIMEZONE)

        return value.replace(tzinfo=DASHBOARD_TIMEZONE)

    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=DASHBOARD_TIMEZONE)

    raise TypeError(f"Không xử lý được kiểu thời gian: {type(value)!r}")


def _make_local(year, month, day):
    return datetime(year, month, day, tzinfo=DASHBOARD_TIMEZONE)


def _add_months(value, months):
    """Cộng/trừ tháng cho một mốc đầu kỳ (ngày luôn là 1 nên không tràn)."""
    index = (value.year * 12 + value.month - 1) + months

    return _make_local(index // 12, index % 12 + 1, 1)


def period_start(granularity, moment):
    """Mốc bắt đầu (giờ VN) của kỳ chứa ``moment``."""
    granularity = normalize_granularity(granularity)
    local = _as_local(moment)

    if granularity == GRANULARITY_YEAR:
        return _make_local(local.year, 1, 1)

    if granularity == GRANULARITY_QUARTER:
        return _make_local(local.year, 3 * (quarter_of(local) - 1) + 1, 1)

    if granularity == GRANULARITY_MONTH:
        return _make_local(local.year, local.month, 1)

    if granularity == GRANULARITY_WEEK:
        # TruncWeek của Django lấy thứ Hai làm đầu tuần.
        monday = local.date() - timedelta(days=local.weekday())
        return _make_local(monday.year, monday.month, monday.day)

    return _make_local(local.year, local.month, local.day)


def period_bounds(granularity, moment):
    """Khoảng nửa mở ``[start, end)`` của kỳ chứa ``moment``."""
    granularity = normalize_granularity(granularity)
    start = period_start(granularity, moment)

    if granularity == GRANULARITY_YEAR:
        end = _make_local(start.year + 1, 1, 1)
    elif granularity == GRANULARITY_QUARTER:
        end = _add_months(start, 3)
    elif granularity == GRANULARITY_MONTH:
        end = _add_months(start, 1)
    elif granularity == GRANULARITY_WEEK:
        end = start + timedelta(days=7)
    else:
        end = start + timedelta(days=1)

    return start, end


def _reference_bounds(start, end, reference=None):
    """
    Hai mốc dùng để dò kỳ cha.

    ``end`` là mốc loại trừ (nửa mở) nên phải lùi lại một nhịp, không thì lọc
    hết 31/12 sẽ bị kéo sang năm sau.
    """
    fallback = _as_local(reference) if reference else _as_local(timezone.now())

    lo_ref = _as_local(start) if start else fallback
    hi_ref = _as_local(end) - timedelta(microseconds=1) if end else fallback

    return lo_ref, hi_ref


def _parent_bounds(granularity, lo_ref, hi_ref):
    """
    Khoảng nửa mở của (các) kỳ cha bao trọn ``lo_ref`` .. ``hi_ref``.

    ``granularity`` là mốc của các cột sẽ vẽ, không phải mốc cha.
    """
    if granularity == GRANULARITY_YEAR:
        last_year = hi_ref.year
        lo = _make_local(last_year - COMPARISON_YEARS + 1, 1, 1)
        hi = _make_local(last_year + 1, 1, 1)
    else:
        parent = PARENT_GRANULARITY[granularity]
        lo = period_start(parent, lo_ref)
        hi = period_bounds(parent, hi_ref)[1]

    # Cắt phần tương lai: nới khoảng ra là để có kỳ ngang hàng làm nền so
    # sánh, mà kỳ chưa tới thì luôn bằng 0 và kéo % tăng giảm về -100%.
    # Chặn ở cuối kỳ hiện tại chứ không phải đúng lúc này, để kỳ đang chạy
    # vẫn hiện đủ (hôm nay vẫn là một cột trọn vẹn).
    current_period_end = period_bounds(granularity, timezone.now())[1]

    return lo, min(hi, current_period_end)


def spans_single_period(granularity, start, end):
    """Bộ lọc có gói gọn trong đúng một kỳ không."""
    if start is None or end is None:
        return False

    lo_ref, hi_ref = _reference_bounds(start, end)

    return period_start(granularity, lo_ref) == period_start(granularity, hi_ref)


def iter_periods(granularity, lo, hi):
    """
    Sinh mốc đầu của từng kỳ trong khoảng nửa mở ``[lo, hi)``.

    Dùng để điền kỳ trống: biểu đồ so sánh phải hiện đủ 7 ngày trong tuần hay
    đủ 4 quý trong năm, kỳ không có phiên nào thì cột bằng 0 chứ không biến
    mất khỏi trục.
    """
    if lo is None or hi is None:
        return

    cursor = period_start(granularity, lo)

    while cursor < hi:
        yield cursor
        cursor = period_bounds(granularity, cursor)[1]


def series_bounds(granularity, start=None, end=None, reference=None):
    """
    Khoảng cho các biểu đồ chuỗi thời gian.

    Chỉ nới khi bộ lọc gói gọn trong đúng một kỳ: lọc "hôm nay" mà vẽ theo
    ngày thì được đúng một cột, không thấy xu hướng gì — nới ra trọn tuần để
    có các ngày trong tuần làm nền so sánh. Lọc rộng hơn một kỳ thì giữ
    nguyên, vì lúc đó bản thân bộ lọc đã đủ cột.
    """
    granularity = normalize_granularity(granularity)

    if not spans_single_period(granularity, start, end):
        return start, end

    return _parent_bounds(granularity, *_reference_bounds(start, end, reference))
