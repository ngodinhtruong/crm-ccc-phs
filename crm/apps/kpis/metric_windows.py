from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class MetricWindow:
    start_date: date
    end_date: date
    label: str


def _month_last_day(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _as_date(value):
    if hasattr(value, "date"):
        return value.date()
    return value


def get_metric_window(period, metric=None) -> MetricWindow:
    """
    KpiPeriod vẫn là kỳ chốt điểm theo tháng.
    frequency của từng KPI chỉ quyết định khoảng đo thực tế của KPI đó.

    Rule đang dùng cho dashboard/chốt KPI:
    - DAILY/WEEKLY/MONTHLY/ON_EVENT: đo trong tháng KPI được chọn.
      Lý do: các KPI này vẫn được chốt theo tháng, chỉ khác tần suất cập nhật/nhắc việc.
    - QUARTERLY: đo theo quý chứa tháng KPI.
    - HALF_YEARLY: đo theo 6 tháng chứa tháng KPI.
    - YEARLY: đo theo năm chứa tháng KPI.
    """
    period_start = _as_date(period.start_date)
    period_end = _as_date(period.end_date)

    frequency = (getattr(metric, "frequency", None) or "MONTHLY").upper()
    year = int(period.year or period_start.year)
    month = int(period.month or period_start.month)

    if frequency == "QUARTERLY":
        quarter_index = (month - 1) // 3
        start_month = quarter_index * 3 + 1
        end_month = start_month + 2
        return MetricWindow(
            start_date=date(year, start_month, 1),
            end_date=date(year, end_month, _month_last_day(year, end_month)),
            label=f"Quý {quarter_index + 1}/{year}",
        )

    if frequency == "HALF_YEARLY":
        if month <= 6:
            return MetricWindow(
                start_date=date(year, 1, 1),
                end_date=date(year, 6, 30),
                label=f"6 tháng đầu năm {year}",
            )

        return MetricWindow(
            start_date=date(year, 7, 1),
            end_date=date(year, 12, 31),
            label=f"6 tháng cuối năm {year}",
        )

    if frequency == "YEARLY":
        return MetricWindow(
            start_date=date(year, 1, 1),
            end_date=date(year, 12, 31),
            label=f"Năm {year}",
        )

    # DAILY/WEEKLY/MONTHLY/ON_EVENT vẫn đo trong tháng KPI để chốt điểm tháng ổn định.
    return MetricWindow(
        start_date=period_start,
        end_date=period_end,
        label=f"Kỳ KPI {getattr(period, 'period_code', '')}".strip(),
    )
