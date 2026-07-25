"""Các truy vấn aggregate nhỏ, độc lập theo section của dashboard chatbot."""

from datetime import timedelta

from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Max,
    Q,
    Sum,
)
from django.db.models.functions import Coalesce, ExtractHour, TruncDate, TruncMonth, TruncWeek

from apps.chatbots.constants import SPAM_QUESTION_TYPES, UNCATEGORIZED_LABEL
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.serializers import ChatbotSessionQuickSerializer
from apps.common.constants import SlaStatus, TicketStatusCode

OUTCOME_BOT_DONE = ChatbotSessionSummary.OUTCOME_BOT_DONE
OUTCOME_CCC = ChatbotSessionSummary.OUTCOME_CCC
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING
TOPIC_OUTCOMES = (OUTCOME_BOT_DONE, OUTCOME_CCC)


class ChatbotDashboardAggregator:
    def __init__(self, summaries, logs):
        self.summaries = summaries
        self.logs = logs

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
            return {
                "code": code,
                "label": label,
                "value": value,
                "session_count": data[session_key] or 0,
                "rate": self.rate(value, total_messages),
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

    def build_topics_section(self, transfer_limit=8):
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

        ccc_issue_pie = [
            {"name": label(row), "value": row["ccc"]}
            for row in sorted(rows, key=lambda item: item["ccc"], reverse=True)
            if row["ccc"]
        ]
        topic_bar = [
            {"name": label(row), "value": row["topic_total"]}
            for row in sorted(rows, key=lambda item: item["topic_total"], reverse=True)
            if row["topic_total"]
        ]

        transfer_rows = [
            row
            for row in rows
            if row["dashboard_category"] not in (None, "") and row["all_total"]
        ]
        transfer_rows.sort(key=lambda item: item["all_total"], reverse=True)
        topic_transfer_rates = [
            {
                "category": row["dashboard_category"],
                "total": row["all_total"],
                "ccc": row["ccc"],
                "bot_done": row["bot_done"],
                "transfer_rate": self.rate(row["ccc"], row["all_total"], digits=1),
            }
            for row in transfer_rows[:transfer_limit]
        ]

        return {
            "charts": {
                "ccc_issue_pie": ccc_issue_pie,
                "topic_bar": topic_bar,
                "topic_transfer_rates": topic_transfer_rates,
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
        elif granularity == "week":
            trunc_fn = TruncWeek("started_at")
        else:
            granularity = "day"
            trunc_fn = TruncDate("started_at")

        rows = (
            self.summaries.filter(started_at__isnull=False)
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

        hourly_rows = list(
            self.summaries.filter(started_at__isnull=False)
            .annotate(hour=ExtractHour("started_at"))
            .values("hour")
            .annotate(
                total=Count("id"),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
            )
            .order_by("hour")
        )
        hour_map = {
            row["hour"]: row for row in hourly_rows if row["hour"] is not None
        }
        hourly_tickets = [
            {
                "key": f"{hour:02d}",
                "label": f"{hour:02d}:00",
                "count": hour_map.get(hour, {}).get("total", 0),
            }
            for hour in range(24)
        ]
        hourly_peak = [
            {
                "hour": f"{hour:02d}",
                "label": f"{hour:02d}:00",
                "total": hour_map.get(hour, {}).get("total", 0),
                "ccc": hour_map.get(hour, {}).get("ccc", 0),
                "bot_done": hour_map.get(hour, {}).get("bot_done", 0),
            }
            for hour in range(24)
        ]

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
                "hourly_chatbot_tickets": hourly_tickets,
                "channel_distribution": channel_distribution,
                "time_series_outcomes": time_series,
                "hourly_peak_chart": hourly_peak,
            }
        }

    @staticmethod
    def _minutes(value):
        if not value:
            return 0.0
        return round(value.total_seconds() / 60.0, 1)

    def _handling_times(self):
        duration_queryset = self.summaries.annotate(
            bot_duration=ExpressionWrapper(
                F("ended_at") - F("started_at"),
                output_field=DurationField(),
            ),
            response_duration=ExpressionWrapper(
                F("ticket__accepted_at") - F("ticket__created_at"),
                output_field=DurationField(),
            ),
            resolution_end=Coalesce("ticket__closed_at", "ticket__done_at"),
        ).annotate(
            resolution_duration=ExpressionWrapper(
                F("resolution_end") - F("ticket__created_at"),
                output_field=DurationField(),
            )
        )

        values = duration_queryset.aggregate(
            avg_bot=Avg(
                "bot_duration",
                filter=Q(
                    started_at__isnull=False,
                    ended_at__isnull=False,
                    bot_duration__gte=timedelta(0),
                    bot_duration__lte=timedelta(minutes=120),
                ),
            ),
            avg_response=Avg(
                "response_duration",
                filter=Q(
                    ticket__created_at__isnull=False,
                    ticket__accepted_at__isnull=False,
                    response_duration__gte=timedelta(0),
                ),
            ),
            avg_resolution=Avg(
                "resolution_duration",
                filter=Q(
                    ticket__created_at__isnull=False,
                    resolution_end__isnull=False,
                    resolution_duration__gte=timedelta(0),
                ),
            ),
        )
        return {
            "avg_bot_duration_min": self._minutes(values["avg_bot"]),
            "avg_response_time_min": self._minutes(values["avg_response"]),
            "avg_resolution_time_min": self._minutes(values["avg_resolution"]),
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

    def build_operations_section(self):
        status_rows = (
            self.summaries.filter(ticket__isnull=False)
            .values("ticket__current_status__status_name")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
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
                "avg_handling_times": self._handling_times(),
                "customer_linkage": self._customer_linkage(),
            }
        }

    def build_sla_section(self):
        values = self.summaries.filter(ticket__isnull=False).aggregate(
            total=Count("id", distinct=True),
            on_time=Count(
                "id",
                filter=(
                    Q(ticket__sla_tracking__sla_status=SlaStatus.ON_TIME)
                    | Q(ticket__sla_tracking__isnull=True)
                ),
                distinct=True,
            ),
            overdue=Count(
                "id",
                filter=Q(ticket__sla_tracking__sla_status=SlaStatus.OVERDUE),
                distinct=True,
            ),
            processing=Count(
                "id",
                filter=Q(ticket__sla_tracking__sla_status=SlaStatus.PROCESSING),
                distinct=True,
            ),
        )
        total = values["total"] or 0
        on_time = values["on_time"] or 0
        overdue = values["overdue"] or 0
        processing = values["processing"] or 0
        return {
            "charts": {
                "sla_compliance_trend": {
                    "total_tickets": total,
                    "on_time": on_time,
                    "overdue": overdue,
                    "warning": processing,
                    "on_time_rate": self.rate(on_time, total, digits=1) if total else 100.0,
                    "items": [
                        {"name": "Đúng hạn (On-time)", "value": on_time, "color": "#10b981"},
                        {"name": "Đang xử lý (In-progress)", "value": processing, "color": "#3b82f6"},
                        {"name": "Quá hạn (Overdue)", "value": overdue, "color": "#ef4444"},
                    ],
                }
            }
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
