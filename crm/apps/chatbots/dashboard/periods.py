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

# Mốc của biểu đồ so sánh, suy từ mốc của biểu đồ chính.
#
# Giữ nguyên mốc là chính: chọn quý thì so quý với quý, chọn năm thì so năm
# với năm, xem theo ngày thì so ngày với ngày. Riêng THÁNG gộp lên QUÝ, vì
# xem 12 tháng mà so từng tháng thì quá vụn — cái người đọc báo cáo cần ở
# mức đó là "quý này so với quý trước".
COMPARISON_GRANULARITY = {
    GRANULARITY_DAY: GRANULARITY_WEEK,
    GRANULARITY_WEEK: GRANULARITY_MONTH,
    GRANULARITY_MONTH: GRANULARITY_QUARTER,
    GRANULARITY_QUARTER: GRANULARITY_YEAR,
    GRANULARITY_YEAR: GRANULARITY_YEAR,
}

# Thứ tự dò khi tìm kỳ lịch mà bộ lọc trùng khít.
_COMPARISON_LADDER = (
    GRANULARITY_DAY,
    GRANULARITY_WEEK,
    GRANULARITY_MONTH,
    GRANULARITY_QUARTER,
    GRANULARITY_YEAR,
)

# Kỳ cha của từng mốc — khoảng được nới ra khi bộ lọc quá hẹp.
PARENT_GRANULARITY = {
    GRANULARITY_DAY: GRANULARITY_WEEK,
    GRANULARITY_WEEK: GRANULARITY_MONTH,
    GRANULARITY_MONTH: GRANULARITY_YEAR,
    GRANULARITY_QUARTER: GRANULARITY_YEAR,
    # Năm không có kỳ cha nên lấy COMPARISON_YEARS năm gần nhất.
    GRANULARITY_YEAR: None,
}

COMPARISON_YEARS = 5


def comparison_granularity(granularity, start=None, end=None):
    """
    Mốc của biểu đồ so sánh.

    Bộ lọc trùng khít đúng một kỳ lịch thì so sánh theo chính kỳ đó, để đặt
    cạnh các kỳ ngang hàng — lọc một ngày so với các ngày trong tuần, lọc trọn
    tháng so với các tháng, trọn quý so với các quý, trọn năm so với các năm.

    Bộ lọc lệch khỏi ranh giới lịch (01 -> 15, hay "5 tháng gần đây") thì
    không có kỳ ngang hàng tự nhiên, nên lùi về quy tắc thô hơn mốc chính một
    bậc: xem theo ngày so theo tuần, xem theo tháng so theo quý.
    """
    for candidate in _COMPARISON_LADDER:
        if covers_whole_period(candidate, start, end):
            return candidate

    return COMPARISON_GRANULARITY[normalize_granularity(granularity)]

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

# Múi giờ nghiệp vụ. Chỉ áp dụng cho dashboard chatbot nên không đụng tới
# cách các module khác (ticket, KPI, SLA) đang hiển thị thời gian.
DASHBOARD_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")

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


def shift_years(value, years):
    """
    Lùi/tiến một mốc thời gian đúng ``years`` năm.

    29/02 của năm nhuận không tồn tại ở năm thường nên lùi về 28/02, thay vì
    để ``replace`` ném ValueError và làm hỏng cả response.
    """
    local = _as_local(value)

    try:
        return local.replace(year=local.year + years)
    except ValueError:
        return local.replace(year=local.year + years, day=28)


def comparison_bounds(granularity, start=None, end=None, reference=None):
    """
    Khoảng nửa mở ``[lo, hi)`` cho biểu đồ so sánh kỳ.

    Bộ lọc hẹp thì không có gì để so — lọc đúng một ngày mà gom theo ngày chỉ
    ra một cột. Nên khoảng được nới ra trọn kỳ cha: xem theo ngày thì so với
    cả tuần chứa ngày đó, xem theo tháng/quý thì so các quý trong trọn năm.
    Mốc năm không có kỳ cha nên lấy ``COMPARISON_YEARS`` năm gần nhất.

    Tham số ``granularity`` là mốc của biểu đồ CHÍNH; hàm tự quy ra mốc so
    sánh nên phía gọi không phải nhớ bảng tra.

    ``end`` là mốc loại trừ (nửa mở) nên phải lùi lại một nhịp trước khi tìm
    kỳ cha, không thì lọc hết 31/12 sẽ bị kéo sang năm sau.
    """
    lo_ref, hi_ref = _reference_bounds(start, end, reference)

    return _parent_bounds(
        comparison_granularity(granularity, start=start, end=end), lo_ref, hi_ref
    )


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
    """Khoảng nửa mở của (các) kỳ cha bao trọn ``lo_ref`` .. ``hi_ref``."""
    if granularity == GRANULARITY_YEAR:
        last_year = hi_ref.year
        return (
            _make_local(last_year - COMPARISON_YEARS + 1, 1, 1),
            _make_local(last_year + 1, 1, 1),
        )

    parent = PARENT_GRANULARITY[granularity]

    return period_start(parent, lo_ref), period_bounds(parent, hi_ref)[1]


def spans_single_period(granularity, start, end):
    """Bộ lọc có gói gọn trong đúng một kỳ không."""
    if start is None or end is None:
        return False

    lo_ref, hi_ref = _reference_bounds(start, end)

    return period_start(granularity, lo_ref) == period_start(granularity, hi_ref)


def covers_whole_period(granularity, start, end):
    """
    Bộ lọc có trùng khít đúng một kỳ lịch không.

    Khác ``spans_single_period`` ở chỗ đòi hỏi phủ TRỌN kỳ chứ không chỉ nằm
    lọt trong kỳ: 01 -> 15/07 nằm trong tháng 7 nhưng không phủ trọn tháng 7,
    nên không được coi là "lọc theo tháng".
    """
    if start is None or end is None:
        return False

    lo = _as_local(start)
    hi = _as_local(end)
    period_lo, period_hi = period_bounds(granularity, lo)

    return lo == period_lo and hi == period_hi


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


def same_period_last_year(granularity, moment):
    """
    Kỳ cùng loại của năm trước.

    Tính lại mốc đầu kỳ sau khi lùi năm thay vì lùi thẳng ``start``: với tuần,
    ngày 01/07 năm nay và năm trước rơi vào thứ khác nhau nên phải chuẩn hóa
    lại về đầu tuần thì hai khoảng mới cùng độ dài và cùng kiểu.
    """
    return period_bounds(granularity, shift_years(moment, -1))
