import csv
import io
from datetime import datetime, time, timedelta

from django.http import HttpResponse
from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chatbots.constants import UNCATEGORIZED_LABEL
from apps.chatbots.dashboard.aggregations import (
    ChatbotDashboardAggregator,
    TOPIC_OUTCOMES,
    only_topic_logs,
)
from apps.chatbots.dashboard.cache import (
    bump_chatbot_dashboard_cache_version,
    get_or_build_dashboard_section,
)
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
from apps.chatbots.dashboard.periods import (
    DASHBOARD_TIMEZONE,
    GRANULARITY_LABELS,
)
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
        if request.query_params.get("refresh") in ("true", "1", "True") or request.query_params.get("force") in ("true", "1", "True"):
            bump_chatbot_dashboard_cache_version()

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

        # dashboard_category khớp tuyệt đối: tham số này do biểu đồ truyền vào
        # khi người dùng bấm một cột, phải ra đúng tập của cột đó.
        if category:
            if category == UNCATEGORIZED_LABEL:
                queryset = queryset.filter(
                    Q(dashboard_category__isnull=True) | Q(dashboard_category="")
                )
            else:
                queryset = queryset.filter(dashboard_category=category)

        queryset = self.apply_column_filters(queryset)

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

    # Lọc theo từng cột của bảng, đặt ngay dưới dòng tiêu đề. Mỗi tham số ứng
    # với đúng một cột người dùng nhìn thấy; khác với `q` là ô tìm chung.
    COLUMN_TEXT_FILTERS = {
        "ticket_code": "ticket__ticket_code__icontains",
        "session_id": "session_id__icontains",
        "channel": "channel__icontains",
        # Khác `dashboard_category` (khớp tuyệt đối, do biểu đồ truyền vào):
        # ô lọc cột là người dùng gõ tay nên tìm gần đúng.
        "category": "dashboard_category__icontains",
        "contact_info": "contact_info__icontains",
        "last_question": "last_question__icontains",
        "reason": "reason__icontains",
    }

    def apply_column_filters(self, queryset):
        for param, lookup in self.COLUMN_TEXT_FILTERS.items():
            value = (self.request.query_params.get(param) or "").strip()

            if value:
                queryset = queryset.filter(**{lookup: value})

        ticket_status = (
            self.request.query_params.get("ticket_status") or ""
        ).strip()

        if ticket_status:
            queryset = queryset.filter(
                ticket__current_status__status_code=ticket_status
            )

        # Khoảng thời gian riêng của cột, chồng lên bộ lọc chung của dashboard.
        for param, lookup in (
            ("started_from", "started_at__gte"),
            ("started_to", "started_at__lt"),
        ):
            parsed = parse_date(self.request.query_params.get(param) or "")

            if not parsed:
                continue

            moment = datetime.combine(parsed, time.min)

            if timezone.is_naive(moment):
                moment = timezone.make_aware(moment, DASHBOARD_TIMEZONE)

            if param == "started_to":
                # Người dùng chọn "đến ngày 15" là muốn gồm cả ngày 15.
                moment += timedelta(days=1)

            queryset = queryset.filter(**{lookup: moment})

        for param, lookup in (
            ("msg_count_min", "msg_count_total__gte"),
            ("msg_count_max", "msg_count_total__lte"),
        ):
            raw = (self.request.query_params.get(param) or "").strip()

            if not raw:
                continue

            try:
                queryset = queryset.filter(**{lookup: int(raw)})
            except (TypeError, ValueError):
                continue

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
                "sender_type",
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
        # Cùng bộ lọc với biểu đồ chủ đề: chỉ lượt thật sự mang chủ đề nghiệp
        # vụ. Không dùng chung thì bảng FAQ và biểu đồ nói hai con số khác nhau
        # cho cùng một chủ đề.
        logs = only_topic_logs(self.get_filtered_logs())
        keyword = (self.request.query_params.get("q") or "").strip()

        if keyword:
            logs = logs.filter(
                Q(category__icontains=keyword)
                | Q(question__icontains=keyword)
                | Q(answer__icontains=keyword)
            )

        return (
            logs.values("category")
            .annotate(
                hit_count=Count("id"),
                session_count=Count("session_id", distinct=True),
                latest_at=Max("external_created_at"),
            )
            .order_by("-hit_count", "-latest_at")
        )


class ChatbotDashboardExportAPIView(ChatbotDashboardFilterMixin, APIView):
    """Xuất dữ liệu danh sách phiên Chatbot ra file Excel (.xlsx) hoặc CSV (.csv)."""

    permission_classes = [IsAuthenticated]

    COLUMN_DEFINITIONS = [
        ("session_id", "Mã phiên"),
        ("ticket_code", "Mã Ticket CRM"),
        ("ticket_status", "Trạng thái Ticket"),
        ("channel", "Kênh"),
        ("outcome_type", "Kết quả xử lý"),
        ("dashboard_category", "Chủ đề"),
        ("contact_info", "Thông tin liên hệ"),
        ("reason", "Lý do / Mô tả"),
        ("last_question", "Câu hỏi gần nhất"),
        ("msg_count_total", "Số tin nhắn"),
        ("started_at", "Thời gian bắt đầu"),
        ("ended_at", "Thời gian kết thúc"),
    ]

    GROUPBY_DIMENSIONS = {
        "category": ("Chủ đề (Category)", "dashboard_category"),
        "outcome": ("Kết quả xử lý (Outcome)", "outcome_type"),
        "channel": ("Kênh giao tiếp (Channel)", "channel"),
        "date": ("Ngày (Date)", "started_at__date"),
    }

    GROUPED_COLUMN_DEFINITIONS = [
        ("group_key", "Giá trị nhóm"),
        ("total_sessions", "Tổng số phiên"),
        ("percent_share", "Cơ cấu / Tỷ trọng (%)"),
        ("bot_done_count", "Chatbot tự xử lý"),
        ("ccc_count", "Chuyển CCC xử lý"),
        ("pending_count", "Chờ thông tin KH"),
        ("research_count", "Phân tích / khuyến nghị"),
        ("spam_count", "Câu hỏi rác"),
        ("unclassified_count", "Chưa xác định"),
        ("self_service_rate", "Tỷ lệ tự xử lý (%)"),
        ("ccc_transfer_rate", "Tỷ lệ chuyển CCC (%)"),
        ("total_messages", "Tổng số tin nhắn"),
        ("avg_messages", "Trung bình tin nhắn/phiên"),
    ]

    OUTCOME_LABELS = {
        "BOT_DONE": "Chatbot tự xử lý",
        "CCC": "Chuyển CCC xử lý",
        "RESEARCH": "Phân tích / khuyến nghị",
        "SPAM": "Câu hỏi rác",
        "PENDING": "Chờ thông tin KH",
        "UNCLASSIFIED": "Chưa xác định loại",
    }

    def get_queryset(self):
        queryset = (
            ChatbotSessionSummary.objects.select_related(
                "ticket",
                "ticket__current_status",
            )
            .order_by("-started_at", "-id")
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

        queryset = self.apply_column_filters(queryset)

        if keyword:
            queryset = queryset.filter(
                Q(session_id__icontains=keyword)
                | Q(user_id__icontains=keyword)
                | Q(first_question__icontains=keyword)
                | Q(last_question__icontains=keyword)
                | Q(reason__icontains=keyword)
                | Q(contact_info__icontains=keyword)
                | Q(ticket__ticket_code__icontains=keyword)
            )

        # Lọc đa chọn theo từng thuộc tính (Multi-select column filters)
        channels_raw = (self.request.query_params.get("channels") or "").strip()
        if channels_raw and channels_raw != "all":
            ch_list = [c.strip() for c in channels_raw.split(",") if c.strip()]
            if ch_list:
                queryset = queryset.filter(channel__in=ch_list)

        outcomes_raw = (self.request.query_params.get("outcomes") or "").strip()
        if outcomes_raw and outcomes_raw != "all":
            oc_list = [o.strip() for o in outcomes_raw.split(",") if o.strip()]
            if oc_list:
                queryset = queryset.filter(outcome_type__in=oc_list)

        categories_raw = (self.request.query_params.get("categories") or "").strip()
        if categories_raw and categories_raw != "all":
            cat_list = [c.strip() for c in categories_raw.split(",") if c.strip()]
            if cat_list:
                if "Chưa phân loại" in cat_list or "EMPTY" in cat_list:
                    queryset = queryset.filter(
                        Q(dashboard_category__in=cat_list)
                        | Q(dashboard_category__isnull=True)
                        | Q(dashboard_category="")
                    )
                else:
                    queryset = queryset.filter(dashboard_category__in=cat_list)

        ticket_statuses_raw = (self.request.query_params.get("ticket_statuses") or "").strip()
        if ticket_statuses_raw and ticket_statuses_raw != "all":
            st_list = [s.strip() for s in ticket_statuses_raw.split(",") if s.strip()]
            if st_list:
                queryset = queryset.filter(ticket__current_status__status_code__in=st_list)

        # Lọc chi tiết theo các giá trị bên trong trường group_by nếu có
        group_by_key = (self.request.query_params.get("group_by") or "none").lower().strip()
        selected_vals_raw = (self.request.query_params.get("selected_group_values") or "").strip()

        if group_by_key in self.GROUPBY_DIMENSIONS and selected_vals_raw and selected_vals_raw != "all":
            vals = [v.strip() for v in selected_vals_raw.split(",") if v.strip()]
            if vals:
                if group_by_key == "category":
                    if "EMPTY" in vals or "Chưa phân loại" in vals:
                        queryset = queryset.filter(
                            Q(dashboard_category__in=vals)
                            | Q(dashboard_category__isnull=True)
                            | Q(dashboard_category="")
                        )
                    else:
                        queryset = queryset.filter(dashboard_category__in=vals)
                elif group_by_key == "outcome":
                    queryset = queryset.filter(outcome_type__in=vals)
                elif group_by_key == "channel":
                    queryset = queryset.filter(channel__in=vals)

        return queryset

    def apply_column_filters(self, queryset):
        for param, lookup in ChatbotDashboardTicketsAPIView.COLUMN_TEXT_FILTERS.items():
            value = (self.request.query_params.get(param) or "").strip()
            if value:
                queryset = queryset.filter(**{lookup: value})

        ticket_status = (self.request.query_params.get("ticket_status") or "").strip()
        if ticket_status:
            queryset = queryset.filter(ticket__current_status__status_code=ticket_status)

        for param, lookup in (
            ("started_from", "started_at__gte"),
            ("started_to", "started_at__lt"),
        ):
            parsed = parse_date(self.request.query_params.get(param) or "")
            if not parsed:
                continue
            moment = datetime.combine(parsed, time.min)
            if timezone.is_naive(moment):
                moment = timezone.make_aware(moment, DASHBOARD_TIMEZONE)
            if param == "started_to":
                moment += timedelta(days=1)
            queryset = queryset.filter(**{lookup: moment})

        for param, lookup in (
            ("msg_count_min", "msg_count_total__gte"),
            ("msg_count_max", "msg_count_total__lte"),
        ):
            raw = (self.request.query_params.get(param) or "").strip()
            if not raw:
                continue
            try:
                queryset = queryset.filter(**{lookup: int(raw)})
            except (TypeError, ValueError):
                continue

        return queryset

    def get(self, request):
        export_format = request.query_params.get("export_format", "excel").lower()
        export_mode = request.query_params.get("export_mode", "").lower().strip()
        raw_db = (
            request.query_params.get("raw_db") == "true"
            or export_mode == "raw_db"
            or request.query_params.get("export_source") == "db"
        )
        group_by_key = (request.query_params.get("group_by") or "none").lower().strip()
        selected_cols_raw = request.query_params.get("columns", "").strip()

        is_grouped = False
        headers = []
        rows = []

        if raw_db:
            db_fields = [
                "id",
                "session_id",
                "user_id",
                "channel",
                "dashboard_category",
                "outcome_type",
                "msg_count_total",
                "msg_count_bot_done",
                "msg_count_ccc",
                "msg_count_spam",
                "msg_count_pending",
                "msg_count_research",
                "msg_count_unclassified",
                "has_cskh_state",
                "has_cskh_request",
                "state_step",
                "contact_info",
                "contact_type",
                "reason",
                "first_question",
                "last_question",
                "full_conversation",
                "ticket_id",
                "started_at",
                "ended_at",
                "created_at",
                "updated_at",
            ]
            if selected_cols_raw and selected_cols_raw != "all":
                requested_keys = [c.strip() for c in selected_cols_raw.split(",") if c.strip()]
                active_db_fields = [f for f in db_fields if f in requested_keys]
            else:
                active_db_fields = db_fields

            if not active_db_fields:
                active_db_fields = db_fields

            headers = active_db_fields
            queryset = self.get_queryset()
            for item in queryset.values(*active_db_fields):
                row_data = []
                for field in active_db_fields:
                    val = item.get(field)
                    if isinstance(val, datetime):
                        val = val.strftime("%Y-%m-%d %H:%M:%S")
                    elif val is None:
                        val = ""
                    row_data.append(val)
                rows.append(row_data)
        else:
            is_grouped = group_by_key in self.GROUPBY_DIMENSIONS

            if is_grouped:
                dim_label = self.GROUPBY_DIMENSIONS[group_by_key][0]
                col_defs = [
                    ("group_key", dim_label),
                    *self.GROUPED_COLUMN_DEFINITIONS[1:],
                ]
            else:
                col_defs = self.COLUMN_DEFINITIONS

            if selected_cols_raw and selected_cols_raw != "all":
                requested_keys = [c.strip() for c in selected_cols_raw.split(",") if c.strip()]
                active_cols = [col for col in col_defs if col[0] in requested_keys]
            else:
                active_cols = col_defs

            if not active_cols:
                active_cols = col_defs

            headers = [col[1] for col in active_cols]
            queryset = self.get_queryset()

            if is_grouped:
                grand_total_sessions = queryset.count() or 1

                if group_by_key == "date":
                    annotated = (
                        queryset.annotate(group_val=TruncDate("started_at"))
                        .values("group_val")
                        .annotate(
                            total_sessions=Count("id"),
                            bot_done_count=Count("id", filter=Q(outcome_type="BOT_DONE")),
                            ccc_count=Count("id", filter=Q(outcome_type="CCC")),
                            pending_count=Count("id", filter=Q(outcome_type="PENDING")),
                            research_count=Count("id", filter=Q(outcome_type="RESEARCH")),
                            spam_count=Count("id", filter=Q(outcome_type="SPAM")),
                            unclassified_count=Count("id", filter=Q(outcome_type="UNCLASSIFIED")),
                            total_messages=Sum("msg_count_total"),
                        )
                        .order_by("-group_val")
                    )
                else:
                    field_name = self.GROUPBY_DIMENSIONS[group_by_key][1]
                    annotated = (
                        queryset.values(group_val=F(field_name))
                        .annotate(
                            total_sessions=Count("id"),
                            bot_done_count=Count("id", filter=Q(outcome_type="BOT_DONE")),
                            ccc_count=Count("id", filter=Q(outcome_type="CCC")),
                            pending_count=Count("id", filter=Q(outcome_type="PENDING")),
                            research_count=Count("id", filter=Q(outcome_type="RESEARCH")),
                            spam_count=Count("id", filter=Q(outcome_type="SPAM")),
                            unclassified_count=Count("id", filter=Q(outcome_type="UNCLASSIFIED")),
                            total_messages=Sum("msg_count_total"),
                        )
                        .order_by("-total_sessions")
                    )

                for item in annotated:
                    raw_val = item["group_val"]
                    if group_by_key == "outcome":
                        group_label = self.OUTCOME_LABELS.get(raw_val, raw_val or "Khác")
                    elif group_by_key == "channel":
                        group_label = str(raw_val or "").upper() if raw_val else "KHÔNG XÁC ĐỊNH"
                    elif group_by_key == "date":
                        group_label = raw_val.strftime("%d/%m/%Y") if raw_val else "Chưa xác định"
                    else:
                        group_label = str(raw_val or "Chưa phân loại")

                    total_sess = item["total_sessions"] or 0
                    bot_done = item["bot_done_count"] or 0
                    ccc_cnt = item["ccc_count"] or 0
                    tot_msgs = item["total_messages"] or 0

                    share_pct = round((total_sess / grand_total_sessions * 100), 1)
                    self_service_pct = round((bot_done / total_sess * 100), 1) if total_sess > 0 else 0.0
                    ccc_transfer_pct = round((ccc_cnt / total_sess * 100), 1) if total_sess > 0 else 0.0
                    avg_msgs = round(tot_msgs / total_sess, 1) if total_sess > 0 else 0.0

                    row_data = []
                    for col_key, _ in active_cols:
                        if col_key == "group_key":
                            row_data.append(group_label)
                        elif col_key == "total_sessions":
                            row_data.append(total_sess)
                        elif col_key == "percent_share":
                            row_data.append(f"{share_pct}%")
                        elif col_key == "bot_done_count":
                            row_data.append(bot_done)
                        elif col_key == "ccc_count":
                            row_data.append(ccc_cnt)
                        elif col_key == "pending_count":
                            row_data.append(item["pending_count"] or 0)
                        elif col_key == "research_count":
                            row_data.append(item["research_count"] or 0)
                        elif col_key == "spam_count":
                            row_data.append(item["spam_count"] or 0)
                        elif col_key == "unclassified_count":
                            row_data.append(item["unclassified_count"] or 0)
                        elif col_key == "self_service_rate":
                            row_data.append(f"{self_service_pct}%")
                        elif col_key == "ccc_transfer_rate":
                            row_data.append(f"{ccc_transfer_pct}%")
                        elif col_key == "total_messages":
                            row_data.append(tot_msgs)
                        elif col_key == "avg_messages":
                            row_data.append(avg_msgs)
                        else:
                            row_data.append("")
                    rows.append(row_data)
            else:
                for item in queryset:
                    row_data = []
                    ticket = item.ticket
                    for col_key, _ in active_cols:
                        if col_key == "session_id":
                            val = item.session_id or ""
                        elif col_key == "ticket_code":
                            val = ticket.ticket_code if ticket else ""
                        elif col_key == "ticket_status":
                            val = (
                                ticket.current_status.status_name
                                if (ticket and ticket.current_status)
                                else ("Mở" if item.outcome_type == "CCC" else "")
                            )
                        elif col_key == "channel":
                            val = (item.channel or "").upper()
                        elif col_key == "outcome_type":
                            val = self.OUTCOME_LABELS.get(item.outcome_type, item.outcome_type or "")
                        elif col_key == "dashboard_category":
                            val = item.dashboard_category or "Chưa phân loại"
                        elif col_key == "contact_info":
                            val = item.contact_info or ""
                        elif col_key == "reason":
                            val = item.reason or ""
                        elif col_key == "last_question":
                            val = item.last_question or ""
                        elif col_key == "msg_count_total":
                            val = item.msg_count_total or 0
                        elif col_key == "started_at":
                            val = item.started_at.strftime("%d/%m/%Y %H:%M:%S") if item.started_at else ""
                        elif col_key == "ended_at":
                            val = item.ended_at.strftime("%d/%m/%Y %H:%M:%S") if item.ended_at else ""
                        else:
                            val = ""
                        row_data.append(val)
                    rows.append(row_data)

        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        filename_prefix = f"Chatbot_Grouped_{group_by_key}" if is_grouped else "Chatbot_Export"

        if export_format == "csv":
            response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{timestamp}.csv"'
            writer = csv.writer(response)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(row)
            return response
        else:
            from openpyxl import Workbook
            from openpyxl.styles import Font

            wb = Workbook()
            ws = wb.active
            ws.title = f"Grouped by {group_by_key}" if is_grouped else "Chatbot Sessions"
            ws.append(headers)

            bold_font = Font(bold=True)
            for cell in ws[1]:
                cell.font = bold_font

            for row in rows:
                ws.append(row)

            output = io.BytesIO()
            wb.save(output)
            response = HttpResponse(
                output.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{timestamp}.xlsx"'
            return response


