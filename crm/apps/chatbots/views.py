from django.db.models import Count, F, Max, Q
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chatbots.constants import SPAM_QUESTION_TYPES, UNCATEGORIZED_LABEL
from apps.chatbots.dashboard.aggregations import (
    ChatbotDashboardAggregator,
    TOPIC_OUTCOMES,
)
from apps.chatbots.dashboard.cache import get_or_build_dashboard_section
from apps.chatbots.dashboard.constants import (
    SECTION_COMPARISON,
    SECTION_OPERATIONS,
    SECTION_QUICK_LISTS,
    SECTION_SUMMARY,
    SECTION_TOPICS,
    SECTION_TRAFFIC,
    parse_dashboard_sections,
)
from apps.chatbots.dashboard.filters import ChatbotDashboardFilterMixin
from apps.chatbots.dashboard.periods import GRANULARITY_LABELS
from apps.chatbots.models import ChatbotChatLog, ChatbotSessionSummary
from apps.chatbots.serializers import (
    ChatbotChatLogSerializer,
    ChatbotFAQReportSerializer,
    ChatbotSessionDetailSerializer,
    ChatbotSessionListSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def merge_dashboard_payload(target, source):
    """Gộp các section cache độc lập vào response giữ nguyên schema cũ."""
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            target[key].update(value)
        else:
            target[key] = value


class ChatbotDashboardOverviewAPIView(ChatbotDashboardFilterMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Không truyền granularity thì tự suy từ độ dài khoảng lọc:
        # lọc trong tháng -> ngày, lọc trọn năm -> tháng, nhiều năm -> năm.
        granularity = self.resolve_granularity(
            request.query_params.get("granularity")
        )

        sections, explicit_sections = parse_dashboard_sections(
            request.query_params.get("sections")
        )
        summaries = self.get_filtered_summaries()
        logs = self.get_filtered_logs()
        aggregator = ChatbotDashboardAggregator(
            summaries,
            logs,
            # Biểu đồ so sánh cần các kỳ ngang hàng nên nhìn rộng hơn bộ lọc;
            # các biểu đồ còn lại vẫn bám đúng khoảng người dùng chọn.
            series_summaries=self.get_series_summaries(granularity),
            focus_bounds=self.get_focus_bounds(),
        )
        signature = self.get_filter_signature(granularity=granularity)

        builders = {
            SECTION_SUMMARY: lambda: aggregator.build_summary_section(granularity),
            SECTION_TOPICS: lambda: aggregator.build_topics_section(granularity),
            SECTION_TRAFFIC: lambda: aggregator.build_traffic_section(granularity),
            SECTION_OPERATIONS: lambda: aggregator.build_operations_section(granularity),
            SECTION_COMPARISON: lambda: aggregator.build_comparison_section(granularity),
            SECTION_QUICK_LISTS: aggregator.build_quick_lists_section,
        }

        payload = {
            "filters": self.get_filter_response(),
            # Frontend cần biết backend đã chọn mốc nào để hiển thị đúng nhãn
            # khi người dùng để chế độ tự động.
            "granularity": granularity,
            "granularity_label": GRANULARITY_LABELS[granularity],
            "summary": {},
            "charts": {},
            "quick_lists": {},
        }

        for section in sections:
            section_payload = get_or_build_dashboard_section(
                section,
                signature,
                builders[section],
            )
            merge_dashboard_payload(payload, section_payload)

        # Frontend mới dùng trường này để biết phần nào đã được lazy-load.
        # Không truyền sections thì không thêm trường, giữ response cũ tối đa.
        if explicit_sections:
            payload["loaded_sections"] = list(sections)

        return Response(payload)


class ChatbotDashboardTicketsAPIView(ChatbotDashboardFilterMixin, generics.ListAPIView):
    """Danh sách phiên chat khi bấm KPI hoặc biểu đồ."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotSessionListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = (
            ChatbotSessionSummary.objects.select_related(
                "ticket",
                "ticket__current_status",
            )
            .only(
                "id",
                "session_id",
                "user_id",
                "channel",
                "dashboard_category",
                "outcome_type",
                "msg_count_total",
                "has_cskh_state",
                "has_cskh_request",
                "state_step",
                "contact_info",
                "contact_type",
                "reason",
                "last_question",
                "started_at",
                "ended_at",
                "ticket_id",
                "ticket__ticket_code",
                "ticket__account_link_status",
                "ticket__current_status__status_name",
                "ticket__current_status__sort_order",
            )
            .order_by(
                F("ticket__current_status__sort_order").asc(nulls_last=True),
                "-started_at",
                "-id",
            )
        )

        queryset = self.filter_summaries(queryset)
        status_value = self.request.query_params.get("status")
        category = self.request.query_params.get("dashboard_category")
        keyword = (self.request.query_params.get("q") or "").strip()

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
            # Không quét full_conversation trong list API. Endpoint chi tiết vẫn
            # trả toàn bộ message; tìm kiếm danh sách tập trung vào metadata và
            # câu đầu/cuối để tránh ILIKE trên cột text rất lớn.
            queryset = queryset.filter(
                Q(session_id__icontains=keyword)
                | Q(user_id__icontains=keyword)
                | Q(first_question__icontains=keyword)
                | Q(last_question__icontains=keyword)
                | Q(reason__icontains=keyword)
                | Q(contact_info__icontains=keyword)
                | Q(ticket__ticket_code__icontains=keyword)
            )

        return queryset


class ChatbotSessionDetailAPIView(APIView):
    """Chi tiết một phiên: thông tin tổng hợp và hội thoại gốc."""

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

        logs = (
            ChatbotChatLog.objects.filter(session_id=session_id)
            .only(
                "id",
                "session_id",
                "user_id",
                "channel",
                "question",
                "answer",
                "questionType",
                "category",
                "external_created_at",
            )
            .order_by("external_created_at", "id")
        )

        return Response(
            {
                "session": ChatbotSessionDetailSerializer(summary).data,
                "messages": ChatbotChatLogSerializer(logs, many=True).data,
            }
        )


class ChatbotDashboardFAQAPIView(ChatbotDashboardFilterMixin, generics.ListAPIView):
    """FAQ: xếp hạng category được khách hỏi nhiều nhất."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatbotFAQReportSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        logs = self.get_filtered_logs().exclude(questionType__in=SPAM_QUESTION_TYPES)
        keyword = (self.request.query_params.get("q") or "").strip()

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
