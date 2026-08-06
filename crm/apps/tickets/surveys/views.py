"""API cho màn hình Khảo sát CSAT."""

from django.db.models import Exists, OuterRef, Q
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.accounts.scopes import filter_tickets_by_user
from apps.tickets.models import (
    SurveyEntrySource,
    SurveySendStatus,
    Ticket,
    TicketSurveyLog,
)
from apps.tickets.surveys.dashboard import (
    build_survey_dashboard,
    scoped_survey_logs,
)
from apps.tickets.surveys.permissions import CanEnterSurvey
from apps.tickets.surveys.serializers import (
    SurveyImportCommitSerializer,
    SurveyTicketOptionSerializer,
    TicketSurveyAuditLogSerializer,
    TicketSurveyCreateSerializer,
    TicketSurveyLogSerializer,
    TicketSurveyUpdateSerializer,
)
from apps.tickets.surveys.services import (
    SurveyAlreadyCompleted,
    day_bounds,
    month_bounds,
    read_survey_rows,
    record_survey,
    update_survey,
)

# Trần số ticket gợi ý cho một dòng. Phạm vi tìm là cả tháng nên một khách
# lớn có thể có vài chục ticket; cắt ở 50 để danh sách còn chọn được bằng mắt
# mà không phải phân trang.
MAX_TICKET_OPTIONS = 50


class SurveyPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


def _parse_month(value):
    """``YYYY-MM`` -> ngày đầu tháng. Chuỗi hỏng thì trả ``None``."""
    text = (value or "").strip()

    if not text:
        return None

    return parse_date(f"{text}-01")


def _successful_survey_exists():
    """Subquery: ticket đã có lần gửi thành công chưa."""
    return Exists(
        TicketSurveyLog.objects.filter(
            ticket=OuterRef("pk"),
            send_status=SurveySendStatus.SUCCESS,
        )
    )


class TicketSurveyViewSet(viewsets.ModelViewSet):
    """
    Kết quả khảo sát CSAT gắn với ticket.

    Sửa được nhưng mọi lần sửa đều để lại vết trong ``TicketSurveyAuditLog``.
    Không cho xoá: dòng nhập sai thì sửa lại, còn xoá hẳn khiến số liệu CSAT
    của một kỳ đã chốt đổi mà không ai biết vì sao.
    """

    # Xem theo phạm vi ticket; nhập và sửa thì chỉ admin và CCC.
    permission_classes = [CanEnterSurvey]
    serializer_class = TicketSurveyLogSerializer
    pagination_class = SurveyPagination
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        # Chỉ thấy khảo sát của những ticket mình được phép xem.
        tickets = filter_tickets_by_user(Ticket.objects.all(), self.request.user)

        queryset = (
            TicketSurveyLog.objects.filter(ticket__in=tickets)
            .select_related("ticket", "customer", "created_by_user")
            .order_by("-sent_at", "-id")
        )

        params = self.request.query_params

        # Tab "Kết quả khảo sát" trong màn ticket chỉ cần lịch sử của một
        # ticket, không phải cả danh sách.
        ticket_id = params.get("ticket")
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)

        send_status = params.get("send_status")
        if send_status:
            queryset = queryset.filter(send_status=send_status)

        start_date = parse_date(params.get("start_date") or "")
        if start_date:
            queryset = queryset.filter(sent_at__gte=day_bounds(start_date)[0])

        end_date = parse_date(params.get("end_date") or "")
        if end_date:
            queryset = queryset.filter(sent_at__lt=day_bounds(end_date)[1])

        rated = params.get("rated")
        if rated == "true":
            queryset = queryset.filter(rating_score__isnull=False)
        elif rated == "false":
            queryset = queryset.filter(rating_score__isnull=True)

        # Lọc theo từng cột, giống bảng ticket. "unrated" là một lựa chọn
        # riêng chứ không phải điểm: để trống nghĩa là khách chưa phản hồi,
        # khác hẳn với chấm 0 điểm.
        rating = (params.get("rating") or "").strip()
        if rating == "unrated":
            queryset = queryset.filter(rating_score__isnull=True)
        elif rating.isdigit():
            queryset = queryset.filter(rating_score=int(rating))

        ticket_code = (params.get("ticket_code") or "").strip()
        if ticket_code:
            queryset = queryset.filter(ticket__ticket_code__icontains=ticket_code)

        customer = (params.get("customer") or "").strip()
        if customer:
            # Tên gõ lúc nhập và tên khách trong CRM có thể khác nhau, tra cả
            # hai để người dùng gõ tên nào cũng ra.
            queryset = queryset.filter(
                Q(customer_name_text__icontains=customer)
                | Q(customer__full_name__icontains=customer)
            )

        phone = (params.get("phone") or "").strip()
        if phone:
            queryset = queryset.filter(phone__icontains=phone)

        created_by = (params.get("created_by") or "").strip()
        if created_by:
            queryset = queryset.filter(
                Q(created_by_user__username__icontains=created_by)
                | Q(created_by_user__first_name__icontains=created_by)
                | Q(created_by_user__last_name__icontains=created_by)
            )

        entry_source = (params.get("entry_source") or "").strip()
        if entry_source:
            queryset = queryset.filter(entry_source=entry_source)

        keyword = (params.get("q") or "").strip()
        if keyword:
            queryset = queryset.filter(
                Q(ticket__ticket_code__icontains=keyword)
                | Q(customer_name_text__icontains=keyword)
                | Q(customer__full_name__icontains=keyword)
                | Q(phone__icontains=keyword)
            )

        return queryset

    def create(self, request):
        serializer = TicketSurveyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket = self._get_ticket_or_404(data["ticket"])

        if ticket is None:
            return Response(
                {"detail": "Không tìm thấy ticket hoặc bạn không có quyền xem."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            log = record_survey(
                ticket=ticket,
                entry_source=SurveyEntrySource.MANUAL,
                created_by_user=request.user,
                **{k: v for k, v in data.items() if k != "ticket"},
            )
        except SurveyAlreadyCompleted as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(
            TicketSurveyLogSerializer(log).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, pk=None):
        """Sửa một dòng khảo sát; ai sửa và sửa gì được ghi lại."""
        log = self.get_object()

        serializer = TicketSurveyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        fields = dict(serializer.validated_data)
        note = fields.pop("note", "")

        try:
            log = update_survey(
                log=log,
                changed_by_user=request.user,
                note=note,
                **fields,
            )
        except SurveyAlreadyCompleted as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(TicketSurveyLogSerializer(log).data)

    @action(detail=True, methods=["get"], url_path="audit-logs")
    def audit_logs(self, request, pk=None):
        """Nhật ký chỉnh sửa của một dòng khảo sát."""
        log = self.get_object()
        logs = log.audit_logs.select_related("changed_by_user").all()

        return Response(TicketSurveyAuditLogSerializer(logs, many=True).data)

    def _visible_tickets(self):
        return filter_tickets_by_user(Ticket.objects.all(), self.request.user)

    def _get_ticket_or_404(self, ticket_id):
        return (
            self._visible_tickets()
            .select_related("customer")
            .filter(pk=ticket_id)
            .first()
        )

    def _find_tickets(self, customer_name="", phone="", in_month=None):
        """
        Ticket của một khách trong tháng gửi khảo sát.

        Phạm vi là cả tháng chứ không phải đúng ngày gửi: khảo sát thường
        được gửi vài ngày sau khi ticket đóng, khoá đúng ngày thì tra không
        ra ticket nào dù khách có ticket thật trong tháng. Trả về danh sách
        để người nhập chọn — không tự đoán ngay cả khi chỉ khớp một ticket.
        """
        queryset = self._visible_tickets().select_related(
            "customer", "current_status", "support_category"
        )

        matcher = Q()

        if customer_name:
            matcher |= Q(customer__full_name__icontains=customer_name)

        if phone:
            # Ticket không có cột số điện thoại riêng trên nhánh này, chỉ tra
            # được qua khách hàng đã nối.
            matcher |= Q(customer__phone=phone)

        if not matcher:
            return queryset.none()

        queryset = queryset.filter(matcher)

        if in_month is not None:
            start, end = month_bounds(in_month)
            queryset = queryset.filter(created_at__gte=start, created_at__lt=end)

        return queryset.annotate(has_survey=_successful_survey_exists()).order_by(
            "-created_at", "-id"
        )[:MAX_TICKET_OPTIONS]

    @staticmethod
    def _serialize_options(tickets):
        return SurveyTicketOptionSerializer(
            [
                {
                    "id": ticket.id,
                    "ticket_code": ticket.ticket_code,
                    "title": ticket.title or "",
                    "customer_id": ticket.customer_id,
                    "customer_name": (
                        ticket.customer.full_name if ticket.customer else ""
                    ),
                    "customer_phone": (
                        ticket.customer.phone if ticket.customer else ""
                    ),
                    "support_category": (
                        ticket.support_category.category_name
                        if ticket.support_category_id
                        else ""
                    ),
                    "status_name": (
                        ticket.current_status.status_name
                        if ticket.current_status_id
                        else ""
                    ),
                    "created_at": ticket.created_at,
                    "has_survey": getattr(ticket, "has_survey", False),
                }
                for ticket in tickets
            ],
            many=True,
        ).data

    @action(detail=False, methods=["get"], url_path="ticket-options")
    def ticket_options(self, request):
        """
        Gõ tên khách -> ticket của khách đó trong tháng.

        Nhận ``month=YYYY-MM`` hoặc ``date=YYYY-MM-DD`` (lấy tháng của ngày
        đó). Người nhập tự gõ ngày gửi nên chuỗi gửi lên có thể còn dang dở;
        không đọc được thì bỏ lọc thời gian thay vì trả về rỗng.
        """
        params = request.query_params
        in_month = _parse_month(params.get("month")) or parse_date(
            params.get("date") or ""
        )

        tickets = self._find_tickets(
            customer_name=(params.get("customer_name") or "").strip(),
            phone=(params.get("phone") or "").strip(),
            in_month=in_month,
        )

        return Response({"results": self._serialize_options(tickets)})

    @action(detail=False, methods=["post"], url_path="import-preview")
    def import_preview(self, request):
        """
        Đọc file khảo sát và gợi ý ticket cho từng dòng.

        Không ghi gì xuống DB — người nhập xem, chọn ticket cho từng dòng rồi
        mới gửi sang ``import-commit``.
        """
        upload = request.FILES.get("file")

        if upload is None:
            return Response(
                {"detail": "Chưa chọn file khảo sát."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rows = read_survey_rows(upload)
        except Exception:
            return Response(
                {"detail": "Không đọc được file. Cần file Excel (.xlsx)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []

        for row in rows:
            options = self._find_tickets(
                customer_name=row["customer_name_text"],
                phone=row["phone"],
                in_month=row.get("sent_at"),
            )
            serialized = self._serialize_options(options)
            selectable = [item for item in serialized if not item["has_survey"]]

            results.append(
                {
                    **row,
                    "ticket_options": serialized,
                    # Chỉ gợi ý sẵn khi đúng một ticket còn khảo sát được;
                    # nhiều hơn thì để trống, buộc người nhập tự chọn.
                    "suggested_ticket": (
                        selectable[0]["id"] if len(selectable) == 1 else None
                    ),
                }
            )

        return Response({"count": len(results), "results": results})

    @action(detail=False, methods=["post"], url_path="import-commit")
    def import_commit(self, request):
        """Ghi các dòng đã được gán ticket. Dòng lỗi không chặn dòng còn lại."""
        serializer = SurveyImportCommitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created = []
        errors = []

        for row in serializer.validated_data["rows"]:
            row = dict(row)
            row_number = row.pop("row_number", None)
            ticket = self._get_ticket_or_404(row.pop("ticket"))

            if ticket is None:
                errors.append(
                    {
                        "row_number": row_number,
                        "detail": "Không tìm thấy ticket hoặc không có quyền xem.",
                    }
                )
                continue

            try:
                log = record_survey(
                    ticket=ticket,
                    entry_source=SurveyEntrySource.IMPORT,
                    created_by_user=request.user,
                    **row,
                )
            except SurveyAlreadyCompleted as exc:
                errors.append({"row_number": row_number, "detail": str(exc)})
                continue

            created.append(log.id)

        return Response(
            {
                "created_count": len(created),
                "error_count": len(errors),
                "errors": errors,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        Số liệu CSAT của một kỳ, kèm kỳ liền trước để so sánh.

        Không dùng ``get_queryset()``: bộ lọc từ khoá / tình trạng của màn
        danh sách không được đụng vào số liệu tổng hợp — lọc "Thất bại" rồi
        thấy CSAT 0% thì tưởng chất lượng sập.
        """
        params = request.query_params

        return Response(
            build_survey_dashboard(
                scoped_survey_logs(self._visible_tickets()),
                granularity=params.get("granularity"),
                period_value=params.get("period"),
                start_text=params.get("start_date"),
                end_text=params.get("end_date"),
            )
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Vài con số cho đầu trang: tổng gửi, thành công, đã chấm điểm, CSAT."""
        queryset = self.get_queryset()
        rated = [
            score
            for score in queryset.filter(
                send_status=SurveySendStatus.SUCCESS,
                rating_score__isnull=False,
            ).values_list("rating_score", flat=True)
        ]

        total = queryset.count()
        success = queryset.filter(send_status=SurveySendStatus.SUCCESS).count()

        return Response(
            {
                "total": total,
                "success": success,
                "failed": total - success,
                "rated": len(rated),
                "average_score": (
                    round(sum(rated) / len(rated), 2) if rated else None
                ),
            }
        )
