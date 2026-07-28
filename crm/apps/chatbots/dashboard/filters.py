"""Chuẩn hóa bộ lọc dashboard và dùng khoảng datetime để tận dụng index."""

from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.chatbots.dashboard.periods import (
    ALL_GRANULARITIES,
    DASHBOARD_TIMEZONE,
    comparison_bounds,
    granularity_for_range,
    series_bounds,
)
from apps.chatbots.models import ChatbotChatLog, ChatbotSessionSummary


class ChatbotDashboardFilterMixin:
    FILTER_PARAM_NAMES = (
        "year",
        "month",
        "start_date",
        "end_date",
        "start_hour",
        "end_hour",
    )

    def get_int_param(self, name):
        value = self.request.query_params.get(name)

        if value in (None, ""):
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _aware_datetime(value):
        """
        Gắn múi giờ Việt Nam cho mốc lọc.

        Trước đây dùng ``timezone.get_current_timezone()`` (= UTC theo
        settings), nên "từ ngày 01/07" bị hiểu là 07:00 giờ VN ngày 01/07 và
        làm rơi mất các phiên chat từ 00:00 đến 07:00. Dashboard chatbot đọc
        theo giờ nghiệp vụ nên phải cắt theo giờ VN.
        """
        if timezone.is_naive(value) and timezone.is_aware(timezone.now()):
            return timezone.make_aware(value, DASHBOARD_TIMEZONE)
        return value

    def _date_range(self):
        start_date = parse_date(self.request.query_params.get("start_date") or "")
        end_date = parse_date(self.request.query_params.get("end_date") or "")

        if start_date or end_date:
            start_at = (
                self._aware_datetime(datetime.combine(start_date, time.min))
                if start_date
                else None
            )
            end_at = (
                self._aware_datetime(datetime.combine(end_date + timedelta(days=1), time.min))
                if end_date
                else None
            )
            return start_at, end_at, None

        year = self.get_int_param("year")
        month = self.get_int_param("month")

        if year and 1 <= year <= 9998:
            if month and 1 <= month <= 12:
                start_at = self._aware_datetime(datetime(year, month, 1))
                if month == 12:
                    end_at = self._aware_datetime(datetime(year + 1, 1, 1))
                else:
                    end_at = self._aware_datetime(datetime(year, month + 1, 1))
                return start_at, end_at, None

            return (
                self._aware_datetime(datetime(year, 1, 1)),
                self._aware_datetime(datetime(year + 1, 1, 1)),
                None,
            )

        # Giữ tương thích trường hợp frontend chỉ gửi month mà không gửi year.
        if month and 1 <= month <= 12:
            return None, None, month

        return None, None, None

    def apply_hour_filter(self, queryset, date_field):
        """Lọc theo khung giờ. Tách riêng vì biểu đồ so sánh cũng cần dùng."""
        start_hour = self.get_int_param("start_hour")
        end_hour = self.get_int_param("end_hour")

        valid_hours = (
            start_hour is not None
            and end_hour is not None
            and 0 <= start_hour <= 23
            and 0 <= end_hour <= 23
        )

        if not valid_hours:
            return queryset

        # Khung giờ vắt qua nửa đêm (vd 22h -> 2h) thì phải dùng OR.
        if start_hour <= end_hour:
            return queryset.filter(
                **{
                    f"{date_field}__hour__gte": start_hour,
                    f"{date_field}__hour__lte": end_hour,
                }
            )

        return queryset.filter(
            Q(**{f"{date_field}__hour__gte": start_hour})
            | Q(**{f"{date_field}__hour__lte": end_hour})
        )

    def filter_by_period(self, queryset, date_field):
        start_at, end_at, standalone_month = self._date_range()

        if start_at is not None:
            queryset = queryset.filter(**{f"{date_field}__gte": start_at})

        if end_at is not None:
            queryset = queryset.filter(**{f"{date_field}__lt": end_at})

        if standalone_month is not None:
            queryset = queryset.filter(**{f"{date_field}__month": standalone_month})

        return self.apply_hour_filter(queryset, date_field)

    def filter_summaries(self, queryset):
        return self.filter_by_period(queryset, "started_at")

    def filter_logs(self, queryset):
        return self.filter_by_period(queryset, "external_created_at")

    def get_filtered_logs(self):
        return self.filter_logs(ChatbotChatLog.objects.all())

    def get_filtered_summaries(self):
        return self.filter_summaries(ChatbotSessionSummary.objects.all())

    def get_focus_bounds(self):
        """Khoảng người dùng thực sự lọc, để đánh dấu kỳ đang xem."""
        start_at, end_at, _ = self._date_range()
        return start_at, end_at

    def _summaries_in_bounds(self, lo, hi):
        """Queryset theo khoảng chỉ định, vẫn giữ bộ lọc khung giờ."""
        queryset = ChatbotSessionSummary.objects.all()

        if lo is not None:
            queryset = queryset.filter(started_at__gte=lo)

        if hi is not None:
            queryset = queryset.filter(started_at__lt=hi)

        return self.apply_hour_filter(queryset, "started_at")

    def get_comparison_summaries(self, granularity):
        """Queryset cho biểu đồ so sánh kỳ (nới ra trọn kỳ cha)."""
        start_at, end_at = self.get_focus_bounds()

        return self._summaries_in_bounds(
            *comparison_bounds(granularity, start=start_at, end=end_at)
        )

    def get_series_summaries(self, granularity):
        """
        Queryset cho biểu đồ chuỗi thời gian.

        Giống bộ lọc, trừ khi bộ lọc gói gọn trong đúng một kỳ thì nới ra kỳ
        cha — xem "hôm nay" sẽ vẽ cả tuần thay vì đúng một cột.
        """
        start_at, end_at = self.get_focus_bounds()

        return self._summaries_in_bounds(
            *series_bounds(granularity, start=start_at, end=end_at)
        )

    def get_range_span_days(self):
        """
        Độ dài khoảng lọc tính bằng ngày (tính cả hai đầu).

        Trả None khi không xác định được khoảng — khi đó phía gọi tự quyết
        định mốc mặc định.
        """
        start_at, end_at, standalone_month = self._date_range()

        if start_at is not None and end_at is not None:
            return max(1, (end_at - start_at).days)

        if standalone_month is not None:
            return 31

        if start_at is not None:
            return max(1, (timezone.now() - start_at).days + 1)

        return None

    def resolve_granularity(self, requested=None):
        """
        Mốc thời gian dùng để vẽ biểu đồ.

        Ưu tiên giá trị người dùng chọn tay; không có thì suy ra từ độ dài
        khoảng lọc.
        """
        candidate = str(requested or "").strip().lower()

        if candidate in ALL_GRANULARITIES:
            return candidate

        return granularity_for_range(self.get_range_span_days())

    def get_filter_response(self):
        return {
            name: self.request.query_params.get(name)
            for name in self.FILTER_PARAM_NAMES
        }

    def get_filter_signature(self, granularity="day"):
        return {
            **self.get_filter_response(),
            "granularity": granularity,
        }
