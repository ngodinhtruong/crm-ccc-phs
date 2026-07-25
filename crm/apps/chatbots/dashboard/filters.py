"""Chuẩn hóa bộ lọc dashboard và dùng khoảng datetime để tận dụng index."""

from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

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
        if timezone.is_naive(value) and timezone.is_aware(timezone.now()):
            return timezone.make_aware(value, timezone.get_current_timezone())
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

    def filter_by_period(self, queryset, date_field):
        start_at, end_at, standalone_month = self._date_range()

        if start_at is not None:
            queryset = queryset.filter(**{f"{date_field}__gte": start_at})

        if end_at is not None:
            queryset = queryset.filter(**{f"{date_field}__lt": end_at})

        if standalone_month is not None:
            queryset = queryset.filter(**{f"{date_field}__month": standalone_month})

        start_hour = self.get_int_param("start_hour")
        end_hour = self.get_int_param("end_hour")

        valid_hours = (
            start_hour is not None
            and end_hour is not None
            and 0 <= start_hour <= 23
            and 0 <= end_hour <= 23
        )

        if valid_hours:
            if start_hour <= end_hour:
                queryset = queryset.filter(
                    **{
                        f"{date_field}__hour__gte": start_hour,
                        f"{date_field}__hour__lte": end_hour,
                    }
                )
            else:
                queryset = queryset.filter(
                    Q(**{f"{date_field}__hour__gte": start_hour})
                    | Q(**{f"{date_field}__hour__lte": end_hour})
                )

        return queryset

    def filter_summaries(self, queryset):
        return self.filter_by_period(queryset, "started_at")

    def filter_logs(self, queryset):
        return self.filter_by_period(queryset, "external_created_at")

    def get_filtered_logs(self):
        return self.filter_logs(ChatbotChatLog.objects.all())

    def get_filtered_summaries(self):
        return self.filter_summaries(ChatbotSessionSummary.objects.all())

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
