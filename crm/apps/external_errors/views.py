from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.external_errors.models import (
    ExternalErrorDashboardWidget,
    ExternalErrorImportBatch,
    ExternalErrorRecord,
)
from apps.external_errors.permissions import (
    ExternalErrorPermission,
    can_classify_external_errors,
    can_import_external_errors,
    can_manage_external_errors,
    can_view_external_errors,
)
from apps.external_errors.serializers import (
    ExternalErrorBulkClassifySerializer,
    ExternalErrorDashboardWidgetSerializer,
    ExternalErrorImportBatchSerializer,
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
from apps.external_errors.services.bedrock_classifier import classify_queryset, classify_record
from apps.external_errors.services.importer import import_and_optionally_classify


class ExternalErrorImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExternalErrorImportBatch.objects.select_related("created_by").all()
    serializer_class = ExternalErrorImportBatchSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]


class ExternalErrorRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get_queryset(self):
        queryset = ExternalErrorRecord.objects.select_related("batch", "created_by", "updated_by")
        return apply_external_error_filters(queryset, self.request.query_params)

    def get_serializer_class(self):
        if self.action == "list":
            return ExternalErrorRecordListSerializer
        return ExternalErrorRecordSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="classify")
    def classify(self, request, pk=None):
        if not can_classify_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền phân loại lỗi."}, status=status.HTTP_403_FORBIDDEN)

        record = self.get_object()
        force = bool(request.data.get("force", False))
        try:
            classify_record(record, force=force)
        except Exception as exc:
            return Response(
                {"detail": "Phân loại lỗi thất bại.", "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        record = self.get_object()
        record.classification_status = ExternalErrorRecord.STATUS_CONFIRMED
        record.need_review = False
        record.updated_by = request.user
        record.save(update_fields=["classification_status", "need_review", "updated_by", "updated_at"])
        return Response(ExternalErrorRecordSerializer(record).data)

    @action(detail=False, methods=["post"], url_path="bulk-classify")
    def bulk_classify(self, request):
        if not can_classify_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền phân loại lỗi."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ExternalErrorBulkClassifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data.get("ids") or []
        all_matching = serializer.validated_data.get("all_matching", False)
        force = serializer.validated_data.get("force", False)

        if all_matching:
            queryset = self.get_queryset()
        elif ids:
            queryset = ExternalErrorRecord.objects.filter(id__in=ids).order_by("id")
        else:
            raise ValidationError({"ids": "Chọn ít nhất một dòng lỗi hoặc bật all_matching."})

        if not force:
            queryset = queryset.exclude(
                classification_status__in=[
                    ExternalErrorRecord.STATUS_CLASSIFIED,
                    ExternalErrorRecord.STATUS_CONFIRMED,
                ]
            )

        stats = classify_queryset(queryset.order_by("id"), force=force)
        return Response(stats)


class ExternalErrorRawImportAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def post(self, request):
        if not can_import_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền import dữ liệu lỗi."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ExternalErrorRawImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        batch = import_and_optionally_classify(
            rows=serializer.validated_data["rows"],
            file_name=serializer.validated_data.get("file_name") or "",
            source_type=serializer.validated_data.get("source_type") or ExternalErrorImportBatch.SOURCE_API,
            classify_now=serializer.validated_data.get("classify_now", False),
            created_by=request.user,
        )

        return Response(ExternalErrorImportBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


class ExternalErrorDashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get(self, request):
        if not can_view_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền xem dashboard lỗi."}, status=status.HTTP_403_FORBIDDEN)
        return Response(build_summary(request.query_params))


class ExternalErrorDashboardChartAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get(self, request):
        if not can_view_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền xem dashboard lỗi."}, status=status.HTTP_403_FORBIDDEN)

        chart_type = (request.query_params.get("chart_type") or "BAR").upper()
        try:
            if chart_type == "LINE":
                data = trend(request.query_params)
            elif chart_type in ["STACKED_BAR", "STACKED_HORIZONTAL_BAR"]:
                data = stacked(request.query_params)
                data["chart_type"] = chart_type
            else:
                data = group_by(request.query_params)
                data["chart_type"] = chart_type
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(data)


class ExternalErrorRecurringAPIView(APIView):
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def get(self, request):
        if not can_view_external_errors(request.user):
            return Response({"detail": "Bạn không có quyền xem lỗi lặp lại."}, status=status.HTTP_403_FORBIDDEN)
        return Response(recurring(request.query_params))


class ExternalErrorDashboardWidgetViewSet(viewsets.ModelViewSet):
    queryset = ExternalErrorDashboardWidget.objects.select_related("created_by").filter(is_active=True)
    serializer_class = ExternalErrorDashboardWidgetSerializer
    permission_classes = [IsAuthenticated, ExternalErrorPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
