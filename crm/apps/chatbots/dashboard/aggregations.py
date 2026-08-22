"""Các truy vấn aggregate nhỏ, độc lập theo section của dashboard chatbot."""

from django.db.models import Count, Max, Q, Subquery, Sum
from django.db.models.functions import ExtractHour

from apps.chatbots.constants import (
    CUSTOMER_SENDER_TYPES,
    QUESTION_TYPE_CUSTOMER_CARE,
    NON_FAQ_QUESTION_TYPES,
    UNCATEGORIZED_LABEL,
    category_label,
    channel_label,
    normalize_category,
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
OUTCOME_RESEARCH = ChatbotSessionSummary.OUTCOME_RESEARCH
OUTCOME_SPAM = ChatbotSessionSummary.OUTCOME_SPAM
OUTCOME_UNCLASSIFIED = ChatbotSessionSummary.OUTCOME_UNCLASSIFIED
OUTCOME_PENDING = ChatbotSessionSummary.OUTCOME_PENDING

# Nhóm có chủ đề để so bot với CCC. RESEARCH đứng ngoài vì chatbot không gán
# category cho câu phân tích, đưa vào chỉ làm phình nhóm "Chưa phân loại".
TOPIC_OUTCOMES = (OUTCOME_BOT_DONE, OUTCOME_CCC)

# Ngưỡng cho biểu đồ so sánh bot vs CCC theo chủ đề. Chủ đề chỉ 1-2 phiên mà
# 100% chuyển CCC không nói lên bot yếu, chỉ nói lên mẫu quá nhỏ; giới hạn số
# chủ đề vẽ ra để các cột không bị bóp lại đến mức không đọc được.
TOPIC_COMPARISON_MIN_VOLUME = 5
TOPIC_COMPARISON_LIMIT = 8

# Bốn nhóm xử lý phiên: mã trong DB -> tên cột đếm -> nhãn hiển thị.
# Một bảng duy nhất để KPI, biểu đồ theo kỳ và biểu đồ so sánh không trôi
# nhãn khác nhau; thêm nhóm mới chỉ phải khai báo ở đây.
OUTCOME_SERIES = (
    (OUTCOME_BOT_DONE, "bot_done", "Chatbot tự xử lý"),
    (OUTCOME_CCC, "ccc", "Chuyển CCC xử lý"),
    (OUTCOME_RESEARCH, "research", "Phân tích / khuyến nghị"),
    (OUTCOME_PENDING, "pending", "Chờ thông tin khách hàng"),
    (OUTCOME_SPAM, "spam", "Câu hỏi rác"),
    (OUTCOME_UNCLASSIFIED, "unclassified", "Chưa xác định loại"),
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
        date_field="started_at",
        extra_annotations=None,
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

        # Bảng phiên đếm theo started_at và có outcome_type; bảng log đếm theo
        # external_created_at và không có cột đó, nên cả hai đều truyền vào.
        if extra_annotations is None:
            extra_annotations = {
                "ccc": Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            }

        rows = (
            queryset.filter(**{f"{date_field}__isnull": False})
            .annotate(period=period_trunc(granularity, date_field))
            .values("period", dimension)
            .annotate(total=Count("id"), **extra_annotations)
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
    # Nhóm truy vấn chạy trên BẢNG LOG (mức từng lượt hỏi)
    #
    # Khác nhóm chạy trên bảng phiên: một phiên chỉ mang đúng một
    # dashboard_category (chủ đề trội nhất), còn ở đây mỗi lượt hỏi được tính
    # riêng nên phản ánh đúng "khách hỏi bao nhiêu lần về chủ đề này".
    # Cả hai nguồn xpro_chat_logs và chat_questions đổ chung một bảng nên
    # không phải tách truy vấn theo nền tảng.
    # ------------------------------------------------------------------
    def _classified_logs(self):
        """
        Lượt của khách ĐÃ được chatbot gán questionType.

        Bỏ dòng để trống: đó là dữ liệu nguồn còn thiếu, không phải một thể
        loại câu hỏi. Muốn biết còn bao nhiêu dòng chưa gán thì tra thẳng
        bảng log, đừng để nó chiếm một cột trong biểu đồ phân loại.
        """
        return (
            self._customer_logs()
            .exclude(questionType__isnull=True)
            .exclude(questionType__exact="")
        )

    def _customer_logs(self):
        """
        Lượt hỏi do KHÁCH gửi.

        Nguồn xpro ghi mỗi dòng là trọn một cặp hỏi - đáp và để trống
        sender_type, nên dòng nào cũng tính. Nguồn chat_questions ghi mỗi tin
        nhắn một dòng nên phải loại tin của bot và nhân viên — không loại thì
        chúng dồn vào nhóm "Chưa gán loại" và thổi phồng nhóm đó.
        """
        return self.logs.filter(
            Q(sender_type__isnull=True)
            | Q(sender_type="")
            | Q(sender_type__iregex=r"^(" + "|".join(CUSTOMER_SENDER_TYPES) + r")$")
        )

    def _logs_with_category(self, only_customer_care=False):
        """Lượt hỏi đã được chatbot gán chủ đề."""
        logs = self._customer_logs().exclude(category__isnull=True).exclude(
            category__exact=""
        )

        if only_customer_care:
            logs = logs.filter(questionType__iexact=QUESTION_TYPE_CUSTOMER_CARE)

        return logs

    def _ccc_session_ids(self):
        """Phiên đã xin được thông tin khách (có dòng trong cskh_requests)."""
        return Subquery(
            self.summaries.filter(outcome_type=OUTCOME_CCC).values("session_id")
        )

    def build_topic_bar(self):
        """Số LƯỢT hỏi theo chủ đề, gom từ cột category của cả hai bảng log."""
        merged = {}

        for row in self._logs_with_category().values("category").annotate(
            value=Count("id")
        ):
            name = category_label(row["category"])
            merged[name] = merged.get(name, 0) + (row["value"] or 0)

        return [
            {"name": name, "value": value}
            for name, value in sorted(
                merged.items(), key=lambda item: item[1], reverse=True
            )
            if value
        ]

    def build_topic_bar_by_period(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self._logs_with_category(),
            "category",
            label_of=category_label,
            fallback=(UNCATEGORIZED_LABEL,),
            date_field="external_created_at",
            extra_annotations={},
        )

    def build_category_ccc_counts(self):
        """
        Số lượt chuyển CCC theo chủ đề.

        Chỉ tính lượt CUSTOMER_CARE: đó là câu hỏi nghiệp vụ thật, cũng là loại
        duy nhất được chatbot gán chủ đề một cách nhất quán. Một lượt được coi
        là "chuyển CCC" khi phiên chứa nó đã xin được thông tin khách hàng.
        """
        ccc_sessions = self._ccc_session_ids()
        merged = {}

        for row in (
            self._logs_with_category(only_customer_care=True)
            .values("category")
            .annotate(
                total=Count("id"),
                ccc=Count("id", filter=Q(session_id__in=ccc_sessions)),
            )
        ):
            name = category_label(row["category"])
            item = merged.setdefault(name, {"name": name, "total": 0, "ccc": 0})
            item["total"] += row["total"] or 0
            item["ccc"] += row["ccc"] or 0

        return sorted(
            (
                {**item, "rate": self.rate(item["ccc"], item["total"], digits=1)}
                for item in merged.values()
                if item["total"]
            ),
            key=lambda item: (-item["ccc"], -item["rate"]),
        )

    def build_category_ccc_by_period(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self._logs_with_category(only_customer_care=True),
            "category",
            label_of=category_label,
            fallback=(UNCATEGORIZED_LABEL,),
            value_field="ccc",
            date_field="external_created_at",
            extra_annotations={
                "ccc": Count("id", filter=Q(session_id__in=self._ccc_session_ids())),
            },
        )

    # ------------------------------------------------------------------
    # Thể loại câu hỏi (questionType)
    # ------------------------------------------------------------------
    # Nhãn tiếng Việt cho các giá trị questionType đã biết. Giá trị lạ (gõ sai
    # từ n8n, ví dụ "GEETING") giữ nguyên để nhìn ra ngay mà đi sửa nguồn.
    # Giữ nguyên mã thô. Biểu đồ này để soi chất lượng dữ liệu nguồn, nên hiện
    # đúng chữ n8n ghi xuống thì mới nhìn ra giá trị sai (GEETING, HIHI...).
    # Khác OUTCOME_SERIES: nhãn ở đó vừa hiển thị vừa làm khóa tra màu bên
    # frontend nên phải giữ tiếng Việt.
    QUESTION_TYPE_LABELS = {}

    UNKNOWN_QUESTION_TYPE_LABEL = "Chưa gán loại"

    @classmethod
    def question_type_label(cls, value):
        code = str(value or "").strip().upper()

        if not code:
            return cls.UNKNOWN_QUESTION_TYPE_LABEL

        return cls.QUESTION_TYPE_LABELS.get(code, code)

    def build_question_type_bar(self):
        """
        Khách hỏi những loại gì, tách theo NỀN TẢNG.

        Tách theo cột platform chứ không phải theo bảng nguồn: bảng
        xpro_chat_logs chứa lẫn cả xpro, website, mobile và một ít zalo, nên
        chia theo bảng thì gộp nhầm bốn nền tảng làm một.

        Tách ra mới thấy nền tảng nào chatbot gán questionType không đều —
        thiếu ở đâu là lộ ngay ở chiều dài cột.
        """
        merged = {}
        sources = set()

        for row in self._classified_logs().values(
            "questionType", "channel"
        ).annotate(value=Count("id")):
            name = self.question_type_label(row["questionType"])
            source = channel_label(row["channel"])
            sources.add(source)

            item = merged.setdefault(name, {"name": name, "value": 0})
            item["value"] += row["value"] or 0
            item[source] = item.get(source, 0) + (row["value"] or 0)

        ordered = sorted(merged.values(), key=lambda item: item["value"], reverse=True)

        return {
            "sources": sorted(sources),
            "items": [
                {**item, **{src: item.get(src, 0) for src in sources}}
                for item in ordered
            ],
        }

    def build_question_type_by_period(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self._classified_logs(),
            "questionType",
            label_of=self.question_type_label,
            fallback=(self.UNKNOWN_QUESTION_TYPE_LABEL,),
            date_field="external_created_at",
            extra_annotations={},
        )

    # ------------------------------------------------------------------
    # Thời lượng phiên
    # ------------------------------------------------------------------
    @staticmethod
    def _median(values):
        if not values:
            return 0.0

        ordered = sorted(values)
        middle = len(ordered) // 2

        if len(ordered) % 2:
            return ordered[middle]

        return (ordered[middle - 1] + ordered[middle]) / 2

    def _session_durations_by_channel(self):
        """
        Thời lượng từng phiên (phút), gom theo nền tảng.

        Phiên thiếu started_at hoặc ended_at bị loại — không đo được thì đừng
        đoán. Phiên chỉ có một lượt có thời lượng bằng 0 và VẪN được tính:
        đó là dữ liệu thật (khách hỏi một câu rồi thôi), bỏ đi sẽ làm mọi con
        số đẹp lên một cách giả tạo.
        """
        buckets = {}

        rows = self.summaries.filter(
            started_at__isnull=False,
            ended_at__isnull=False,
        ).values_list("channel", "started_at", "ended_at")

        for channel, started_at, ended_at in rows:
            minutes = (ended_at - started_at).total_seconds() / 60

            if minutes < 0:
                continue

            buckets.setdefault(channel_label(channel), []).append(minutes)

        return buckets

    def build_session_duration_by_channel(self):
        """
        Thời lượng phiên theo nền tảng: trung bình VÀ trung vị.

        Phải có cả hai. Dữ liệu thực tế lệch rất nặng — một phiên kéo dài
        nhiều ngày đủ để đẩy trung bình lên gấp vài chục lần trung vị, và ai
        đọc mỗi trung bình sẽ tưởng khách trò chuyện hàng giờ.
        """
        items = []

        for name, values in self._session_durations_by_channel().items():
            items.append(
                {
                    "name": name,
                    "session_count": len(values),
                    "avg_minutes": round(sum(values) / len(values), 1),
                    "median_minutes": round(self._median(values), 1),
                    "max_minutes": round(max(values), 1),
                    # Phiên một lượt: hỏi xong là hết, không có "thời lượng".
                    "single_turn_count": sum(1 for value in values if value == 0),
                }
            )

        return sorted(items, key=lambda item: item["session_count"], reverse=True)

    def build_session_duration_by_period(self, granularity="month"):
        """Trung vị thời lượng theo từng kỳ, mỗi nền tảng một đường."""
        granularity = normalize_granularity(granularity)

        period_labels = {}
        buckets = {}
        channel_totals = {}

        rows = self.summaries.filter(
            started_at__isnull=False,
            ended_at__isnull=False,
        ).annotate(period=period_trunc(granularity)).values_list(
            "period", "channel", "started_at", "ended_at"
        )

        for period, channel, started_at, ended_at in rows:
            if not period:
                continue

            minutes = (ended_at - started_at).total_seconds() / 60

            if minutes < 0:
                continue

            key = period_key(granularity, period)
            period_labels[key] = period_label(granularity, period)

            name = channel_label(channel)
            buckets.setdefault((key, name), []).append(minutes)
            channel_totals[name] = channel_totals.get(name, 0) + 1

        keys = sorted(period_labels)
        labels = [period_labels[key] for key in keys]
        names = sorted(channel_totals, key=lambda n: -channel_totals[n])

        return {
            "period_labels": labels,
            "items": [
                {
                    "name": name,
                    **{
                        label: (
                            round(self._median(buckets[(key, name)]), 1)
                            # Kỳ không có phiên nào của nền tảng đó trả None
                            # chứ không phải 0 — "không có dữ liệu" khác hẳn
                            # "phiên dài 0 phút".
                            if (key, name) in buckets
                            else None
                        )
                        for key, label in zip(keys, labels)
                    },
                }
                for name in names
            ],
        }

    # ------------------------------------------------------------------
    # Section: topics
    # ------------------------------------------------------------------
    def _category_bot_vs_ccc(
        self,
        limit=TOPIC_COMPARISON_LIMIT,
        min_volume=TOPIC_COMPARISON_MIN_VOLUME,
    ):
        """
        Cùng một chủ đề: bot tự xử lý xong bao nhiêu phiên, phải đẩy CCC bao nhiêu.

        Chỉ đếm BOT_DONE và CCC (bỏ SPAM/PENDING) để mẫu số đúng nghĩa "phiên
        có nghiệp vụ để xử lý".

        Phiên chưa gán chủ đề bị loại hẳn chứ không gom vào "Chưa phân loại":
        nguồn ``chatbot_chat_logs.category`` bỏ trống phần lớn các câu bot trả
        được (RESEARCH, hỏi đáp thị trường), nên nhóm đó lệch nặng về phía bot
        và vẽ chung sẽ át hết các chủ đề thật. Số phiên bị loại trả kèm để
        frontend ghi chú ngay dưới biểu đồ thay vì giấu đi.
        """
        merged = {}
        skipped_uncategorized = 0

        for row in (
            self.summaries.filter(outcome_type__in=TOPIC_OUTCOMES)
            .values("dashboard_category")
            .annotate(
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
        ):
            bot_done = row["bot_done"] or 0
            ccc = row["ccc"] or 0
            name = normalize_category(row["dashboard_category"])

            if not name:
                skipped_uncategorized += bot_done + ccc
                continue

            item = merged.setdefault(name, {"name": name, "bot_done": 0, "ccc": 0})
            item["bot_done"] += bot_done
            item["ccc"] += ccc

        ranked = []
        skipped_low_volume = 0

        for item in merged.values():
            total = item["bot_done"] + item["ccc"]

            if total < min_volume:
                skipped_low_volume += total
                continue

            ranked.append(
                {
                    **item,
                    "total": total,
                    "ccc_rate": self.rate(item["ccc"], total, digits=1),
                }
            )

        # Chủ đề bot đuối nhất lên đầu — đây là danh sách ưu tiên sửa kịch bản.
        # Hòa tỷ lệ thì chủ đề nhiều phiên hơn đứng trước vì sửa được nó gỡ
        # tải cho CCC nhiều hơn.
        ranked.sort(key=lambda item: (-item["ccc_rate"], -item["total"], item["name"]))

        return {
            "items": ranked[:limit],
            "min_volume": min_volume,
            "skipped_uncategorized": skipped_uncategorized,
            "skipped_low_volume": skipped_low_volume,
            "skipped_beyond_limit": sum(item["total"] for item in ranked[limit:]),
        }

    def _category_bot_vs_ccc_by_period(self, granularity, names):
        """
        Cùng bộ chủ đề của biểu đồ gộp, nhưng tách tỷ lệ chuyển CCC theo từng kỳ.

        Bản gộp chỉ trả lời "chủ đề nào bot đang đuối"; lọc 5 tháng mà xem số
        cộng dồn thì không biết bot đang khá lên hay tệ đi trên từng chủ đề.
        Giá trị vẽ ra là tỷ lệ % chứ không phải số phiên: số phiên theo kỳ đã
        có ở biểu đồ "Số lượt Chuyển CCC theo Category", và số tuyệt đối lên
        xuống theo lưu lượng nên không so được chất lượng bot giữa các kỳ.

        Danh sách chủ đề và thứ tự lấy nguyên từ bản gộp để mã CD1..CDn ở chú
        thích dưới biểu đồ khớp nhau giữa hai chế độ xem.

        Kỳ không có phiên nào của chủ đề trả về ``None`` chứ không phải 0 —
        0 nghĩa là "bot xử lý hết", không có dữ liệu là chuyện khác hẳn.
        """
        if not names:
            return {"period_labels": [], "items": []}

        granularity = normalize_granularity(granularity)
        wanted = set(names)

        period_labels = {}
        matrix = {}

        for row in (
            self.summaries.filter(
                outcome_type__in=TOPIC_OUTCOMES,
                started_at__isnull=False,
            )
            .annotate(period=period_trunc(granularity))
            .values("period", "dashboard_category")
            .annotate(
                bot_done=Count("id", filter=Q(outcome_type=OUTCOME_BOT_DONE)),
                ccc=Count("id", filter=Q(outcome_type=OUTCOME_CCC)),
            )
            .order_by("period")
        ):
            if not row["period"]:
                continue

            name = normalize_category(row["dashboard_category"])

            if name not in wanted:
                continue

            key = period_key(granularity, row["period"])
            period_labels[key] = period_label(granularity, row["period"])

            bucket = matrix.setdefault((key, name), {"bot_done": 0, "ccc": 0})
            bucket["bot_done"] += row["bot_done"] or 0
            bucket["ccc"] += row["ccc"] or 0

        keys = sorted(period_labels)
        labels = [period_labels[key] for key in keys]

        items = []

        for name in names:
            entry = {"name": name}

            for key, label in zip(keys, labels):
                bucket = matrix.get((key, name)) or {"bot_done": 0, "ccc": 0}
                bot_done = bucket["bot_done"]
                ccc = bucket["ccc"]
                total = bot_done + ccc

                entry[label] = self.rate(ccc, total, digits=1) if total else None
                entry[f"{label}__bot"] = bot_done
                entry[f"{label}__ccc"] = ccc
                entry[f"{label}__total"] = total

            items.append(entry)

        return {"period_labels": labels, "items": items}

    def build_topics_section(self, granularity="month"):
        bot_vs_ccc = self._category_bot_vs_ccc()

        return {
            "charts": {
                # BĐ3 và BĐ4 đếm theo LƯỢT HỎI trên cột category của hai bảng
                # log, không phải theo phiên: một phiên hỏi cùng chủ đề năm lần
                # thì đó là năm lượt quan tâm, gom về một là mất thông tin.
                "topic_bar": self.build_topic_bar(),
                "all_topic_multi_month": self.build_topic_bar_by_period(granularity),
                "category_ccc_rate": self.build_category_ccc_counts(),
                "ccc_multi_month_topics": self.build_category_ccc_by_period(
                    granularity
                ),
                "question_type_bar": self.build_question_type_bar(),
                "session_duration_by_channel": (
                    self.build_session_duration_by_channel()
                ),
                "session_duration_multi_period": (
                    self.build_session_duration_by_period(granularity)
                ),
                "question_type_multi_period": self.build_question_type_by_period(
                    granularity
                ),
                "category_bot_vs_ccc": bot_vs_ccc,
                "category_bot_vs_ccc_multi_period": (
                    self._category_bot_vs_ccc_by_period(
                        granularity,
                        [item["name"] for item in bot_vs_ccc["items"]],
                    )
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
        """
        Chủ đề của các phiên mà chatbot phải hỏi xin thông tin liên hệ.

        KHÔNG phải "phiên đã chuyển CCC". Điều kiện là có `reason`, mà reason
        được điền từ cskh_requests HOẶC cskh_state (dự phòng) — nên phiên
        PENDING (chatbot đã hỏi, khách chưa cho thông tin) cũng nằm trong đây.
        Vì vậy con số này luôn >= ô KPI "Chuyển CCC xử lý"; muốn đúng nghĩa
        chuyển CCC thì lọc thêm outcome_type=CCC.

        Gom theo `dashboard_category` chứ không phải `reason`: cùng một hệ nhãn
        với biểu đồ so sánh bot vs CCC đứng cạnh thì hai biểu đồ đọc ngang được,
        thay vì mỗi bên một hệ nhãn riêng.
        """
        merged = {}

        for row in (
            self._with_reason().values("dashboard_category").annotate(count=Count("id"))
        ):
            name = category_label(row["dashboard_category"])
            merged[name] = merged.get(name, 0) + (row["count"] or 0)

        ranked = sorted(merged.items(), key=lambda item: (-item[1], item[0]))

        return [{"name": name, "value": value} for name, value in ranked[:limit]]

    def _with_reason(self):
        """
        Phiên có ghi lý do cần người hỗ trợ.

        Gồm cả CCC (đã xin được liên hệ) lẫn PENDING (đã hỏi, khách chưa cho)
        — vì reason của summary lấy từ cskh_requests, thiếu thì lấy của
        cskh_state.
        """
        return self.summaries.exclude(reason__isnull=True).exclude(reason__exact="")

    def build_multi_period_reasons(self, granularity="month"):
        return self._period_matrix(
            granularity,
            self._with_reason(),
            "dashboard_category",
            label_of=category_label,
            fallback=(UNCATEGORIZED_LABEL,),
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
            self.logs.exclude(questionType__in=NON_FAQ_QUESTION_TYPES)
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
