from django.core.exceptions import ValidationError
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.decorators import action
from apps.kpis.models import (
    KpiGateDefinition,
    KpiGroup,
    KpiMetricDefinition,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiRewardTierConfig,
    KpiUserMetricResult,
)
from apps.kpis.permissions import (KpiConfigPermission, KpiManualScorePermission,)
from apps.kpis.serializers import (
    CreateMonthlyKpiPeriodSerializer,
    KpiGateDefinitionSerializer,
    KpiGroupSerializer,
    KpiMetricDefinitionSerializer,
    KpiPeriodDetailSerializer,
    KpiPeriodGateConfigSerializer,
    KpiPeriodListSerializer,
    KpiPeriodMetricSerializer,
    KpiRewardTierConfigSerializer,
    KpiManualScoreSerializer,
    KpiUserMetricResultSerializer,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic
from apps.accounts.services import PermissionService
from apps.kpis.auto_calculation import (
    calculate_auto_kpis_for_user,
    get_default_kpi_users,
)
class KpiPeriodViewSet(viewsets.ReadOnlyModelViewSet):
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
        if self.action == "retrieve":
            return KpiPeriodDetailSerializer

        return KpiPeriodListSerializer

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
        except ValidationError as exc:
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
        except ValidationError as exc:
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


class KpiGroupViewSet(viewsets.ModelViewSet):
    serializer_class = KpiGroupSerializer
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = KpiGroup.objects.select_related("period").all()

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        return queryset.order_by("period_id", "sort_order", "id")

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không tạo nhóm KPI trực tiếp ở API này. Hãy tạo kỳ KPI hoặc dùng API cấu hình riêng."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không xóa nhóm KPI trực tiếp. Có thể tắt bằng is_active=false."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class KpiPeriodMetricViewSet(viewsets.ModelViewSet):
    serializer_class = KpiPeriodMetricSerializer
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = (
            KpiPeriodMetric.objects.select_related(
                "period",
                "group",
                "metric_definition",
            )
            .all()
        )

        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        group_code = self.request.query_params.get("group_code")
        input_type = self.request.query_params.get("input_type")

        if period:
            queryset = queryset.filter(period_id=period)

        if period_code:
            queryset = queryset.filter(period__period_code=period_code)

        if group_code:
            queryset = queryset.filter(group__group_code=group_code)

        if input_type:
            queryset = queryset.filter(input_type=input_type)

        return queryset.order_by("period_id", "group__sort_order", "sort_order", "id")

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không tạo chỉ tiêu KPI trực tiếp ở API này. Giai đoạn này chỉ hỗ trợ sửa cấu hình kỳ đã tạo."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Không xóa chỉ tiêu KPI trực tiếp. Có thể tắt bằng is_active=false."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class KpiPeriodGateConfigViewSet(viewsets.ModelViewSet):
    serializer_class = KpiPeriodGateConfigSerializer
    permission_classes = [KpiConfigPermission]

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


class KpiRewardTierConfigViewSet(viewsets.ModelViewSet):
    serializer_class = KpiRewardTierConfigSerializer
    permission_classes = [KpiConfigPermission]

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


class KpiMetricDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiMetricDefinitionSerializer
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = KpiMetricDefinition.objects.all()

        input_type = self.request.query_params.get("input_type")
        is_active = self.request.query_params.get("is_active")

        if input_type:
            queryset = queryset.filter(input_type=input_type)

        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        return queryset.order_by("metric_code")


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
    permission_classes = [KpiManualScorePermission]

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