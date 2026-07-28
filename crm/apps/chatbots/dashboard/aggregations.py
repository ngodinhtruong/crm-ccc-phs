"""Các truy vấn aggregate nhỏ, độc lập theo section của dashboard chatbot."""

from django.db.models import (
    Count,
    Max,
    Q,
    Sum,
)
from django.db.models.functions import ExtractHour

from apps.chatbots.constants import SPAM_QUESTION_TYPES, UNCATEGORIZED_LABEL
from apps.chatbots.dashboard.periods import (
    GRANULARITY_LABELS,
    comparison_bounds,
    comparison_granularity,
    iter_periods,
    normalize_granularity,
    period_bounds,
    period_key,
    period_label,
    period_trunc,
)
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.serializers import ChatbotSessionQuickSerializer
from apps.common.constants import TicketStatusCode

OUTCOME_BOT_DONE = ChatbotSessionSummary.OUTCOME_BOT_DONE
OUTCOME_CCC = ChatbotSessionSummary.OUTCOME_CCC
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING
TOPIC_OUTCOMES = (OUTCOME_BOT_DONE, OUTCOME_CCC)


class ChatbotDashboardAggregator:
    def __init__(
        self,
        summaries,
        logs,
        comparison_summaries=None,
        series_summaries=None,
        focus_bounds=(None, None),
    ):
        self.summaries = summaries
        self.logs = logs

        # Ba phạm vi khác nhau, cố ý:
        #   summaries            - đúng bộ lọc (KPI, donut, phễu, khung giờ...)
        #   series_summaries     - nới ra kỳ cha KHI bộ lọc chỉ gói một kỳ
        #   comparison_summaries - luôn nới ra kỳ cha để có kỳ ngang hàng
        # Không truyền thì tất cả rơi về đúng bộ lọc.
        self.comparison_summaries = (
            summaries if comparison_summaries is None else comparison_summaries
        )
        self.series_summaries = (
            summaries if series_summaries is None else series_summaries
        )
        self.focus_bounds = focus_bounds

    @staticmethod
    def rate(value, total, digits=2):
        return round(value / total * 100, digits) if total else 0.0

    def build_summary_section(self):
        data = self.summaries.aggregate(
            total_messages=Sum("msg_count_total"),
            total_sessions=Count("id"),
            bot_done_messages=Sum("msg_count_bot_done"),
            bot_done_sessions=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
            ccc_messages=Sum("msg_count_ccc"),
            ccc_sessions=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            pending_messages=Sum("msg_count_pending"),
            pending_sessions=Count("id", filter=Q(outcome_type=OUTCOME_PENDING)),
            spam_messages=Sum("msg_count_spam"),
            spam_sessions=Count("id", filter=Q(outcome_type=OUTCOME_SPAM)),
        )
        total_messages = data["total_messages"] or 0
        total_sessions = data["total_sessions"] or 0

        def bucket(code, label, message_key, session_key):
            value = data[message_key] or 0
            session_cnt = data[session_key] or 0
            return {
                "code": code,
                "label": label,
                "value": value,
                "session_count": session_cnt,
                "rate": self.rate(session_cnt, total_sessions),
            }

        bot_done = bucket(
            OUTCOME_BOT_DONE,
            "Chatbot tự xử lý",
            "bot_done_messages",
            "bot_done_sessions",
        )
        ccc = bucket(
            OUTCOME_CCC,
            "Chuyển CCC xử lý",
            "ccc_messages",
            "ccc_sessions",
        )
        pending = bucket(
            OUTCOME_PENDING,
            "Chờ thông tin khách hàng",
            "pending_messages",
            "pending_sessions",
        )
        spam = bucket(
            OUTCOME_SPAM,
            "Câu hỏi rác",
            "spam_messages",
            "spam_sessions",
        )

        total_received = {
            "code": "ALL",
            "label": "Tổng tiếp nhận",
            "value": total_messages,
            "session_count": total_sessions,
            "rate": 100.0 if total_messages else 0.0,
        }
        process_classification = [
            {"name": item["label"], **item}
            for item in (bot_done, ccc, pending, spam)
        ]

        return {
            "summary": {
                "total_received": total_received,
                "bot_done": bot_done,
                "ccc": ccc,
                "spam": spam,
                "pending": pending,
            },
            "charts": {"process_classification": process_classification},
        }

    def _build_time_series_by_category(
        self, summaries_qs, mode="total", granularity="month"
    ):
        granularity = normalize_granularity(granularity)
        trunc_fn = period_trunc(granularity)

        rows = list(
            summaries_qs.filter(started_at__isnull=False)
            .annotate(period=trunc_fn)
            .values("period", "dashboard_category")
            .annotate(
                cnt=Count("id"),
                ccc_cnt=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
            .order_by("period")
        )

        def label(cat):
            return cat or UNCATEGORIZED_LABEL

        period_map = {}
        cat_totals = {}
        matrix = {}

        for r in rows:
            p = r["period"]
            if not p:
                continue

            p_key = period_key(granularity, p)
            p_label = period_label(granularity, p)

            period_map[p_key] = p_label
            cat_name = label(r["dashboard_category"])
            cnt = r["cnt"] or 0
            ccc_cnt = r["ccc_cnt"] or 0

            cat_totals[cat_name] = cat_totals.get(cat_name, 0) + cnt

            if mode == "ccc":
                val = ccc_cnt
            elif mode == "ccc_rate":
                val = self.rate(ccc_cnt, cnt, digits=1)
            else:
                val = cnt

            matrix[(p_key, cat_name)] = val

        sorted_cats = [
            cat for cat, _ in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
        ][:6]

        if not sorted_cats:
            sorted_cats = [UNCATEGORIZED_LABEL]

        periods_sorted = sorted(period_map.keys())
        month_labels = [period_map[k] for k in periods_sorted]

        data_by_category = []
        for cat in sorted_cats:
            item = {"label": cat, "category": cat}
            for k in periods_sorted:
                p_label = period_map[k]
                item[p_label] = matrix.get((k, cat), 0 if mode != "ccc_rate" else 0.0)
            data_by_category.append(item)

        data_by_month = []
        for k in periods_sorted:
            p_label = period_map[k]
            item = {"label": p_label, "key": k}
            for cat in sorted_cats:
                item[cat] = matrix.get((k, cat), 0 if mode != "ccc_rate" else 0.0)
            data_by_month.append(item)

        return {
            "month_labels": month_labels,
            "top_categories": sorted_cats,
            "data_by_month": data_by_month,
            "data_by_category": data_by_category,
        }

    def build_multi_month_ccc_topics(self, granularity="month"):
        return self._build_time_series_by_category(
            self.summaries, mode="ccc", granularity=granularity
        )

    def build_multi_month_all_topics(self, granularity="month"):
        return self._build_time_series_by_category(
            self.summaries, mode="total", granularity=granularity
        )

    def build_multi_month_ccc_rate(self, granularity="month"):
        return self._build_time_series_by_category(
            self.summaries, mode="ccc_rate", granularity=granularity
        )

    def build_topic_outcomes(self, granularity="month"):
        """
        Chủ đề x nhóm xử lý theo từng kỳ.

        Trước đây hàm này bỏ qua ``self.summaries`` và tự truy vấn lại toàn
        bảng với cửa sổ cứng "5 tháng gần nhất tính từ now()", nên người dùng
        lọc kỳ nào cũng thấy đúng 5 tháng đó. Giờ dùng chung queryset đã lọc
        và lấy danh sách kỳ từ chính dữ liệu.
        """
        granularity = normalize_granularity(granularity)
        trunc_fn = period_trunc(granularity)

        rows = list(
            self.summaries.filter(
                started_at__isnull=False,
                outcome_type__in=TOPIC_OUTCOMES,
            )
            .annotate(period=trunc_fn)
            .values("period", "dashboard_category", "outcome_type")
            .annotate(cnt=Count("id"))
            .order_by("period")
        )

        def label(cat):
            return cat or UNCATEGORIZED_LABEL

        period_map = {}
        cat_totals = {}
        period_outcome_map = {}

        for r in rows:
            p = r["period"]
            if not p:
                continue

            p_key = period_key(granularity, p)
            period_map[p_key] = period_label(granularity, p)

            cat_name = label(r["dashboard_category"])
            cnt = r["cnt"] or 0

            cat_totals[cat_name] = cat_totals.get(cat_name, 0) + cnt
            period_outcome_map[(p_key, cat_name, r["outcome_type"])] = cnt

        sorted_cats = [
            cat for cat, _ in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
        ][:5]

        if not sorted_cats:
            sorted_cats = [UNCATEGORIZED_LABEL]

        periods_sorted = sorted(period_map.keys())

        data = []
        for p_key in periods_sorted:
            item = {"label": period_map[p_key], "key": p_key}
            for cat in sorted_cats:
                item[f"{cat} - Bot"] = period_outcome_map.get(
                    (p_key, cat, OUTCOME_BOT_DONE), 0
                )
                item[f"{cat} - CCC"] = period_outcome_map.get(
                    (p_key, cat, OUTCOME_CCC), 0
                )
            data.append(item)

        return {
            "month_labels": [period_map[k] for k in periods_sorted],
            "top_categories": sorted_cats,
            "data": data,
        }

    def build_topics_section(self, granularity="month"):
        rows = list(
            self.summaries.values("dashboard_category").annotate(
                all_total=Count("id"),
                topic_total=Count("id", filter=Q(outcome_type__in=TOPIC_OUTCOMES)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
            )
        )

        def label(row):
            return row["dashboard_category"] or UNCATEGORIZED_LABEL

        topic_bar = [
            {"name": label(row), "value": row["topic_total"]}
            for row in sorted(rows, key=lambda item: item["topic_total"], reverse=True)
            if row["topic_total"]
        ]

        ccc_multi_month_topics = self.build_multi_month_ccc_topics(granularity=granularity)
        topic_stacked_outcomes = self.build_topic_outcomes(granularity=granularity)
        all_topic_multi_month = self.build_multi_month_all_topics(granularity=granularity)
        category_ccc_rate_multi_month = self.build_multi_month_ccc_rate(granularity=granularity)

        return {
            "charts": {
                "topic_bar": topic_bar,
                "ccc_multi_month_topics": ccc_multi_month_topics,
                "topic_stacked_outcomes": topic_stacked_outcomes,
                "all_topic_multi_month": all_topic_multi_month,
                "category_ccc_rate_multi_month": category_ccc_rate_multi_month,
            }
        }

    @staticmethod
    def _period_rows(summaries, granularity):
        """Đếm phiên theo kỳ trên đúng queryset đã lọc."""
        granularity = normalize_granularity(granularity)

        rows = (
            summaries.filter(started_at__isnull=False)
            .annotate(period=period_trunc(granularity))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        return [
            {
                "key": period_key(granularity, row["period"]),
                "label": period_label(granularity, row["period"]),
                "count": row["count"],
            }
            for row in rows
            if row["period"]
        ]

    @classmethod
    def _monthly_rows(cls, summaries):
        return [
            {
                "month": row["key"],
                "month_key": row["key"],
                "month_label": row["label"],
                "count": row["count"],
            }
            for row in cls._period_rows(summaries, "month")
        ]

    @classmethod
    def _daily_rows(cls, summaries):
        return cls._period_rows(summaries, "day")

    def _time_series_rows(self, granularity):
        """
        Chuỗi thời gian chính của dashboard.

        Nhánh ``month`` trước đây bỏ qua ``self.summaries`` và tự dựng lại
        queryset với cửa sổ cứng 5 tháng gần nhất, khiến mọi bộ lọc bị vô
        hiệu ở mốc tháng. Giờ chạy trên ``series_summaries`` — bằng đúng bộ
        lọc, chỉ nới ra kỳ cha khi bộ lọc gói gọn trong một kỳ.
        """
        granularity = normalize_granularity(granularity)
        trunc_fn = period_trunc(granularity)

        rows = (
            self.series_summaries.filter(started_at__isnull=False)
            .annotate(period=trunc_fn)
            .values("period")
            .annotate(
                total=Count("id"),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
                pending=Count("id", filter=Q(outcome_type=OUTCOME_PENDING)),
                spam=Count("id", filter=Q(outcome_type=OUTCOME_SPAM)),
            )
            .order_by("period")
        )
        result = []

        for row in rows:
            period = row["period"]
            if not period:
                continue

            result.append(
                {
                    "date": period_key(granularity, period),
                    "label": period_label(granularity, period),
                    # Kỳ nằm trong bộ lọc; các kỳ còn lại chỉ là nền so sánh.
                    "is_current": self._is_in_focus(granularity, period),
                    "total": row["total"],
                    "bot_done": row["bot_done"],
                    "ccc": row["ccc"],
                    "pending": row["pending"],
                    "spam": row["spam"],
                    "bot_done_rate": self.rate(
                        row["bot_done"], row["total"], digits=1
                    ),
                }
            )

        return granularity, result

    def build_traffic_section(self, granularity="day"):
        granularity, time_series = self._time_series_rows(granularity)

        if granularity == "day":
            daily = [
                {"key": row["date"], "label": row["label"], "count": row["total"]}
                for row in time_series
            ]
            monthly = self._monthly_rows(self.summaries)
        elif granularity == "month":
            monthly = [
                {
                    "month": row["date"],
                    "month_key": row["date"],
                    "month_label": row["label"],
                    "count": row["total"],
                }
                for row in time_series
            ]
            daily = self._daily_rows(self.summaries)
        else:
            monthly = self._monthly_rows(self.summaries)
            daily = self._daily_rows(self.summaries)

        channel_rows = (
            self.summaries.values("channel")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        channel_distribution = [
            {
                "name": row["channel"].upper() if row["channel"] else "Khác",
                "value": row["value"],
            }
            for row in channel_rows
        ]

        return {
            "charts": {
                "monthly_chatbot_tickets": monthly,
                "daily_chatbot_tickets": daily,
                "channel_distribution": channel_distribution,
                "time_series_outcomes": time_series,
            }
        }

    def _customer_linkage(self):
        values = self.summaries.aggregate(
            total=Count("id"),
            linked=Count(
                "id",
                filter=(
                    Q(ticket__account_link_status="LINKED")
                    | Q(contact_info__isnull=False, contact_info__gt="")
                ),
                distinct=True,
            ),
        )
        total = values["total"] or 0
        linked = min(total, values["linked"] or 0)
        unlinked = max(0, total - linked)
        return {
            "total": total,
            "linked": linked,
            "unlinked": unlinked,
            "linked_rate": self.rate(linked, total, digits=1),
            "items": [
                {"name": "Đã định danh KH", "value": linked, "color": "#0ea5e9"},
                {"name": "Chưa khớp thông tin", "value": unlinked, "color": "#94a3b8"},
            ],
        }

    def _category_ccc_rate(self):
        rows = list(
            self.summaries.values("dashboard_category").annotate(
                total=Count("id"),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
        )
        res = []
        for r in rows:
            cat = r["dashboard_category"] or UNCATEGORIZED_LABEL
            tot = r["total"] or 0
            ccc = r["ccc"] or 0
            rate = self.rate(ccc, tot, digits=1)
            if tot > 0:
                res.append({"name": cat, "total": tot, "ccc": ccc, "rate": rate})
        return sorted(res, key=lambda x: x["rate"], reverse=True)

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
        steps = [
            {"step": 1, "name": "1. Tổng Session", "count": agg["s1"] or 0},
            {"step": 2, "name": "2. BOT không xử lý được", "count": agg["s2"] or 0},
            {"step": 3, "name": "3. Hỏi xin thông tin KH", "count": agg["s3"] or 0},
            {"step": 4, "name": "4. KH đã cung cấp thông tin", "count": agg["s4"] or 0},
            {"step": 5, "name": "5. Tạo Ticket thành công", "count": agg["s5"] or 0},
            {"step": 6, "name": "6. CCC đã xử lý xong", "count": agg["s6"] or 0},
        ]
        return steps

    def _hourly_peak(self):
        rows = (
            self.summaries.filter(started_at__isnull=False)
            .annotate(hour=ExtractHour("started_at"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )
        hour_map = {r["hour"]: r["count"] for r in rows if r["hour"] is not None}
        return [
            {"hour": h, "label": f"{h:02d}:00", "count": hour_map.get(h, 0)}
            for h in range(24)
        ]

    def _top_reasons(self):
        rows = (
            self.summaries.exclude(reason__isnull=True)
            .exclude(reason__exact="")
            .values("reason")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )
        return [{"name": r["reason"], "value": r["count"]} for r in rows]

    def _channel_performance(self):
        rows = (
            self.summaries.values("channel")
            .annotate(
                total=Count("id"),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
            .order_by("-total")
        )
        res = []
        for r in rows:
            ch = (r["channel"] or "KHÁC").upper()
            tot = r["total"] or 0
            bot = r["bot_done"] or 0
            ccc = r["ccc"] or 0
            res.append(
                {
                    "name": ch,
                    "total": tot,
                    "bot_done": bot,
                    "ccc": ccc,
                    "bot_done_rate": self.rate(bot, tot, digits=1),
                    "ccc_rate": self.rate(ccc, tot, digits=1),
                }
            )
        return res

    def build_multi_period_reasons(self, granularity="month"):
        granularity = normalize_granularity(granularity)
        trunc_fn = period_trunc(granularity)

        qs = self.summaries.filter(started_at__isnull=False).exclude(reason__isnull=True).exclude(reason__exact="")
        rows = list(
            qs.annotate(period=trunc_fn)
            .values("period", "reason")
            .annotate(cnt=Count("id"))
            .order_by("period")
        )

        period_map = {}
        reason_totals = {}
        matrix = {}

        for r in rows:
            p = r["period"]
            if not p:
                continue
            p_key = period_key(granularity, p)
            p_label = period_label(granularity, p)

            period_map[p_key] = p_label
            r_name = r["reason"]
            cnt = r["cnt"] or 0

            reason_totals[r_name] = reason_totals.get(r_name, 0) + cnt
            matrix[(p_key, r_name)] = cnt

        sorted_reasons = [
            r for r, _ in sorted(reason_totals.items(), key=lambda x: x[1], reverse=True)
        ][:6]

        if not sorted_reasons:
            sorted_reasons = ["Chưa có dữ liệu"]

        periods_sorted = sorted(period_map.keys())
        month_labels = [period_map[k] for k in periods_sorted]

        data_by_category = []
        for r_name in sorted_reasons:
            item = {"label": r_name, "category": r_name}
            for k in periods_sorted:
                p_label = period_map[k]
                item[p_label] = matrix.get((k, r_name), 0)
            data_by_category.append(item)

        return {
            "month_labels": month_labels,
            "top_categories": sorted_reasons,
            "data_by_category": data_by_category,
        }

    def build_multi_period_channels(self, granularity="month"):
        granularity = normalize_granularity(granularity)
        trunc_fn = period_trunc(granularity)

        qs = self.summaries.filter(started_at__isnull=False)
        rows = list(
            qs.annotate(period=trunc_fn)
            .values("period", "channel")
            .annotate(
                total=Count("id"),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
            .order_by("period")
        )

        period_map = {}
        channel_totals = {}
        matrix = {}

        for r in rows:
            p = r["period"]
            if not p:
                continue
            p_key = period_key(granularity, p)
            p_label = period_label(granularity, p)

            period_map[p_key] = p_label
            ch = (r["channel"] or "KHÁC").upper()
            cnt = r["total"] or 0

            channel_totals[ch] = channel_totals.get(ch, 0) + cnt
            matrix[(p_key, ch)] = cnt

        sorted_channels = [
            ch for ch, _ in sorted(channel_totals.items(), key=lambda x: x[1], reverse=True)
        ][:6]

        if not sorted_channels:
            sorted_channels = ["WEB PORTAL", "MOBILE APP", "ZALO OA", "FACEBOOK"]

        periods_sorted = sorted(period_map.keys())
        month_labels = [period_map[k] for k in periods_sorted]

        data_by_category = []
        for ch in sorted_channels:
            item = {"label": ch, "category": ch}
            for k in periods_sorted:
                p_label = period_map[k]
                item[p_label] = matrix.get((k, ch), 0)
            data_by_category.append(item)

        return {
            "month_labels": month_labels,
            "top_categories": sorted_channels,
            "data_by_category": data_by_category,
        }

    def build_operations_section(self, granularity="month"):
        status_counts = self.summaries.filter(
            outcome_type=OUTCOME_CCC, ticket__isnull=False
        ).values("ticket__current_status__status_name").annotate(value=Count("id"))

        status_rows = list(status_counts)
        status_distribution = [
            {
                "name": row["ticket__current_status__status_name"] or "Chưa phân loại",
                "value": row["value"],
            }
            for row in status_rows
        ]
        return {
            "charts": {
                "ticket_status_distribution": status_distribution,
                "customer_linkage": self._customer_linkage(),
                "category_ccc_rate": self._category_ccc_rate(),
                "chat_funnel": self._chat_funnel(),
                "hourly_peak": self._hourly_peak(),
                "top_reasons": self._top_reasons(),
                "top_reasons_multi_period": self.build_multi_period_reasons(granularity),
                "channel_performance": self._channel_performance(),
                "channel_performance_multi_period": self.build_multi_period_channels(granularity),
            }
        }

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

    def build_comparison_section(self, granularity="month"):
        """
        Biểu đồ so sánh kỳ: các kỳ ngang hàng đặt cạnh nhau.

        Mốc do ``comparison_granularity`` quyết định từ chính khoảng đang lọc:
        lọc trùng khít một kỳ lịch thì so theo kỳ đó (trọn năm so các năm,
        trọn quý so các quý, một ngày so các ngày trong tuần), lọc lệch ranh
        giới thì lùi về mốc thô hơn mốc chính một bậc.

        Nguồn dữ liệu là ``comparison_summaries`` — khoảng đã nới ra trọn kỳ
        cha, vì nếu chỉ lấy đúng bộ lọc thì lọc một ngày sẽ ra đúng một cột,
        không so được với gì.
        """
        focus_start, focus_end = self.focus_bounds

        # comparison_bounds() tự quy mốc chính -> mốc so sánh, nên phải giữ
        # nguyên mốc CHÍNH khi gọi nó. Truyền mốc đã quy vào sẽ bị quy lần
        # thứ hai và nới cửa sổ rộng gấp bội (lọc 15 ngày ra 52 cột tuần).
        window_lo, window_hi = comparison_bounds(
            granularity, start=focus_start, end=focus_end
        )
        granularity = comparison_granularity(
            granularity, start=focus_start, end=focus_end
        )

        rows = (
            self.comparison_summaries.filter(started_at__isnull=False)
            .annotate(period=period_trunc(granularity))
            .values("period")
            .annotate(
                total=Count("id"),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
                pending=Count("id", filter=Q(outcome_type=OUTCOME_PENDING)),
                spam=Count("id", filter=Q(outcome_type=OUTCOME_SPAM)),
            )
            .order_by("period")
        )

        by_key = {
            period_key(granularity, row["period"]): row
            for row in rows
            if row["period"]
        }

        # Trục phải đủ kỳ kể cả kỳ không có phiên nào: tuần luôn 7 ngày, năm
        # luôn 4 quý. Thiếu cột 0 thì người đọc tưởng tuần chỉ có 5 ngày.
        items = []
        previous = None

        for period in iter_periods(granularity, window_lo, window_hi):
            row = by_key.get(period_key(granularity, period)) or {}

            total = row.get("total") or 0
            prev_total = previous["total"] if previous else None

            item = {
                "key": period_key(granularity, period),
                "label": period_label(granularity, period),
                # Cột ứng với khoảng đang lọc, để frontend tô nổi bật.
                "is_current": self._is_in_focus(granularity, period),
                "total": total,
                "bot_done": row.get("bot_done") or 0,
                "ccc": row.get("ccc") or 0,
                "pending": row.get("pending") or 0,
                "spam": row.get("spam") or 0,
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

            items.append(item)
            previous = {"label": item["label"], "total": total}

        return {
            "charts": {
                "period_comparison": {
                    "granularity": granularity,
                    "granularity_label": GRANULARITY_LABELS[granularity],
                    "items": items,
                }
            }
        }

    def build_sla_section(self):
        return {
            "charts": {}
        }

    def _top_faqs(self, limit=5):
        rows = (
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
        return list(rows)

    def build_quick_lists_section(self):
        pending_queryset = self.summaries.filter(
            outcome_type=OUTCOME_CCC,
            ticket__current_status__status_code=TicketStatusCode.CREATED,
            ticket__owner_user__isnull=True,
        )
        pending_total = pending_queryset.count()
        latest = pending_queryset.select_related(
            "ticket",
            "ticket__current_status",
        ).only(
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
        ).order_by("-started_at", "-id")[:5]
        return {
            "quick_lists": {
                "latest_ccc_tickets": ChatbotSessionQuickSerializer(
                    latest, many=True
                ).data,
                "pending_ticket_total": pending_total,
                "top_faqs": self._top_faqs(limit=5),
            }
        }
