from django.db.models import Count, Max, Q, Sum
from django.utils.dateparse import parse_date
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from apps.chatbots.models import ChatbotChatLog, ChatbotSessionSummary
from apps.chatbots.serializers import (
    ChatbotFAQReportSerializer,
    ChatbotSessionSummarySerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ChatbotDashboardFilterMixin:
    def get_int_param(self, name):
        value = self.request.query_params.get(name)

        if value in [None, ""]:
            return None

        try:
            return int(value)
        except ValueError:
            return None

    def filter_by_period(self, queryset, date_field):
        year = self.get_int_param("year")
        month = self.get_int_param("month")

        start_date = parse_date(self.request.query_params.get("start_date") or "")
        end_date = parse_date(self.request.query_params.get("end_date") or "")

        start_hour = self.get_int_param("start_hour")
        end_hour = self.get_int_param("end_hour")

        if start_date:
            queryset = queryset.filter(**{f"{date_field}__date__gte": start_date})

        if end_date:
            queryset = queryset.filter(**{f"{date_field}__date__lte": end_date})

        if not start_date and not end_date:
            if year:
                queryset = queryset.filter(**{f"{date_field}__year": year})

            if month:
                queryset = queryset.filter(**{f"{date_field}__month": month})

        if start_hour is not None and end_hour is not None:
            if 0 <= start_hour <= 23 and 0 <= end_hour <= 23:
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

    def rate(self, value, total):
        if not total:
            return 0

        return round((value / total) * 100, 2)


class ChatbotDashboardOverviewAPIView(ChatbotDashboardFilterMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get_top_faqs(self, limit=5):
        logs = self.filter_logs(
            ChatbotChatLog.objects.filter(category__iexact="FAQ")
            .exclude(question__isnull=True)
            .exclude(question__exact="")
        )

        grouped_rows = list(
            logs.values("question")
            .annotate(
                hit_count=Count("id"),
                latest_at=Max("external_created_at"),
            )
            .order_by("-hit_count", "-latest_at")[:limit]
        )

        results = []

        for row in grouped_rows:
            latest_log = (
                logs.filter(question=row["question"])
                .order_by("-external_created_at", "-id")
                .first()
            )

            results.append(
                {
                    "question": row["question"],
                    "answer": latest_log.answer if latest_log else "",
                    "category": latest_log.category if latest_log else "FAQ",
                    "hit_count": row["hit_count"],
                    "latest_at": row["latest_at"],
                }
            )

        return results

    def get(self, request):
        queryset = self.filter_summaries(
            ChatbotSessionSummary.objects.select_related("ticket").all()
        )

        total_sessions = queryset.count()
        total_messages = self.filter_logs(ChatbotChatLog.objects.all()).count()

        aggs = queryset.aggregate(
            bot_done_msg=Sum("msg_count_bot_done"),
            ccc_msg=Sum("msg_count_ccc"),
            spam_msg=Sum("msg_count_spam")
        )
        bot_done_msg = aggs["bot_done_msg"] or 0
        ccc_msg = aggs["ccc_msg"] or 0
        spam_msg = aggs["spam_msg"] or 0

        bot_done_sessions = queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_BOT_DONE).count()
        ccc_sessions = queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_CCC).count()
        spam_sessions = queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_SPAM).count()
        waiting_info = queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_WAITING_INFO).count()
        collected = queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_COLLECTED).count()

        process_classification = [
            {
                "name": "Chatbot tự xử lý",
                "code": "BOT_DONE",
                "value": bot_done_msg,
                "session_count": bot_done_sessions,
                "rate": self.rate(bot_done_msg, total_messages),
            },
            {
                "name": "Chuyển CCC",
                "code": "CCC",
                "value": ccc_msg,
                "session_count": ccc_sessions,
                "rate": self.rate(ccc_msg, total_messages),
            },
            {
                "name": "Câu hỏi rác",
                "code": "SPAM",
                "value": spam_msg,
                "session_count": spam_sessions,
                "rate": self.rate(spam_msg, total_messages),
            },
        ]

        ccc_issue_pie = list(
            queryset.filter(outcome_type=ChatbotSessionSummary.OUTCOME_CCC)
            .values("dashboard_category")
            .annotate(value=Count("id"))
            .order_by("-value")
        )

        for item in ccc_issue_pie:
            item["name"] = item.pop("dashboard_category") or "Khác"

        topic_bar = list(
            queryset.values("dashboard_category")
            .annotate(value=Count("id"))
            .order_by("-value")
        )

        for item in topic_bar:
            item["name"] = item.pop("dashboard_category") or "Khác"

        latest_ccc_tickets = queryset.filter(
            outcome_type=ChatbotSessionSummary.OUTCOME_CCC
        ).order_by("-started_at", "-id")[:5]

        latest_ccc_data = ChatbotSessionSummarySerializer(
            latest_ccc_tickets,
            many=True,
        ).data

        top_faqs = self.get_top_faqs(limit=5)

        return Response(
            {
                "filters": {
                    "year": request.query_params.get("year"),
                    "month": request.query_params.get("month"),
                    "start_date": request.query_params.get("start_date"),
                    "end_date": request.query_params.get("end_date"),
                    "start_hour": request.query_params.get("start_hour"),
                    "end_hour": request.query_params.get("end_hour"),
                },
                "summary": {
                    "total_received": {
                        "value": total_messages,
                        "session_count": total_sessions,
                        "label": "Tổng tiếp nhận",
                    },
                    "bot_done": {
                        "value": bot_done_msg,
                        "session_count": bot_done_sessions,
                        "rate": self.rate(bot_done_msg, total_messages),
                        "label": "Chatbot tự xử lý",
                    },
                    "ccc": {
                        "value": ccc_msg,
                        "session_count": ccc_sessions,
                        "rate": self.rate(ccc_msg, total_messages),
                        "label": "Chuyển sang CCC xử lý",
                    },
                    "spam": {
                        "value": spam_msg,
                        "session_count": spam_sessions,
                        "rate": self.rate(spam_msg, total_messages),
                        "label": "Câu hỏi rác",
                    },
                    "waiting_info": {
                        "value": waiting_info,
                        "label": "Đang chờ thông tin",
                    },
                    "collected": {
                        "value": collected,
                        "label": "Đã thu thập thông tin",
                    },
                },
                "charts": {
                    "process_classification": process_classification,
                    "ccc_issue_pie": ccc_issue_pie,
                    "topic_bar": topic_bar,
                },
                "quick_lists": {
                    "latest_ccc_tickets": latest_ccc_data,
                    "top_faqs": top_faqs,
                },
            }
        )


class ChatbotDashboardTicketsAPIView(
    ChatbotDashboardFilterMixin,
    generics.ListAPIView,
):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotSessionSummarySerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = ChatbotSessionSummary.objects.select_related(
            "ticket",
            "ticket__current_status",
            "ticket__customer",
            "ticket__customer_account",
        ).order_by("-started_at", "-id")

        queryset = self.filter_summaries(queryset)

        status_value = self.request.query_params.get("status")
        keyword = self.request.query_params.get("q")
        dashboard_category = self.request.query_params.get("dashboard_category")

        if status_value and status_value != "ALL":
            if status_value == "BOT_DONE":
                queryset = (
                    queryset
                    .exclude(outcome_type=ChatbotSessionSummary.OUTCOME_CCC)
                    .exclude(
                        outcome_type__in=[
                            ChatbotSessionSummary.OUTCOME_SPAM,
                            ChatbotSessionSummary.OUTCOME_TIMEOUT,
                        ]
                    )
                )

            elif status_value == "CCC":
                queryset = queryset.filter(
                    outcome_type=ChatbotSessionSummary.OUTCOME_CCC
                )

            elif status_value == "SPAM":
                queryset = queryset.filter(
                    outcome_type__in=[
                        ChatbotSessionSummary.OUTCOME_SPAM,
                        ChatbotSessionSummary.OUTCOME_TIMEOUT,
                    ]
                )

            else:
                queryset = queryset.filter(outcome_type=status_value)
        if dashboard_category:
            if dashboard_category == "Khác":
                queryset = queryset.filter(
                    Q(dashboard_category__isnull=True)
                    | Q(dashboard_category="")
                    | Q(dashboard_category="Khác")
                )
            else:
                queryset = queryset.filter(dashboard_category=dashboard_category)
        if keyword:
            queryset = queryset.filter(
                Q(session_id__icontains=keyword)
                | Q(first_question__icontains=keyword)
                | Q(last_question__icontains=keyword)
                | Q(full_conversation__icontains=keyword)
                | Q(reason__icontains=keyword)
                | Q(ticket__ticket_code__icontains=keyword)
                | Q(contact_info__icontains=keyword)
            )

        return queryset


class ChatbotDashboardFAQAPIView(ChatbotDashboardFilterMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ChatbotChatLog.objects.filter(category__iexact="FAQ").exclude(
            question__isnull=True
        ).exclude(question__exact="")

        queryset = self.filter_logs(queryset)

        keyword = request.query_params.get("q")

        if keyword:
            queryset = queryset.filter(
                Q(question__icontains=keyword) | Q(answer__icontains=keyword)
            )

        grouped_rows = list(
            queryset.values("question")
            .annotate(
                hit_count=Count("id"),
                latest_at=Max("external_created_at"),
            )
            .order_by("-hit_count", "-latest_at")
        )

        page = self.get_int_param("page") or 1
        page_size = self.get_int_param("page_size") or 20

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        start = (page - 1) * page_size
        end = start + page_size

        results = []

        for row in grouped_rows[start:end]:
            latest_log = (
                queryset.filter(question=row["question"])
                .order_by("-external_created_at", "-id")
                .first()
            )

            results.append(
                {
                    "question": row["question"],
                    "answer": latest_log.answer if latest_log else "",
                    "category": latest_log.category if latest_log else "FAQ",
                    "hit_count": row["hit_count"],
                    "latest_at": row["latest_at"],
                }
            )

        serializer = ChatbotFAQReportSerializer(results, many=True)

        return Response(
            {
                "count": len(grouped_rows),
                "page": page,
                "page_size": page_size,
                "results": serializer.data,
            }
        )