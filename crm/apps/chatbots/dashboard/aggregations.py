"""Các truy vấn aggregate nhỏ, độc lập theo section của dashboard chatbot."""

from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import ExtractHour

from apps.chatbots.constants import (
    SPAM_QUESTION_TYPES,
    UNCATEGORIZED_LABEL,
    category_label,
    channel_label,
)
from apps.chatbots.dashboard.periods import (
    DASHBOARD_TIMEZONE,
    GRANULARITY_LABELS,
    iter_periods,
    normalize_granularity,
    period_bounds,
    period_key,
    period_label,
    period_trunc,
    series_bounds,
)
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.serializers import ChatbotSessionQuickSerializer
from apps.common.constants import TicketStatusCode

OUTCOME_BOT_DONE = ChatbotSessionSummary.OUTCOME_BOT_DONE
OUTCOME_CCC = ChatbotSessionSummary.OUTCOME_CCC
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING

TOPIC_OUTCOMES = (OUTCOME_BOT_DONE, OUTCOME_CCC)

# Bốn nhóm xử lý phiên: mã trong DB -> tên cột đếm -> nhãn hiển thị.
# Một bảng duy nhất để KPI, biểu đồ theo kỳ và biểu đồ so sánh không trôi
# nhãn khác nhau; thêm nhóm mới chỉ phải khai báo ở đây.
OUTCOME_SERIES = (
    (OUTCOME_BOT_DONE, "bot_done", "Chatbot tự xử lý"),
    (OUTCOME_CCC, "ccc", "Chuyển CCC xử lý"),
    (OUTCOME_PENDING, "pending", "Chờ thông tin khách hàng"),
    (OUTCOME_SPAM, "spam", "Câu hỏi rác"),
)


def outcome_counts():
    """Bộ annotate đếm số phiên của từng nhóm xử lý."""
    return {
        field: Count("id", filter=Q(outcome_type=code))
        for code, field, _label in OUTCOME_SERIES
    }


def _outcome_values(row):
    """Bốn cột đếm của một dòng, kỳ không có phiên nào thì về 0."""
    return {field: row.get(field) or 0 for _code, field, _label in OUTCOME_SERIES}


class ChatbotDashboardAggregator:
    def __init__(
        self,
        summaries,
        logs,
        series_summaries=None,
        focus_bounds=(None, None),
    ):
        self.summaries = summaries
        self.logs = logs

        # Hai phạm vi, cố ý khác nhau:
        #   summaries        - đúng bộ lọc (phễu, khung giờ, bảng FAQ)
        #   series_summaries - nới ra kỳ cha KHI bộ lọc chỉ gói đúng một kỳ,
        #                      dùng cho mọi biểu đồ có trục thời gian
        # Không truyền thì cả hai rơi về đúng bộ lọc.
        self.series_summaries = (
            summaries if series_summaries is None else series_summaries
        )
        self.focus_bounds = focus_bounds
        self._outcome_rows_cache = {}

    @staticmethod
    def rate(value, total, digits=2):
        return round(value / total * 100, digits) if total else 0.0

    # ------------------------------------------------------------------
    # Khung dùng chung cho các biểu đồ có trục thời gian
    # ------------------------------------------------------------------
    def _outcome_rows(self, granularity):
        """
        Số phiên theo từng nhóm xử lý, cho mỗi kỳ trong cửa sổ chuỗi thời gian.

        Ba biểu đồ — chuỗi thời gian, so sánh kỳ, kết quả xử lý theo kỳ — cần
        đúng một phép đếm này và chỉ khác cách trình bày. Nhớ lại kết quả để
        một request dựng cả ba section chỉ chạy một truy vấn thay vì ba.

        Trả về danh sách ``(base, row)``. ``base`` giữ phần chung khóa/nhãn/có
        đang nằm trong bộ lọc không; ``row`` rỗng ở kỳ không có phiên nào — kỳ
        trống vẫn phải hiện thành cột 0, nếu không người đọc tưởng trục thiếu
        kỳ (bấm "Năm" mà năm chưa có dữ liệu thì biến mất khỏi biểu đồ).
        """
        granularity = normalize_granularity(granularity)

        if granularity in self._outcome_rows_cache:
            return self._outcome_rows_cache[granularity]

        by_key = {
            period_key(granularity, row["period"]): row
            for row in (
                self.series_summaries.filter(started_at__isnull=False)
                .annotate(period=period_trunc(granularity))
                .values("period")
                .annotate(total=Count("id"), **outcome_counts())
            )
            if row["period"]
        }

        window_lo, window_hi = series_bounds(granularity, *self.focus_bounds)
        rows = []

        for period in iter_periods(granularity, window_lo, window_hi):
            key = period_key(granularity, period)
            rows.append(
                (
                    {
                        "key": key,
                        "label": period_label(granularity, period),
                        # Kỳ nằm trong bộ lọc; kỳ còn lại chỉ là nền so sánh.
                        "is_current": self._is_in_focus(granularity, period),
                    },
                    by_key.get(key) or {},
                )
            )

        self._outcome_rows_cache[granularity] = rows
        return rows

    def _is_in_focus(self, granularity, period):
        """Kỳ này có nằm trong khoảng người dùng đang lọc không."""
        focus_start, focus_end = self.focus_bounds

        if focus_start is None and focus_end is None:
            return False

        start, end = period_bounds(granularity, period)

        if focus_end is not None and start >= focus_end:
            return False

        if focus_start is not None and end <= focus_start:
            return False

        return True

    def _period_matrix(
        self,
        granularity,
        queryset,
        dimension,
        *,
        label_of,
        fallback,
        value_field="total",
        limit=6,
    ):
        """
        Khung chung cho nhóm biểu đồ "top N nhóm qua từng kỳ".

        Ba biểu đồ (chủ đề, chủ đề chuyển CCC, lý do, kênh) chỉ khác nhau ở cột
        gom nhóm và cách đặt tên nhóm, nên dùng chung một hàm thay vì chép lại
        vòng dựng ma trận ở mỗi chỗ.

        Cộng dồn khi nhiều giá trị thô rơi vào cùng một nhãn — NULL và "" đều
        ra "Chưa phân loại", "zalo" và "Zalo" đều ra "ZALO". Bản cũ gán đè nên
        chỉ giữ lại dòng cuối và làm mất phiên của các dòng trước.
        """
        granularity = normalize_granularity(granularity)

        rows = (
            queryset.filter(started_at__isnull=False)
            .annotate(period=period_trunc(granularity))
            .values("period", dimension)
            .annotate(
                total=Count("id"),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
            .order_by("period")
        )

        period_labels = {}
        group_totals = {}
        matrix = {}

        for row in rows:
            if not row["period"]:
                continue

            key = period_key(granularity, row["period"])
            period_labels[key] = period_label(granularity, row["period"])

            name = label_of(row[dimension])
            group_totals[name] = group_totals.get(name, 0) + (row["total"] or 0)
            matrix[(key, name)] = matrix.get((key, name), 0) + (row[value_field] or 0)

        top_groups = [
            name
            for name, _total in sorted(
                group_totals.items(), key=lambda item: item[1], reverse=True
            )
        ][:limit] or list(fallback)

        keys = sorted(period_labels)

        return {
            "month_labels": [period_labels[key] for key in keys],
            "top_categories": top_groups,
            "data_by_category": [
                {
                    "label": name,
                    "category": name,
                    **{
                        period_labels[key]: matrix.get((key, name), 0)
                        for key in keys
                    },
                }
                for name in top_groups
            ],
        }

    # ------------------------------------------------------------------
    # Section: summary
    # ------------------------------------------------------------------
    def build_summary_section(self, granularity="month"):
        data = self.summaries.aggregate(
            total_messages=Sum("msg_count_total"),
            total_sessions=Count("id"),
            **{
                f"{field}_messages": Sum(f"msg_count_{field}")
                for _code, field, _label in OUTCOME_SERIES
            },
            **{
                f"{field}_sessions": Count("id", filter=Q(outcome_type=code))
                for code, field, _label in OUTCOME_SERIES
            },
        )

        total_messages = data["total_messages"] or 0
        total_sessions = data["total_sessions"] or 0

        buckets = {}

        for code, field, label in OUTCOME_SERIES:
            session_count = data[f"{field}_sessions"] or 0
            buckets[field] = {
                "code": code,
                "label": label,
                "value": data[f"{field}_messages"] or 0,
                "session_count": session_count,
                "rate": self.rate(session_count, total_sessions),
            }

        return {
            "summary": {
                "total_received": {
                    "code": "ALL",
                    "label": "Tổng tiếp nhận",
                    "value": total_messages,
                    "session_count": total_sessions,
                    "rate": 100.0 if total_messages else 0.0,
                },
                **buckets,
            },
            "charts": {
                "outcome_by_period": self.build_outcome_by_period(granularity),
            },
        }

    def build_outcome_by_period(self, granularity="month"):
        """
        Kết quả xử lý phiên chia theo kỳ.

        Thay cho biểu đồ tròn: tròn chỉ nói được tỷ trọng của cả kỳ gộp, không
        cho thấy nhóm nào đang tăng hay giảm qua từng tháng/quý/năm.
        """
        return {
            "series": [label for _code, _field, label in OUTCOME_SERIES],
            "data": [
                {
                    **base,
                    **{
                        label: row.get(field) or 0
                        for _code, field, label in OUTCOME_SERIES
                    },
                }
                for base, row in self._outcome_rows(granularity)
            ],
        }

    # ------------------------------------------------------------------
    # Section: topics
    # ------------------------------------------------------------------
    def build_multi_month_all_topics(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self.summaries,
            "dashboard_category",
            label_of=category_label,
            fallback=(UNCATEGORIZED_LABEL,),
        )

    def build_multi_month_ccc_topics(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self.summaries,
            "dashboard_category",
            label_of=category_label,
            fallback=(UNCATEGORIZED_LABEL,),
            value_field="ccc",
        )

    def build_topics_section(self, granularity="month"):
        totals = {}

        for row in self.summaries.values("dashboard_category").annotate(
            topic_total=Count("id", filter=Q(outcome_type__in=TOPIC_OUTCOMES)),
        ):
            name = category_label(row["dashboard_category"])
            totals[name] = totals.get(name, 0) + (row["topic_total"] or 0)

        topic_bar = [
            {"name": name, "value": value}
            for name, value in sorted(
                totals.items(), key=lambda item: item[1], reverse=True
            )
            if value
        ]

        return {
            "charts": {
                "topic_bar": topic_bar,
                "ccc_multi_month_topics": self.build_multi_month_ccc_topics(
                    granularity
                ),
                "all_topic_multi_month": self.build_multi_month_all_topics(
                    granularity
                ),
            }
        }

    # ------------------------------------------------------------------
    # Section: traffic
    # ------------------------------------------------------------------
    def _time_series_rows(self, granularity):
        """
        Chuỗi thời gian chính của dashboard.

        Nhánh ``month`` trước đây bỏ qua ``self.summaries`` và tự dựng lại
        queryset với cửa sổ cứng 5 tháng gần nhất, khiến mọi bộ lọc bị vô hiệu
        ở mốc tháng. Giờ chạy trên cùng khung với biểu đồ so sánh.
        """
        rows = []

        for base, row in self._outcome_rows(granularity):
            total = row.get("total") or 0
            rows.append(
                {
                    "date": base["key"],
                    "label": base["label"],
                    "is_current": base["is_current"],
                    "total": total,
                    **_outcome_values(row),
                    "bot_done_rate": self.rate(
                        row.get("bot_done") or 0, total, digits=1
                    ),
                }
            )

        return rows

    def build_traffic_section(self, granularity="day"):
        channels = {}

        for row in self.summaries.values("channel").annotate(value=Count("id")):
            name = channel_label(row["channel"])
            channels[name] = channels.get(name, 0) + (row["value"] or 0)

        return {
            "charts": {
                "channel_distribution": [
                    {"name": name, "value": value}
                    for name, value in sorted(
                        channels.items(), key=lambda item: item[1], reverse=True
                    )
                ],
                "time_series_outcomes": self._time_series_rows(granularity),
            }
        }

    # ------------------------------------------------------------------
    # Section: operations
    # ------------------------------------------------------------------
    def _category_ccc_rate(self):
        merged = {}

        for row in self.summaries.values("dashboard_category").annotate(
            total=Count("id"),
            ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
        ):
            name = category_label(row["dashboard_category"])
            item = merged.setdefault(name, {"name": name, "total": 0, "ccc": 0})
            item["total"] += row["total"] or 0
            item["ccc"] += row["ccc"] or 0

        return sorted(
            (
                {**item, "rate": self.rate(item["ccc"], item["total"], digits=1)}
                for item in merged.values()
                if item["total"]
            ),
            key=lambda item: item["rate"],
            reverse=True,
        )

    def _chat_funnel(self):
        agg = self.summaries.aggregate(
            s1=Count("id"),
            s2=Count("id", filter=Q(outcome_type__in=[OUTCOME_CCC, OUTCOME_PENDING])),
            s3=Count("id", filter=Q(has_cskh_state=True)),
            s4=Count("id", filter=Q(has_cskh_request=True)),
            s5=Count("id", filter=Q(ticket__isnull=False)),
            s6=Count(
                "id",
                filter=Q(
                    ticket__current_status__status_code__in=[
                        TicketStatusCode.DONE_WAIT_CLOSE,
                        TicketStatusCode.CLOSED,
                    ]
                ),
            ),
        )

        names = (
            "1. Tổng Session",
            "2. BOT không xử lý được",
            "3. Hỏi xin thông tin KH",
            "4. KH đã cung cấp thông tin",
            "5. Tạo Ticket thành công",
            "6. CCC đã xử lý xong",
        )

        return [
            {"step": step, "name": name, "count": agg[f"s{step}"] or 0}
            for step, name in enumerate(names, start=1)
        ]

    # Không có tzinfo thì ExtractHour tách giờ theo settings.TIME_ZONE (UTC),
    # làm biểu đồ khung giờ lệch 7 tiếng so với giờ Việt Nam.
    _LOCAL_HOUR = ExtractHour("started_at", tzinfo=DASHBOARD_TIMEZONE)

    def _hourly_peak(self):
        rows = (
            self.summaries.filter(started_at__isnull=False)
            .annotate(hour=self._LOCAL_HOUR)
            .values("hour")
            .annotate(count=Count("id"))
        )
        hour_map = {row["hour"]: row["count"] for row in rows if row["hour"] is not None}

        return [
            {"hour": hour, "label": f"{hour:02d}:00", "count": hour_map.get(hour, 0)}
            for hour in range(24)
        ]

    def build_hourly_peak_by_period(self, granularity="month"):
        """
        Khung giờ trong ngày, tách thành một đường cho mỗi kỳ.

        Biểu đồ cột gộp cả kỳ chỉ nói được giờ cao điểm chung; tách theo kỳ mới
        thấy giờ cao điểm dịch chuyển ra sao giữa các tháng/quý/năm.

        Trục hoành luôn đủ 24 giờ kể cả giờ không có phiên nào — khung giờ là
        trục cố định, thiếu điểm thì đường bị nối tắt qua và đọc sai cao điểm.
        """
        granularity = normalize_granularity(granularity)

        rows = (
            self.summaries.filter(started_at__isnull=False)
            .annotate(period=period_trunc(granularity), hour=self._LOCAL_HOUR)
            .values("period", "hour")
            .annotate(count=Count("id"))
            .order_by("period")
        )

        period_labels = {}
        matrix = {}

        for row in rows:
            if not row["period"] or row["hour"] is None:
                continue

            key = period_key(granularity, row["period"])
            period_labels[key] = period_label(granularity, row["period"])
            matrix[(row["hour"], key)] = (
                matrix.get((row["hour"], key), 0) + (row["count"] or 0)
            )

        keys = sorted(period_labels)

        return {
            "period_labels": [period_labels[key] for key in keys],
            "data": [
                {
                    "hour": hour,
                    "label": f"{hour:02d}:00",
                    **{
                        period_labels[key]: matrix.get((hour, key), 0)
                        for key in keys
                    },
                }
                for hour in range(24)
            ],
        }

    def _top_reasons(self, limit=6):
        rows = (
            self._with_reason()
            .values("reason")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

        return [{"name": row["reason"], "value": row["count"]} for row in rows]

    def _with_reason(self):
        """Phiên có ghi lý do chuyển CCC."""
        return self.summaries.exclude(reason__isnull=True).exclude(reason__exact="")

    def build_multi_period_reasons(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self._with_reason(),
            "reason",
            label_of=lambda value: value,
            fallback=("Chưa có dữ liệu",),
        )

    def _channel_performance(self):
        merged = {}

        for row in self.summaries.values("channel").annotate(
            total=Count("id"),
            bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
            ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
        ):
            name = channel_label(row["channel"])
            item = merged.setdefault(
                name, {"name": name, "total": 0, "bot_done": 0, "ccc": 0}
            )

            for field in ("total", "bot_done", "ccc"):
                item[field] += row[field] or 0

        return [
            {
                **item,
                "bot_done_rate": self.rate(item["bot_done"], item["total"], digits=1),
                "ccc_rate": self.rate(item["ccc"], item["total"], digits=1),
            }
            for item in sorted(
                merged.values(), key=lambda item: item["total"], reverse=True
            )
        ]

    def build_multi_period_channels(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self.summaries,
            "channel",
            label_of=channel_label,
            fallback=("WEB PORTAL", "MOBILE APP", "ZALO OA", "FACEBOOK"),
        )

    def build_operations_section(self, granularity="month"):
        status_distribution = [
            {
                "name": row["ticket__current_status__status_name"] or "Chưa phân loại",
                "value": row["value"],
            }
            for row in self.summaries.filter(
                outcome_type=OUTCOME_CCC, ticket__isnull=False
            )
            .values("ticket__current_status__status_name")
            .annotate(value=Count("id"))
        ]

        return {
            "charts": {
                "ticket_status_distribution": status_distribution,
                "category_ccc_rate": self._category_ccc_rate(),
                "chat_funnel": self._chat_funnel(),
                "hourly_peak": self._hourly_peak(),
                "hourly_peak_multi_period": self.build_hourly_peak_by_period(
                    granularity
                ),
                "top_reasons": self._top_reasons(),
                "top_reasons_multi_period": self.build_multi_period_reasons(granularity),
                "channel_performance": self._channel_performance(),
                "channel_performance_multi_period": self.build_multi_period_channels(
                    granularity
                ),
            }
        }

    # ------------------------------------------------------------------
    # Section: comparison
    # ------------------------------------------------------------------
    def build_comparison_section(self, granularity="month"):
        """
        Biểu đồ so sánh kỳ: các kỳ ngang hàng đặt cạnh nhau kèm % tăng giảm.

        Mốc so sánh đúng bằng mốc đang chọn — bấm Tháng thì so tháng với tháng,
        bấm Quý thì so quý với quý, bấm Năm thì so năm với năm. Dùng chung
        ``_outcome_rows`` với biểu đồ chuỗi thời gian nên hai biểu đồ luôn nói
        về cùng một tập kỳ, chỉ khác cách trình bày.
        """
        granularity = normalize_granularity(granularity)

        items = []
        previous = None

        for base, row in self._outcome_rows(granularity):
            total = row.get("total") or 0
            prev_total = previous["total"] if previous else None

            items.append(
                {
                    **base,
                    "total": total,
                    **_outcome_values(row),
                    "ccc_rate": self.rate(row.get("ccc") or 0, total, digits=1),
                    "prev_label": previous["label"] if previous else None,
                    "prev_total": prev_total,
                    # Kỳ đầu tiên không có gì để so nên để None, không phải 0:
                    # frontend cần phân biệt "không so được" với "không đổi".
                    "delta": None if prev_total is None else total - prev_total,
                    "growth_percent": (
                        self.rate(total - prev_total, prev_total, digits=1)
                        if prev_total
                        else None
                    ),
                }
            )
            previous = {"label": base["label"], "total": total}

        return {
            "charts": {
                "period_comparison": {
                    "granularity": granularity,
                    "granularity_label": GRANULARITY_LABELS[granularity],
                    "items": items,
                }
            }
        }

    # ------------------------------------------------------------------
    # Section: quick_lists
    # ------------------------------------------------------------------
    def _top_faqs(self, limit=5):
        return list(
            self.logs.exclude(questionType__in=SPAM_QUESTION_TYPES)
            .exclude(category__isnull=True)
            .exclude(category__exact="")
            .values("category")
            .annotate(
                hit_count=Count("id"),
                session_count=Count("session_id", distinct=True),
                latest_at=Max("external_created_at"),
            )
            .order_by("-hit_count", "-latest_at")[:limit]
        )

    # Bảng "Vấn đề cần CCC xử lý" cuộn và phân trang ngay tại chỗ nên cần sẵn
    # một lô, không phải đúng 5 dòng. Vẫn có trần để payload overview không
    # phình theo hàng chờ; tổng thật luôn nằm ở pending_ticket_total.
    PENDING_TICKET_LIMIT = 50

    def build_quick_lists_section(self):
        pending_queryset = self.summaries.filter(
            outcome_type=OUTCOME_CCC,
            ticket__current_status__status_code=TicketStatusCode.CREATED,
            ticket__owner_user__isnull=True,
        )
        latest = (
            pending_queryset.select_related("ticket", "ticket__current_status")
            .only(
                "id",
                "session_id",
                "dashboard_category",
                "reason",
                "last_question",
                "started_at",
                "ticket_id",
                "ticket__ticket_code",
                "ticket__account_link_status",
                "ticket__current_status__status_name",
            )
            .order_by("-started_at", "-id")[: self.PENDING_TICKET_LIMIT]
        )

        return {
            "quick_lists": {
                "latest_ccc_tickets": ChatbotSessionQuickSerializer(
                    latest, many=True
                ).data,
                "pending_ticket_total": pending_queryset.count(),
                "top_faqs": self._top_faqs(),
            }
        }
