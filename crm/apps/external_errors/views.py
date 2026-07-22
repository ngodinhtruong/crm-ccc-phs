from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.external_errors.models import (
    ExternalErrorCauseGroup,
    ExternalErrorCode,
    ExternalErrorDashboardWidget,
    ExternalErrorGroup,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.permissions import (
    ExternalErrorPermission,
    can_classify_external_errors,
    can_import_external_errors,
    can_view_external_errors,
)
from apps.external_errors.serializers import (
    ExternalErrorBulkClassifySerializer,
    ExternalErrorCauseGroupSerializer,
    ExternalErrorCodeSerializer,
    ExternalErrorConfirmCauseSerializer,
    ExternalErrorConfirmClassificationSerializer,
    ExternalErrorDashboardWidgetSerializer,
    ExternalErrorExcelImportSerializer,
    ExternalErrorGroupSerializer,
    ExternalErrorImportBatchSerializer,
    ExternalErrorManualCreateSerializer,
    ExternalErrorRawImportSerializer,
    ExternalErrorRecordListSerializer,
    ExternalErrorRecordSerializer,
)
from apps.external_errors.services.analytics import (
    apply_external_error_filters,
    build_summary,
    group_by,
    recurring,
    stacked,
    trend,
)
from apps.external_errors.services.bedrock_cause_classifier import (
    classify_queryset_causes,
    classify_record_cause,
)
from apps.external_errors.services.bedrock_classifier import (
    classify_queryset,
    classify_record,
)
from apps.external_errors.services.importer import (
    create_manual_record,
    import_and_optionally_classify,
    import_excel_file,
)

from apps.external_errors.tasks import (
    classify_external_error_batch,
)

class ExternalErrorGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalErrorGroupSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get_queryset(self):
        queryset = (
            ExternalErrorGroup.objects
            .annotate(error_code_count=Count("error_codes"))
            .order_by("sort_order", "id")
        )

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            queryset = queryset.filter(
                Q(group_code__icontains=q)
                | Q(group_name__icontains=q)
                | Q(description__icontains=q)
            )

        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in {"true", "1"}:
            queryset = queryset.filter(is_active=True)
        elif str(is_active).lower() in {"false", "0"}:
            queryset = queryset.filter(is_active=False)

        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class ExternalErrorCodeViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalErrorCodeSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get_queryset(self):
        queryset = (
            ExternalErrorCode.objects
            .select_related("group")
            .order_by("group__sort_order", "sort_order", "id")
        )

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            queryset = queryset.filter(
                Q(error_code__icontains=q)
                | Q(error_name__icontains=q)
                | Q(description__icontains=q)
                | Q(group__group_name__icontains=q)
            )

        group_id = self.request.query_params.get("group")
        if group_id:
            queryset = queryset.filter(group_id=group_id)

        group_code = self.request.query_params.get("group_code")
        if group_code:
            queryset = queryset.filter(
                group__group_code__iexact=group_code
            )

        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in {"true", "1"}:
            queryset = queryset.filter(is_active=True)
        elif str(is_active).lower() in {"false", "0"}:
            queryset = queryset.filter(is_active=False)

        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class ExternalErrorCauseGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalErrorCauseGroupSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get_queryset(self):
        queryset = (
            ExternalErrorCauseGroup.objects
            .annotate(record_count=Count("records"))
            .order_by("sort_order", "id")
        )

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            queryset = queryset.filter(
                Q(cause_code__icontains=q)
                | Q(cause_name__icontains=q)
                | Q(description__icontains=q)
            )

        is_active = self.request.query_params.get("is_active")
        if str(is_active).lower() in {"true", "1"}:
            queryset = queryset.filter(is_active=True)
        elif str(is_active).lower() in {"false", "0"}:
            queryset = queryset.filter(is_active=False)

        return queryset

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class ExternalErrorImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        ExternalErrorImportBatch.objects
        .select_related("created_by")
        .all()
    )
    serializer_class = ExternalErrorImportBatchSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]


class ExternalErrorRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get_queryset(self):
        queryset = ExternalErrorRecord.objects.select_related(
            "batch",
            "error_code",
            "error_code__group",
            "cause_group",
            "created_by",
            "updated_by",
        )
        return apply_external_error_filters(
            queryset,
            self.request.query_params,
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ExternalErrorRecordListSerializer
        if self.action == "create":
            return ExternalErrorManualCreateSerializer
        return ExternalErrorRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            record = create_manual_record(
                data=serializer.validated_data,
                created_by=request.user,
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        if serializer.validated_data.get("auto_classify", True):
            try:
                classify_record(record)
            except Exception:
                record.refresh_from_db()

            try:
                classify_record_cause(record)
            except Exception:
                record.refresh_from_db()

        output = ExternalErrorRecordSerializer(
            record,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="classify")
    def classify(self, request, pk=None):
        if not can_classify_external_errors(request.user):
            return Response(
                {"detail": "Bạn không có quyền phân loại lỗi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        record = self.get_object()
        force = str(request.data.get("force", False)).lower() in {
            "true",
            "1",
            "yes",
        }

        try:
            classify_record(record, force=force)
        except Exception as exc:
            return Response(
                {
                    "detail": "Phân loại lỗi thất bại.",
                    "error": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=True, methods=["post"], url_path="classify-cause")
    def classify_cause(self, request, pk=None):
        if not can_classify_external_errors(request.user):
            return Response(
                {"detail": "Bạn không có quyền phân loại nguyên nhân."},
                status=status.HTTP_403_FORBIDDEN,
            )

        record = self.get_object()
        force = str(request.data.get("force", False)).lower() in {
            "true",
            "1",
            "yes",
        }

        try:
            classify_record_cause(record, force=force)
        except Exception as exc:
            return Response(
                {
                    "detail": "Phân loại nguyên nhân thất bại.",
                    "error": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        serializer = ExternalErrorConfirmClassificationSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        record = self.get_object()
        record.error_code = serializer.validated_data["error_code"]
        record.classification_status = ExternalErrorRecord.STATUS_CONFIRMED
        record.need_review = False
        record.classification_error = None
        record.updated_by = request.user
        record.save(
            update_fields=[
                "error_code",
                "classification_status",
                "need_review",
                "classification_error",
                "updated_by",
                "updated_at",
            ]
        )
        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=True, methods=["post"], url_path="confirm-cause")
    def confirm_cause(self, request, pk=None):
        serializer = ExternalErrorConfirmCauseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record = self.get_object()
        record.cause_group = serializer.validated_data["cause_group"]

        normalized_cause = serializer.validated_data.get("normalized_cause")
        if normalized_cause is not None:
            record.normalized_cause = normalized_cause.strip()

        record.cause_classification_status = (
            ExternalErrorRecord.STATUS_CONFIRMED
        )
        record.cause_need_review = False
        record.cause_classification_error = None
        record.updated_by = request.user
        record.save(
            update_fields=[
                "cause_group",
                "normalized_cause",
                "cause_classification_status",
                "cause_need_review",
                "cause_classification_error",
                "updated_by",
                "updated_at",
            ]
        )
        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=False, methods=["post"], url_path="bulk-classify")
    def bulk_classify(self, request):
        if not can_classify_external_errors(request.user):
            return Response(
                {"detail": "Bạn không có quyền phân loại lỗi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ExternalErrorBulkClassifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data.get("ids") or []
        all_matching = serializer.validated_data.get(
            "all_matching",
            False,
        )
        force = serializer.validated_data.get("force", False)

        if all_matching:
            queryset = self.get_queryset()
        elif ids:
            queryset = ExternalErrorRecord.objects.filter(
                id__in=ids
            ).order_by("id")
        else:
            raise ValidationError(
                {
                    "ids": (
                        "Chọn ít nhất một dòng lỗi "
                        "hoặc bật all_matching."
                    )
                }
            )

        if not force:
            queryset = queryset.exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )

        return Response(
            classify_queryset(queryset.order_by("id"), force=force)
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-classify-causes",
    )
    def bulk_classify_causes(self, request):
        if not can_classify_external_errors(request.user):
            return Response(
                {"detail": "Bạn không có quyền phân loại nguyên nhân."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ExternalErrorBulkClassifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data.get("ids") or []
        all_matching = serializer.validated_data.get("all_matching", False)
        force = serializer.validated_data.get("force", False)

        if all_matching:
            queryset = self.get_queryset()
        elif ids:
            queryset = ExternalErrorRecord.objects.filter(
                id__in=ids
            ).order_by("id")
        else:
            raise ValidationError(
                {
                    "ids": (
                        "Chọn ít nhất một dòng lỗi "
                        "hoặc bật all_matching."
                    )
                }
            )

        if not force:
            queryset = queryset.exclude(
                cause_classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )

        return Response(
            classify_queryset_causes(
                queryset.order_by("id"),
                force=force,
            )
        )


class ExternalErrorExcelImportAPIView(APIView):
    permission_classes = [
        IsAuthenticated,
        ExternalErrorPermission,
    ]
    parser_classes = [
        MultiPartParser,
        FormParser,
    ]
    external_error_permission = "import"

    def post(self, request):
        serializer = ExternalErrorExcelImportSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        auto_classify = serializer.validated_data.get(
            "auto_classify",
            True,
        )

        try:
            # Quan trọng: không chạy LLM trong request upload.
            batch, import_summary = import_excel_file(
                uploaded_file=serializer.validated_data["file"],
                sheet_name=(
                    serializer.validated_data.get("sheet_name")
                    or None
                ),
                auto_classify=False,
                created_by=request.user,
            )
        except (ValueError, RuntimeError) as exc:
            raise ValidationError(
                {"detail": str(exc)}
            ) from exc

        classification_queued = False
        classification_task_id = None
        classification_queue_error = None

        if auto_classify and batch.total_rows > 0:
            try:
                task = classify_external_error_batch.delay(
                    batch.id
                )

                classification_queued = True
                classification_task_id = task.id

                batch.status = (
                    ExternalErrorImportBatch.STATUS_CLASSIFYING
                )
                batch.save(
                    update_fields=[
                        "status",
                        "updated_at",
                    ]
                )
            except Exception as exc:
                # Import vẫn thành công dù broker/Celery đang lỗi.
                classification_queue_error = str(exc)

        import_summary["auto_classify"] = auto_classify
        import_summary["classification_queued"] = (
            classification_queued
        )
        import_summary["classification_task_id"] = (
            classification_task_id
        )
        import_summary["classification_queue_error"] = (
            classification_queue_error
        )

        return Response(
            {
                "batch": ExternalErrorImportBatchSerializer(
                    batch
                ).data,
                "import_summary": import_summary,
            },
            status=status.HTTP_201_CREATED,
        )


class ExternalErrorRawImportAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]
    external_error_permission = "import"

    def post(self, request):
        serializer = ExternalErrorRawImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        batch = import_and_optionally_classify(
            rows=serializer.validated_data["rows"],
            file_name=serializer.validated_data.get("file_name") or "",
            source_type=(
                serializer.validated_data.get("source_type")
                or ExternalErrorImportBatch.SOURCE_API
            ),
            classify_now=serializer.validated_data.get(
                "classify_now",
                True,
            ),
            created_by=request.user,
        )

        return Response(
            ExternalErrorImportBatchSerializer(batch).data,
            status=status.HTTP_201_CREATED,
        )


class ExternalErrorDashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]
    external_error_permission = "view"

    def get(self, request):
        if not can_view_external_errors(request.user):
            return Response(
                {"detail": "Bạn không có quyền xem dashboard lỗi."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(build_summary(request.query_params))


class ExternalErrorDashboardChartAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]
    external_error_permission = "view"

    def get(self, request):
        chart_type = (
            request.query_params.get("chart_type") or "BAR"
        ).upper()

        try:
            if chart_type == "LINE":
                data = trend(request.query_params)
            elif chart_type in {
                "STACKED_BAR",
                "STACKED_HORIZONTAL_BAR",
            }:
                data = stacked(request.query_params)
                data["chart_type"] = chart_type
            else:
                data = group_by(request.query_params)
                data["chart_type"] = chart_type
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(data)


class ExternalErrorRecurringAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]
    external_error_permission = "view"

    def get(self, request):
        return Response(recurring(request.query_params))


class ExternalErrorDashboardWidgetViewSet(viewsets.ModelViewSet):
    queryset = (
        ExternalErrorDashboardWidget.objects
        .select_related("created_by")
        .filter(is_active=True)
    )
    serializer_class = ExternalErrorDashboardWidgetSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
