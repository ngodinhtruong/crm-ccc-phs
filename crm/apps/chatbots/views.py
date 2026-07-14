from django.db.models import Count, Max, Q, Sum
from django.utils.dateparse import parse_date
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chatbots.constants import (
    SPAM_QUESTION_TYPES,
    UNCATEGORIZED_LABEL,
)
from apps.chatbots.models import ChatbotChatLog, ChatbotSessionSummary
from apps.chatbots.serializers import (
    ChatbotChatLogSerializer,
    ChatbotFAQReportSerializer,
    ChatbotSessionSummarySerializer,
)

OUTCOME_BOT_DONE = ChatbotSessionSummary.OUTCOME_BOT_DONE
OUTCOME_CCC = ChatbotSessionSummary.OUTCOME_CCC
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING

# Chủ đề chỉ tính trên phiên chatbot thật sự xử lý được hoặc đã chuyển CCC
TOPIC_OUTCOMES = [OUTCOME_BOT_DONE, OUTCOME_CCC]


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ChatbotDashboardFilterMixin:
    """Lọc theo ngày / tuần / tháng / năm / khung giờ cho cả logs lẫn summaries."""

    def get_int_param(self, name):
        value = self.request.query_params.get(name)

        if value in [None, ""]:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def filter_by_period(self, queryset, date_field):
        start_date = parse_date(self.request.query_params.get("start_date") or "")
        end_date = parse_date(self.request.query_params.get("end_date") or "")

        # Khoảng ngày cụ thể luôn thắng năm/tháng để tránh hai bộ lọc chống nhau
        if start_date or end_date:
            if start_date:
                queryset = queryset.filter(**{f"{date_field}__date__gte": start_date})

            if end_date:
                queryset = queryset.filter(**{f"{date_field}__date__lte": end_date})
        else:
            year = self.get_int_param("year")
            month = self.get_int_param("month")

            if year:
                queryset = queryset.filter(**{f"{date_field}__year": year})

            if month and 1 <= month <= 12:
                queryset = queryset.filter(**{f"{date_field}__month": month})

        start_hour = self.get_int_param("start_hour")
        end_hour = self.get_int_param("end_hour")

        in_range = 0 <= (start_hour or 0) <= 23 and 0 <= (end_hour or 0) <= 23

        if start_hour is not None and end_hour is not None and in_range:
            if start_hour <= end_hour:
                queryset = queryset.filter(
                    **{
                        f"{date_field}__hour__gte": start_hour,
                        f"{date_field}__hour__lte": end_hour,
                    }
                )
            else:
                # Khung giờ vắt qua nửa đêm, ví dụ 22h -> 5h
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

    def rate(self, value, total):
        if not total:
            return 0.0

        return round((value / total) * 100, 2)


def group_by_category(summaries):
    """Đếm số phiên theo chủ đề, gom phiên chưa có category vào 'Chưa phân loại'."""
    rows = (
        summaries.values("dashboard_category")
        .annotate(value=Count("id"))
        .order_by("-value")
    )

    grouped = []

    for row in rows:
        grouped.append(
            {
                "name": row["dashboard_category"] or UNCATEGORIZED_LABEL,
                "value": row["value"],
            }
        )

    return grouped


class ChatbotDashboardOverviewAPIView(ChatbotDashboardFilterMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get_top_faqs(self, logs, limit=5):
        """FAQ = chủ đề (category) được khách hỏi nhiều nhất."""
        rows = (
            logs.exclude(questionType__in=SPAM_QUESTION_TYPES)
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

        return [
            {
                "category": row["category"],
                "hit_count": row["hit_count"],
                "session_count": row["session_count"],
                "latest_at": row["latest_at"],
            }
            for row in rows
        ]

    def build_bucket(self, summaries, count_field, outcome, label, total_messages):
        """
        Một ô KPI: số lượt hỏi + số phiên của một nhóm xử lý.

        Số lượt lấy từ msg_count_* đã tính sẵn khi rebuild, nên bốn nhóm
        luôn cộng đúng bằng tổng tiếp nhận. Số phiên đếm theo outcome nên
        mỗi phiên chỉ thuộc đúng một nhóm.
        """
        group = summaries.filter(outcome_type=outcome)

        value = summaries.aggregate(total=Sum(count_field))["total"] or 0

        return {
            "code": outcome,
            "label": label,
            "value": value,
            "session_count": group.count(),
            "rate": self.rate(value, total_messages),
        }

    def get(self, request):
        summaries = self.get_filtered_summaries()
        logs = self.get_filtered_logs()

        # Tổng tiếp nhận: số lượt hỏi trong xpro_chat_logs + số phiên tương ứng.
        # Đếm phiên trên bảng tổng hợp để khớp với số dòng khi bấm xem chi tiết.
        totals = summaries.aggregate(messages=Sum("msg_count_total"))
        total_messages = totals["messages"] or 0
        total_sessions = summaries.count()

        bot_done = self.build_bucket(
            summaries,
            "msg_count_bot_done",
            OUTCOME_BOT_DONE,
            "Chatbot tự xử lý",
            total_messages,
        )

        ccc = self.build_bucket(
            summaries,
            "msg_count_ccc",
            OUTCOME_CCC,
            "Chuyển CCC xử lý",
            total_messages,
        )

        pending = self.build_bucket(
            summaries,
            "msg_count_pending",
            OUTCOME_PENDING,
            "Chờ thông tin khách hàng",
            total_messages,
        )

        spam = self.build_bucket(
            summaries,
            "msg_count_spam",
            OUTCOME_SPAM,
            "Câu hỏi rác",
            total_messages,
        )

        # Biểu đồ cột: so sánh 3 cách xử lý + nhóm chờ
        process_classification = [
            {"name": item["label"], **item} for item in [bot_done, ccc, pending, spam]
        ]

        # Biểu đồ tròn: chủ đề của các phiên đã chuyển CCC
        ccc_issue_pie = group_by_category(summaries.filter(outcome_type=OUTCOME_CCC))

        # Biểu đồ chủ đề: gồm cả phiên chatbot tự xử lý lẫn phiên chuyển CCC
        topic_bar = group_by_category(
            summaries.filter(outcome_type__in=TOPIC_OUTCOMES)
        )

        latest_ccc = (
            summaries.filter(outcome_type=OUTCOME_CCC)
            .select_related("ticket", "ticket__current_status")
            .order_by("-started_at", "-id")[:5]
        )

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
                        "code": "ALL",
                        "label": "Tổng tiếp nhận",
                        "value": total_messages,
                        "session_count": total_sessions,
                        "rate": 100.0 if total_messages else 0.0,
                    },
                    "bot_done": bot_done,
                    "ccc": ccc,
                    "spam": spam,
                    "pending": pending,
                },
                "charts": {
                    "process_classification": process_classification,
                    "ccc_issue_pie": ccc_issue_pie,
                    "topic_bar": topic_bar,
                },
                "quick_lists": {
                    "latest_ccc_tickets": ChatbotSessionSummarySerializer(
                        latest_ccc,
                        many=True,
                    ).data,
                    "top_faqs": self.get_top_faqs(logs, limit=5),
                },
            }
        )


class ChatbotDashboardTicketsAPIView(ChatbotDashboardFilterMixin, generics.ListAPIView):
    """Danh sách phiên chat, dùng khi bấm vào một ô KPI hoặc một cột biểu đồ."""

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
        category = self.request.query_params.get("dashboard_category")
        keyword = self.request.query_params.get("q")

        if status_value == "TOPIC":
            queryset = queryset.filter(outcome_type__in=TOPIC_OUTCOMES)

        elif status_value and status_value != "ALL":
            queryset = queryset.filter(outcome_type=status_value)

        if category:
            if category == UNCATEGORIZED_LABEL:
                queryset = queryset.filter(
                    Q(dashboard_category__isnull=True) | Q(dashboard_category="")
                )
            else:
                queryset = queryset.filter(dashboard_category=category)

        if keyword:
            queryset = queryset.filter(
                Q(session_id__icontains=keyword)
                | Q(user_id__icontains=keyword)
                | Q(first_question__icontains=keyword)
                | Q(last_question__icontains=keyword)
                | Q(full_conversation__icontains=keyword)
                | Q(reason__icontains=keyword)
                | Q(contact_info__icontains=keyword)
                | Q(ticket__ticket_code__icontains=keyword)
            )

        return queryset


class ChatbotSessionDetailAPIView(APIView):
    """Chi tiết một phiên: thông tin tổng hợp + toàn bộ hội thoại gốc."""

    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        summary = (
            ChatbotSessionSummary.objects.select_related(
                "ticket",
                "ticket__current_status",
                "ticket__customer",
                "ticket__customer_account",
            )
            .filter(session_id=session_id)
            .first()
        )

        if not summary:
            return Response({"detail": "Không tìm thấy phiên chat."}, status=404)

        logs = ChatbotChatLog.objects.filter(session_id=session_id).order_by(
            "external_created_at", "id"
        )

        return Response(
            {
                "session": ChatbotSessionSummarySerializer(summary).data,
                "messages": ChatbotChatLogSerializer(logs, many=True).data,
            }
        )


class ChatbotDashboardFAQAPIView(ChatbotDashboardFilterMixin, generics.ListAPIView):
    """FAQ: xếp hạng các chủ đề (category) được khách hỏi nhiều nhất."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotFAQReportSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        logs = self.get_filtered_logs().exclude(questionType__in=SPAM_QUESTION_TYPES)

        keyword = self.request.query_params.get("q")

        if keyword:
            logs = logs.filter(
                Q(category__icontains=keyword)
                | Q(question__icontains=keyword)
                | Q(answer__icontains=keyword)
            )

        return (
            logs.exclude(category__isnull=True)
            .exclude(category__exact="")
            .values("category")
            .annotate(
                hit_count=Count("id"),
                session_count=Count("session_id", distinct=True),
                latest_at=Max("external_created_at"),
            )
            .order_by("-hit_count", "-latest_at")
        )
