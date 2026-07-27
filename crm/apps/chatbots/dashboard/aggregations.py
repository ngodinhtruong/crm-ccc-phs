"""Các truy vấn aggregate nhỏ, độc lập theo section của dashboard chatbot."""

from datetime import datetime, timedelta

from django.db.models import (
    Count,
    Max,
    Q,
    Sum,
)
from django.db.models.functions import ExtractHour, TruncDate, TruncMonth, TruncWeek
from django.utils import timezone

from apps.chatbots.constants import SPAM_QUESTION_TYPES, UNCATEGORIZED_LABEL
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.serializers import ChatbotSessionQuickSerializer
from apps.common.constants import TicketStatusCode

OUTCOME_BOT_DONE = ChatbotSessionSummary.OUTCOME_BOT_DONE
OUTCOME_CCC = ChatbotSessionSummary.OUTCOME_CCC
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING
TOPIC_OUTCOMES = (OUTCOME_BOT_DONE, OUTCOME_CCC)


class ChatbotDashboardAggregator:
    def __init__(self, summaries, logs, prev_summaries=None):
        self.summaries = summaries
        self.logs = logs
        self.prev_summaries = prev_summaries

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
        if granularity == "day":
            trunc_fn = TruncDate("started_at")
        elif granularity == "week":
            trunc_fn = TruncWeek("started_at")
        else:
            granularity = "month"
            trunc_fn = TruncMonth("started_at")

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
            if granularity == "month":
                p_key = p.strftime("%Y-%m")
                p_label = f"T{p.strftime('%m/%Y')}"
            elif granularity == "week":
                p_key = p.strftime("%Y-W%W")
                p_label = f"Tuần {p.strftime('%W')} ({p.strftime('%d/%m')})"
            else:
                p_key = p.strftime("%Y-%m-%d")
                p_label = p.strftime("%d/%m")

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

    def build_multi_month_topic_outcomes(self, num_months=5):
        now = timezone.now()
        year = now.year
        month = now.month

        start_year = year
        start_month = month - (num_months - 1)
        while start_month <= 0:
            start_month += 12
            start_year -= 1

        start_dt = datetime(start_year, start_month, 1)
        if timezone.is_aware(now):
            start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())

        qs = ChatbotSessionSummary.objects.filter(
            started_at__gte=start_dt,
            outcome_type__in=[OUTCOME_BOT_DONE, OUTCOME_CCC],
        )

        rows = list(
            qs.annotate(month=TruncMonth("started_at"))
            .values("month", "dashboard_category", "outcome_type")
            .annotate(cnt=Count("id"))
            .order_by("month")
        )

        def label(cat):
            return cat or UNCATEGORIZED_LABEL

        months_list = []
        cur_y, cur_m = start_year, start_month
        for _ in range(num_months):
            m_dt = datetime(cur_y, cur_m, 1)
            months_list.append({
                "key": m_dt.strftime("%Y-%m"),
                "label": f"T{m_dt.strftime('%m/%Y')}",
            })
            cur_m += 1
            if cur_m > 12:
                cur_m = 1
                cur_y += 1

        cat_totals = {}
        month_outcome_map = {}
        for r in rows:
            if not r["month"]:
                continue
            m_key = r["month"].strftime("%Y-%m")
            cat_name = label(r["dashboard_category"])
            outcome = r["outcome_type"]
            cnt = r["cnt"]
            cat_totals[cat_name] = cat_totals.get(cat_name, 0) + cnt
            month_outcome_map[(m_key, cat_name, outcome)] = cnt

        sorted_cats = [
            cat for cat, _ in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
        ][:5]

        if not sorted_cats:
            sorted_cats = [UNCATEGORIZED_LABEL]

        data = []
        for m_info in months_list:
            m_key = m_info["key"]
            item = {"label": m_info["label"], "key": m_key}
            for cat in sorted_cats:
                bot_val = month_outcome_map.get((m_key, cat, OUTCOME_BOT_DONE), 0)
                ccc_val = month_outcome_map.get((m_key, cat, OUTCOME_CCC), 0)
                item[f"{cat} - Bot"] = bot_val
                item[f"{cat} - CCC"] = ccc_val
            data.append(item)

        month_labels = [m["label"] for m in months_list]

        return {
            "month_labels": month_labels,
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
        topic_stacked_outcomes = self.build_multi_month_topic_outcomes(num_months=5)
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
    def _monthly_rows(summaries):
        rows = (
            summaries.filter(started_at__isnull=False)
            .annotate(month=TruncMonth("started_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        return [
            {
                "month": row["month"].strftime("%Y-%m"),
                "month_key": row["month"].strftime("%Y-%m"),
                "month_label": f"Tháng {row['month'].strftime('%m/%Y')}",
                "count": row["count"],
            }
            for row in rows
            if row["month"]
        ]

    @staticmethod
    def _daily_rows(summaries):
        rows = (
            summaries.filter(started_at__isnull=False)
            .annotate(date=TruncDate("started_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return [
            {
                "key": row["date"].strftime("%Y-%m-%d"),
                "label": row["date"].strftime("%d/%m"),
                "count": row["count"],
            }
            for row in rows
            if row["date"]
        ]

    def _time_series_rows(self, granularity):
        if granularity == "month":
            trunc_fn = TruncMonth("started_at")
            now = timezone.now()
            year = now.year
            month = now.month
            start_year = year
            start_month = month - 4
            while start_month <= 0:
                start_month += 12
                start_year -= 1
            start_dt = datetime(start_year, start_month, 1)
            if timezone.is_aware(now):
                start_dt = timezone.make_aware(
                    start_dt, timezone.get_current_timezone()
                )
            qs = ChatbotSessionSummary.objects.filter(started_at__gte=start_dt)
        elif granularity == "week":
            trunc_fn = TruncWeek("started_at")
            qs = self.summaries
        else:
            granularity = "day"
            trunc_fn = TruncDate("started_at")
            qs = self.summaries

        rows = (
            qs.filter(started_at__isnull=False)
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

            if granularity == "month":
                date_value = period.strftime("%Y-%m")
                label_value = f"Tháng {period.strftime('%m/%Y')}"
            elif granularity == "week":
                date_value = period.strftime("%Y-W%W")
                label_value = f"Tuần {period.strftime('%W')} ({period.strftime('%d/%m')})"
            else:
                date_value = period.strftime("%Y-%m-%d")
                label_value = period.strftime("%d/%m")

            result.append(
                {
                    "date": date_value,
                    "label": label_value,
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
        if granularity == "day":
            trunc_fn = TruncDate("started_at")
        elif granularity == "week":
            trunc_fn = TruncWeek("started_at")
        else:
            granularity = "month"
            trunc_fn = TruncMonth("started_at")

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
            if granularity == "month":
                p_key = p.strftime("%Y-%m")
                p_label = f"T{p.strftime('%m/%Y')}"
            elif granularity == "week":
                p_key = p.strftime("%Y-W%W")
                p_label = f"Tuần {p.strftime('%W')} ({p.strftime('%d/%m')})"
            else:
                p_key = p.strftime("%Y-%m-%d")
                p_label = p.strftime("%d/%m")

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
        if granularity == "day":
            trunc_fn = TruncDate("started_at")
        elif granularity == "week":
            trunc_fn = TruncWeek("started_at")
        else:
            granularity = "month"
            trunc_fn = TruncMonth("started_at")

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
            if granularity == "month":
                p_key = p.strftime("%Y-%m")
                p_label = f"T{p.strftime('%m/%Y')}"
            elif granularity == "week":
                p_key = p.strftime("%Y-W%W")
                p_label = f"Tuần {p.strftime('%W')} ({p.strftime('%d/%m')})"
            else:
                p_key = p.strftime("%Y-%m-%d")
                p_label = p.strftime("%d/%m")

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
