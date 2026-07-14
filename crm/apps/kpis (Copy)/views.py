from datetime import date, datetime
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError


# from django.core.exceptions import ValidationError
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.decorators import action
from apps.kpis.models import (
    KpiGateDefinition,
    KpiGroup,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
    KpiUserMetricResult,
    KpiUserGateResult,
    KpiUserSummary,
)
from apps.kpis.permissions import (
    KpiConfigPermission, 
    KpiManualScorePermission,
    KpiAutoCalculatePermission,)
from apps.kpis.serializers import (
    CreateMonthlyKpiPeriodSerializer,
    KpiGateDefinitionSerializer,
    KpiGroupSerializer,
    KpiPeriodDetailSerializer,
    KpiPeriodGateConfigSerializer,
    KpiPeriodListSerializer,
    KpiPeriodMetricSerializer,
    KpiRewardTierConfigSerializer,
    KpiManualScoreSerializer,
    KpiUserMetricResultSerializer,
    KpiAutoCalculateSerializer,
    KpiSummaryCalculateSerializer,
    KpiUserGateResultSerializer,
    KpiUserSummarySerializer,
    KpiGroupWriteSerializer,
    KpiPeriodMetricWriteSerializer,
    KpiPeriodGateConfigWriteSerializer,
    KpiRewardTierConfigWriteSerializer,
    KpiPeriodWriteSerializer,
)
from apps.kpis.summary_calculation import calculate_kpi_summaries
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic
from apps.accounts.services import PermissionService
from apps.kpis.auto_calculation import (
    calculate_auto_kpis_for_user,
    get_default_kpi_users,
)

def normalize_config_compare_value(value):
    if hasattr(value, "pk"):
        return value.pk

    if isinstance(value, Decimal):
        return value

    if isinstance(value, (date, datetime)):
        return value

    if isinstance(value, str):
        return value.strip()

    return value


def get_validation_error_messages(exc):
    if hasattr(exc, "messages"):
        return exc.messages

    if hasattr(exc, "message_dict"):
        messages = []

        for field, field_messages in exc.message_dict.items():
            if isinstance(field_messages, list):
                messages.extend(
                    [f"{field}: {message}" for message in field_messages]
                )
            else:
                messages.append(f"{field}: {field_messages}")

        return messages

    return [str(exc)]


def validate_period_weights_or_raise(period):
    try:
        period.validate_weight_configuration()
    except DjangoValidationError as exc:
        raise DRFValidationError(
            {
                "detail": "Không thể lưu vì tổng trọng số KPI chưa hợp lệ.",
                "weight_validation": {
                    "valid": False,
                    "errors": get_validation_error_messages(exc),
                },
            }
        )


def get_period_weight_validation(period):
    try:
        period.validate_weight_configuration()

        return {
            "valid": True,
            "errors": [],
        }
    except DjangoValidationError as exc:
        return {
            "valid": False,
            "errors": get_validation_error_messages(exc),
        }


class KpiPeriodConfigCrudMixin:
    read_serializer_class = None
    write_serializer_class = None
    config_object_type = "KpiConfig"
    validate_weights_on_save = False
    deactivate_children_on_destroy = False

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return self.write_serializer_class or self.serializer_class

        return self.read_serializer_class or self.serializer_class

    def get_read_serializer(self, instance):
        serializer_class = self.read_serializer_class or self.serializer_class

        return serializer_class(instance, context=self.get_serializer_context())

    def ensure_period_editable(self, period):
        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            raise DRFValidationError(
                {
                    "detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể chỉnh sửa cấu hình."
                }
            )

    def has_validated_changes(self, instance, validated_data):
        for field, new_value in validated_data.items():
            if not hasattr(instance, field):
                continue

            old_value = getattr(instance, field)

            if normalize_config_compare_value(old_value) != normalize_config_compare_value(new_value):
                return True

        return False

    def get_period_from_serializer(self, serializer):
        period = serializer.validated_data.get("period")

        if period:
            return period

        instance = getattr(serializer, "instance", None)

        if instance and hasattr(instance, "period"):
            return instance.period

        return None

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period = self.get_period_from_serializer(serializer)

        if not period:
            raise DRFValidationError({"period": "Thiếu kỳ KPI."})

        self.ensure_period_editable(period)

        instance = serializer.save()

        if self.validate_weights_on_save:
            validate_period_weights_or_raise(period)

        create_kpi_audit_log(
            period=period,
            object_type=self.config_object_type,
            object_id=instance.id,
            action_type="CREATE",
            changed_by_user=request.user,
            old_data=None,
            new_data=serialize_model_basic(instance),
            note="Tạo cấu hình KPI.",
        )

        return Response(
            {
                "detail": "Tạo cấu hình KPI thành công.",
                "changed": True,
                "weight_validation": get_period_weight_validation(period),
                "item": self.get_read_serializer(instance).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        period = instance.period

        self.ensure_period_editable(period)

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)

        if not self.has_validated_changes(instance, serializer.validated_data):
            return Response(
                {
                    "detail": "Không có thay đổi nào để cập nhật.",
                    "changed": False,
                    "weight_validation": get_period_weight_validation(period),
                    "item": self.get_read_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        old_data = serialize_model_basic(instance)

        updated_instance = serializer.save()

        if self.validate_weights_on_save:
            validate_period_weights_or_raise(period)

        create_kpi_audit_log(
            period=period,
            object_type=self.config_object_type,
            object_id=updated_instance.id,
            action_type="UPDATE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data=serialize_model_basic(updated_instance),
            note="Chỉnh sửa cấu hình KPI.",
        )

        return Response(
            {
                "detail": "Cập nhật cấu hình KPI thành công.",
                "changed": True,
                "weight_validation": get_period_weight_validation(period),
                "item": self.get_read_serializer(updated_instance).data,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        period = instance.period

        self.ensure_period_editable(period)

        if not getattr(instance, "is_active", True):
            return Response(
                {
                    "detail": "Cấu hình này đã bị tắt trước đó.",
                    "changed": False,
                    "weight_validation": get_period_weight_validation(period),
                    "item": self.get_read_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        old_data = serialize_model_basic(instance)

        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

        if self.deactivate_children_on_destroy:
            instance.metrics.update(is_active=False)

        if self.validate_weights_on_save:
            validate_period_weights_or_raise(period)

        create_kpi_audit_log(
            period=period,
            object_type=self.config_object_type,
            object_id=instance.id,
            action_type="DELETE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data=serialize_model_basic(instance),
            note="Xóa mềm cấu hình KPI.",
        )

        return Response(
            {
                "detail": "Xóa mềm cấu hình KPI thành công.",
                "changed": True,
                "weight_validation": get_period_weight_validation(period),
                "item": self.get_read_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )

class KpiPeriodViewSet(viewsets.ModelViewSet):
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = (
            KpiPeriod.objects.annotate(
                group_count=Count("groups", distinct=True),
                metric_count=Count("metrics", distinct=True),
                gate_count=Count("gate_configs", distinct=True),
                reward_tier_count=Count("reward_tiers", distinct=True),
            )
            .prefetch_related(
                "groups",
                "metrics",
                "gate_configs",
                "reward_tiers",
            )
            .all()
        )

        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        status_value = self.request.query_params.get("status")
        period_type = self.request.query_params.get("period_type")
        q = self.request.query_params.get("q")

        if year:
            queryset = queryset.filter(year=year)

        if month:
            queryset = queryset.filter(month=month)

        if status_value:
            queryset = queryset.filter(status=status_value)

        if period_type:
            queryset = queryset.filter(period_type=period_type)

        if q:
            queryset = queryset.filter(period_code__icontains=q) | queryset.filter(
                period_name__icontains=q
            )

        return queryset.order_by("-year", "-month", "-id")

    def get_serializer_class(self):
        if self.action in ["update", "partial_update"]:
            return KpiPeriodWriteSerializer

        if self.action == "retrieve":
            return KpiPeriodDetailSerializer

        return KpiPeriodListSerializer
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        if instance.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            return Response(
                {"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể chỉnh sửa."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_data = serialize_model_basic(instance)

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        period = serializer.save()

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriod",
            object_id=period.id,
            action_type="UPDATE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data=serialize_model_basic(period),
            note="Chỉnh sửa kỳ KPI.",
        )

        return Response(
            {
                "detail": "Cập nhật kỳ KPI thành công.",
                "changed": True,
                "item": KpiPeriodListSerializer(period).data,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        period = self.get_object()

        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            return Response(
                {"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể xóa."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_data = serialize_model_basic(period)
        period_code = period.period_code

        create_kpi_audit_log(
            period=period,
            object_type="KpiPeriod",
            object_id=period.id,
            action_type="DELETE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data=None,
            note="Xóa kỳ KPI.",
        )

        period.delete()

        return Response(
            {
                "detail": f"Đã xóa kỳ KPI {period_code}.",
                "changed": True,
            },
            status=status.HTTP_200_OK,
        )
    @action(methods=["post"], detail=False, url_path="create-monthly")
    def create_monthly(self, request):
        serializer = CreateMonthlyKpiPeriodSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        result = serializer.save()
        period = result["period"]
        created = result["created"]

        return Response(
            {
                "detail": (
                    "Tạo kỳ KPI thành công."
                    if created
                    else "Kỳ KPI đã tồn tại."
                ),
                "created": created,
                "period": KpiPeriodDetailSerializer(period).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=True, url_path="validate-weights")
    def validate_weights(self, request, pk=None):
        period = self.get_object()

        try:
            period.validate_weight_configuration()
        except DjangoValidationError as exc:
            return Response(
                {
                    "valid": False,
                    "errors": exc.messages,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "valid": True,
                "errors": [],
                "detail": "Cấu hình trọng số KPI hợp lệ.",
            }
        )

    @action(methods=["post"], detail=True, url_path="activate")
    def activate(self, request, pk=None):
        period = self.get_object()

        if period.status != KpiPeriod.STATUS_DRAFT:
            return Response(
                {
                    "detail": "Chỉ kỳ KPI ở trạng thái DRAFT mới được kích hoạt."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            period.validate_weight_configuration()
        except DjangoValidationError as exc:
            return Response(
                {
                    "detail": "Không thể kích hoạt vì cấu hình trọng số chưa hợp lệ.",
                    "valid": False,
                    "errors": exc.messages,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        period.status = KpiPeriod.STATUS_ACTIVE
        period.updated_by_user = request.user
        period.save(update_fields=["status", "updated_by_user", "updated_at"])

        return Response(
            {
                "detail": "Kích hoạt kỳ KPI thành công.",
                "period": KpiPeriodDetailSerializer(period).data,
            }
        )


class KpiGroupViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiGroupSerializer
    write_serializer_class = KpiGroupWriteSerializer
    serializer_class = KpiGroupSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiGroup"
    validate_weights_on_save = True
    deactivate_children_on_destroy = True

    def get_queryset(self):
        queryset = KpiGroup.objects.select_related("period").all()

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        return queryset.order_by("period_id", "sort_order", "id")

    


class KpiPeriodMetricViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiPeriodMetricSerializer
    write_serializer_class = KpiPeriodMetricWriteSerializer
    serializer_class = KpiPeriodMetricSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiPeriodMetric"
    validate_weights_on_save = True

    def get_queryset(self):
        queryset = (
            KpiPeriodMetric.objects.select_related(
                "period",
                "group",
            )
            .all()
        )

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        group_code = self.request.query_params.get("group_code")
        q = self.request.query_params.get("q")
        is_active = self.request.query_params.get("is_active")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        if group_code:
            queryset = queryset.filter(group__group_code=group_code)

        if q:
            queryset = queryset.filter(
                Q(metric_code__icontains=q)
                | Q(metric_name__icontains=q)
                | Q(work_description__icontains=q)
                | Q(measurement_formula__icontains=q)
                | Q(target_text__icontains=q)
            )

        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        return queryset.order_by("period_id", "group__sort_order", "sort_order", "id")

    


class KpiPeriodGateConfigViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiPeriodGateConfigSerializer
    write_serializer_class = KpiPeriodGateConfigWriteSerializer
    serializer_class = KpiPeriodGateConfigSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiPeriodGateConfig"
    validate_weights_on_save = False


    def get_queryset(self):
        queryset = (
            KpiPeriodGateConfig.objects.select_related(
                "period",
                "gate_definition",
            )
            .all()
        )

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        return queryset.order_by("period_id", "gate_code")

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không tạo gate trực tiếp ở API này. Hãy dùng cấu hình mặc định theo kỳ."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không xóa gate trực tiếp. Có thể tắt bằng is_active=false."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class KpiRewardTierConfigViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiRewardTierConfigSerializer
    write_serializer_class = KpiRewardTierConfigWriteSerializer
    serializer_class = KpiRewardTierConfigSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiRewardTierConfig"
    validate_weights_on_save = False

    def get_queryset(self):
        queryset = KpiRewardTierConfig.objects.select_related("period").all()

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        return queryset.order_by("period_id", "sort_order", "id")

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không tạo bậc thưởng trực tiếp ở API này. Hãy dùng cấu hình mặc định theo kỳ."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không xóa bậc thưởng trực tiếp. Có thể tắt bằng is_active=false."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )




class KpiGateDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiGateDefinitionSerializer
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = KpiGateDefinition.objects.all()

        is_active = self.request.query_params.get("is_active")

        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        return queryset.order_by("gate_code")
    
def user_has_permission(user, permission_code):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return PermissionService.has_permission(user, permission_code)


def get_user_branch_id(user):
    employee = getattr(user, "employee", None)

    if not employee:
        return None

    branch = getattr(employee, "branch", None)

    if not branch:
        return None

    return branch.id


def filter_kpi_results_by_user(queryset, user):
    if not user or not user.is_authenticated:
        return queryset.none()

    if user.is_superuser or user_has_permission(user, "KPI_DASHBOARD_VIEW_ALL"):
        return queryset

    if user_has_permission(user, "KPI_DASHBOARD_VIEW_BRANCH"):
        branch_id = get_user_branch_id(user)

        if not branch_id:
            return queryset.filter(user=user)

        return queryset.filter(Q(branch_id=branch_id) | Q(user=user))

    return queryset.filter(user=user)


def can_score_target_user(scored_by_user, target_user):
    if not scored_by_user or not scored_by_user.is_authenticated:
        return False

    if scored_by_user.is_superuser or user_has_permission(
        scored_by_user,
        "KPI_DASHBOARD_VIEW_ALL",
    ):
        return True

    if user_has_permission(scored_by_user, "KPI_DASHBOARD_VIEW_BRANCH"):
        scorer_branch_id = get_user_branch_id(scored_by_user)
        target_branch_id = get_user_branch_id(target_user)

        if not scorer_branch_id or not target_branch_id:
            return False

        return scorer_branch_id == target_branch_id

    return False


class KpiUserMetricResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserMetricResultSerializer
    def get_permissions(self):
        if self.action == "calculate_auto":
            return [KpiAutoCalculatePermission()]

        return [KpiManualScorePermission()]

    def get_queryset(self):
        queryset = (
            KpiUserMetricResult.objects.select_related(
                "period",
                "group",
                "metric",
                "user",
                "employee",
                "branch",
                "scored_by_user",
            )
            .all()
        )

        queryset = filter_kpi_results_by_user(queryset, self.request.user)

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        user = self.request.query_params.get("user")
        branch = self.request.query_params.get("branch")
        source_type = self.request.query_params.get("source_type")
        group_code = self.request.query_params.get("group_code")
        metric = self.request.query_params.get("metric")
        metric_code = self.request.query_params.get("metric_code")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        if user:
            queryset = queryset.filter(user_id=user)

        if branch:
            queryset = queryset.filter(branch_id=branch)

        if source_type:
            queryset = queryset.filter(source_type=source_type)

        if group_code:
            queryset = queryset.filter(group__group_code=group_code)

        if metric:
            queryset = queryset.filter(metric_id=metric)

        if metric_code:
            queryset = queryset.filter(metric__metric_code=metric_code)

        return queryset.order_by(
            "period_id",
            "user_id",
            "group__sort_order",
            "metric__sort_order",
            "id",
        )

    @action(methods=["post"], detail=False, url_path="manual-score")
    def manual_score(self, request):
        serializer = KpiManualScoreSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        target_user = serializer.validated_data["user"]

        if not can_score_target_user(request.user, target_user):
            return Response(
                {
                    "detail": "Bạn không có quyền chấm điểm KPI cho nhân viên này."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        period = serializer.validated_data["period"]
        metric = serializer.validated_data["metric"]

        old_result = KpiUserMetricResult.objects.filter(
            period=period,
            metric=metric,
            user=target_user,
        ).first()

        old_data = serialize_model_basic(old_result) if old_result else None

        result, created = serializer.save()

        new_data = serialize_model_basic(result)

        create_kpi_audit_log(
            period=period,
            object_type="KpiUserMetricResult",
            object_id=result.id,
            action_type=(
                "CREATE" if created else "UPDATE"
            ),
            changed_by_user=request.user,
            old_data=old_data,
            new_data=new_data,
            note="Nhập điểm KPI Phần A.",
        )

        return Response(
            {
                "detail": (
                    "Nhập điểm KPI thành công."
                    if created
                    else "Cập nhật điểm KPI thành công."
                ),
                "created": created,
                "result": KpiUserMetricResultSerializer(result).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=False, url_path="calculate-auto")
    def calculate_auto(self, request):
        serializer = KpiAutoCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period = serializer.validated_data["period"]
        target_user = serializer.validated_data.get("user")
        branch = serializer.validated_data.get("branch")

        if target_user:
            users = [target_user]
        else:
            users = list(
                get_default_kpi_users(
                    branch_id=branch.id if branch else None
                )
            )

        calculated_results = []

        for user in users:
            user_results = calculate_auto_kpis_for_user(
                period=period,
                user=user,
                calculated_by_user=request.user,
            )

            calculated_results.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "result_count": len(user_results),
                    "results": [
                        KpiUserMetricResultSerializer(item["result"]).data
                        for item in user_results
                    ],
                }
            )

        return Response(
            {
                "detail": "Tính KPI tự động Phần B thành công.",
                "period": period.period_code,
                "user_count": len(users),
                "results": calculated_results,
            }
        )
    
class KpiUserGateResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserGateResultSerializer
    permission_classes = [KpiManualScorePermission]

    def get_queryset(self):
        queryset = (
            KpiUserGateResult.objects.select_related(
                "period",
                "gate_config",
                "user",
                "employee",
                "branch",
            )
            .all()
        )

        queryset = filter_kpi_results_by_user(queryset, self.request.user)

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        user = self.request.query_params.get("user")
        branch = self.request.query_params.get("branch")
        gate_code = self.request.query_params.get("gate_code")
        is_passed = self.request.query_params.get("is_passed")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        if user:
            queryset = queryset.filter(user_id=user)

        if branch:
            queryset = queryset.filter(branch_id=branch)

        if gate_code:
            queryset = queryset.filter(gate_config__gate_code=gate_code)

        if is_passed in ["true", "false"]:
            queryset = queryset.filter(is_passed=is_passed == "true")

        return queryset.order_by("period_id", "user_id", "gate_config__gate_code")


class KpiUserSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserSummarySerializer

    def get_permissions(self):
        if self.action == "calculate":
            return [KpiAutoCalculatePermission()]

        return [KpiManualScorePermission()]

    def get_queryset(self):
        queryset = (
            KpiUserSummary.objects.select_related(
                "period",
                "user",
                "employee",
                "branch",
                "reward_tier",
            )
            .all()
        )

        queryset = filter_kpi_results_by_user(queryset, self.request.user)

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        user = self.request.query_params.get("user")
        branch = self.request.query_params.get("branch")
        reward_tier_code = self.request.query_params.get("reward_tier_code")
        all_gates_passed = self.request.query_params.get("all_gates_passed")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        if user:
            queryset = queryset.filter(user_id=user)

        if branch:
            queryset = queryset.filter(branch_id=branch)

        if reward_tier_code:
            queryset = queryset.filter(reward_tier_code=reward_tier_code)

        if all_gates_passed in ["true", "false"]:
            queryset = queryset.filter(all_gates_passed=all_gates_passed == "true")

        return queryset.order_by("period_id", "rank_overall", "-total_score", "id")

    @action(methods=["post"], detail=False, url_path="calculate")
    def calculate(self, request):
        serializer = KpiSummaryCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period = serializer.validated_data["period"]
        target_user = serializer.validated_data.get("user")
        branch = serializer.validated_data.get("branch")

        if target_user:
            users = [target_user]
            branch_id = None
        else:
            users = None
            branch_id = branch.id if branch else None

        results = calculate_kpi_summaries(
            period=period,
            users=users,
            branch_id=branch_id,
            calculated_by_user=request.user,
        )

        return Response(
            {
                "detail": "Tổng hợp KPI, gate và bậc thưởng thành công.",
                "period": period.period_code,
                "result_count": len(results),
                "results": [
                    KpiUserSummarySerializer(item["summary"]).data
                    for item in results
                ],
            }
        )