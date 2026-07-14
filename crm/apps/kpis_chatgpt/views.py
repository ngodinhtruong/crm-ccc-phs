from datetime import date, datetime
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.accounts.services import PermissionService
from apps.kpis.auto_calculation import calculate_auto_kpis_for_user, get_default_kpi_users
from apps.kpis.models import (
    KpiGateDefinition,
    KpiGroup,
    KpiPeriod,
    KpiPeriodGateConfig,
    KpiPeriodMetric,
    KpiProfile,
    KpiRewardTierConfig,
    KpiSection,
    KpiUserGateResult,
    KpiUserMetricResult,
    KpiUserSummary,
    KpiUserTarget,
)
from apps.kpis.permissions import (
    KpiAutoCalculatePermission,
    KpiConfigPermission,
    KpiManualScorePermission,
    can_assign_target_for_profile,
    can_manage_kpi_profile,
    get_manageable_profile_codes,
)
from apps.kpis.serializers import (
    CreateMonthlyKpiPeriodSerializer,
    KpiAutoCalculateSerializer,
    KpiGateDefinitionSerializer,
    KpiGroupSerializer,
    KpiGroupWriteSerializer,
    KpiManualScoreSerializer,
    KpiPeriodDetailSerializer,
    KpiPeriodGateConfigSerializer,
    KpiPeriodGateConfigWriteSerializer,
    KpiPeriodListSerializer,
    KpiPeriodMetricSerializer,
    KpiPeriodMetricWriteSerializer,
    KpiPeriodWriteSerializer,
    KpiProfileSerializer,
    KpiProfileWriteSerializer,
    KpiRewardTierConfigSerializer,
    KpiRewardTierConfigWriteSerializer,
    KpiSectionSerializer,
    KpiSectionWriteSerializer,
    KpiSummaryCalculateSerializer,
    KpiUserGateResultSerializer,
    KpiUserMetricResultSerializer,
    KpiUserSummarySerializer,
    KpiUserTargetSerializer,
    KpiUserTargetWriteSerializer,
    KpiWeightConfigSaveSerializer,
)
from apps.kpis.services import create_kpi_audit_log, serialize_model_basic
from apps.kpis.summary_calculation import calculate_kpi_summaries


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
                messages.extend([f"{field}: {message}" for message in field_messages])
            else:
                messages.append(f"{field}: {field_messages}")
        return messages

    return [str(exc)]


def validate_profile_weights_or_raise(profile):
    try:
        profile.validate_weight_configuration()
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


def get_weight_validation(obj):
    try:
        obj.validate_weight_configuration()
        return {"valid": True, "errors": []}
    except DjangoValidationError as exc:
        return {"valid": False, "errors": get_validation_error_messages(exc)}


def get_profile_from_instance(instance):
    if isinstance(instance, KpiProfile):
        return instance

    profile = getattr(instance, "profile", None)
    if profile:
        return profile

    group = getattr(instance, "group", None)
    if group:
        return group.profile

    section = getattr(instance, "section", None)
    if section:
        return section.profile

    return None


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

    if scored_by_user.is_superuser or user_has_permission(scored_by_user, "KPI_DASHBOARD_VIEW_ALL"):
        return True

    if user_has_permission(scored_by_user, "KPI_DASHBOARD_VIEW_BRANCH"):
        scorer_branch_id = get_user_branch_id(scored_by_user)
        target_branch_id = get_user_branch_id(target_user)
        if not scorer_branch_id or not target_branch_id:
            return False
        return scorer_branch_id == target_branch_id

    return False


class KpiPeriodConfigCrudMixin:
    read_serializer_class = None
    write_serializer_class = None
    config_object_type = "KpiConfig"
    validate_weights_on_save = False

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return self.write_serializer_class or self.serializer_class
        return self.read_serializer_class or self.serializer_class

    def get_read_serializer(self, instance):
        serializer_class = self.read_serializer_class or self.serializer_class
        return serializer_class(instance, context=self.get_serializer_context())

    def ensure_period_editable(self, period):
        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            raise DRFValidationError({"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể chỉnh sửa cấu hình."})

    def ensure_profile_manageable(self, request, profile):
        if not profile:
            raise DRFValidationError({"profile": "Thiếu bộ KPI."})
        if not can_manage_kpi_profile(request.user, profile):
            raise DRFValidationError({"detail": "Bạn không có quyền chỉnh sửa bộ KPI này."})

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

    def get_profile_from_serializer(self, serializer):
        profile = serializer.validated_data.get("profile")
        if profile:
            return profile

        section = serializer.validated_data.get("section")
        if section:
            return section.profile

        group = serializer.validated_data.get("group")
        if group:
            return group.profile

        instance = getattr(serializer, "instance", None)
        if instance:
            return get_profile_from_instance(instance)

        # KpiProfile create/update stores profile_code but not profile relation.
        profile_code = serializer.validated_data.get("profile_code")
        period = serializer.validated_data.get("period")
        if profile_code and period:
            return KpiProfile(profile_code=profile_code, period=period)

        return None

    def deactivate_related_children(self, instance):
        if isinstance(instance, KpiProfile):
            instance.sections.update(is_active=False)
            instance.groups.update(is_active=False)
            instance.metrics.update(is_active=False)
            instance.gate_configs.update(is_active=False)
            instance.reward_tiers.update(is_active=False)
        elif isinstance(instance, KpiSection):
            instance.groups.update(is_active=False)
            instance.profile.metrics.filter(group__section=instance).update(is_active=False)
        elif isinstance(instance, KpiGroup):
            instance.metrics.update(is_active=False)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period = self.get_period_from_serializer(serializer)
        if not period:
            raise DRFValidationError({"period": "Thiếu kỳ KPI."})

        self.ensure_period_editable(period)
        profile = self.get_profile_from_serializer(serializer)
        self.ensure_profile_manageable(request, profile)

        instance = serializer.save()
        profile = get_profile_from_instance(instance) or profile

        if self.validate_weights_on_save:
            validate_profile_weights_or_raise(profile)

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
                "weight_validation": get_weight_validation(profile),
                "item": self.get_read_serializer(instance).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        period = instance.period
        profile = get_profile_from_instance(instance)

        self.ensure_period_editable(period)
        self.ensure_profile_manageable(request, profile)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        new_profile = self.get_profile_from_serializer(serializer) or profile
        self.ensure_profile_manageable(request, new_profile)

        if not self.has_validated_changes(instance, serializer.validated_data):
            return Response(
                {
                    "detail": "Không có thay đổi nào để cập nhật.",
                    "changed": False,
                    "weight_validation": get_weight_validation(new_profile),
                    "item": self.get_read_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        old_data = serialize_model_basic(instance)
        updated_instance = serializer.save()
        updated_profile = get_profile_from_instance(updated_instance) or new_profile

        if self.validate_weights_on_save:
            validate_profile_weights_or_raise(updated_profile)

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
                "weight_validation": get_weight_validation(updated_profile),
                "item": self.get_read_serializer(updated_instance).data,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        period = instance.period
        profile = get_profile_from_instance(instance)

        self.ensure_period_editable(period)
        self.ensure_profile_manageable(request, profile)

        if not getattr(instance, "is_active", True):
            return Response(
                {
                    "detail": "Cấu hình này đã bị tắt trước đó.",
                    "changed": False,
                    "weight_validation": get_weight_validation(profile),
                    "item": self.get_read_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        old_data = serialize_model_basic(instance)
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        self.deactivate_related_children(instance)

        if self.validate_weights_on_save:
            validate_profile_weights_or_raise(profile)

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
                "weight_validation": get_weight_validation(profile),
                "item": self.get_read_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )


class KpiPeriodViewSet(viewsets.ModelViewSet):
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = (
            KpiPeriod.objects.annotate(
                profile_count=Count("profiles", distinct=True),
                section_count=Count("sections", distinct=True),
                group_count=Count("groups", distinct=True),
                metric_count=Count("metrics", distinct=True),
                gate_count=Count("gate_configs", distinct=True),
                reward_tier_count=Count("reward_tiers", distinct=True),
            )
            .prefetch_related("profiles", "sections", "groups", "metrics", "gate_configs", "reward_tiers")
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
            queryset = queryset.filter(Q(period_code__icontains=q) | Q(period_name__icontains=q))

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
            return Response({"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể chỉnh sửa."}, status=status.HTTP_400_BAD_REQUEST)

        old_data = serialize_model_basic(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
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

        return Response({"detail": "Cập nhật kỳ KPI thành công.", "changed": True, "item": KpiPeriodListSerializer(period).data})

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        period = self.get_object()
        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            return Response({"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể xóa."}, status=status.HTTP_400_BAD_REQUEST)

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
        return Response({"detail": f"Đã xóa kỳ KPI {period_code}.", "changed": True})

    @action(methods=["post"], detail=False, url_path="create-monthly")
    def create_monthly(self, request):
        serializer = CreateMonthlyKpiPeriodSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        period = result["period"]
        created = result["created"]
        return Response(
            {
                "detail": "Tạo kỳ KPI thành công." if created else "Kỳ KPI đã tồn tại.",
                "created": created,
                "period": KpiPeriodDetailSerializer(period).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def _get_profile_from_request(self, period):
        profile_id = self.request.data.get("profile") or self.request.query_params.get("profile")
        profile_code = self.request.data.get("profile_code") or self.request.query_params.get("profile_code")
        profile = None
        if profile_id:
            profile = KpiProfile.objects.filter(period=period, id=profile_id).first()
        elif profile_code:
            profile = KpiProfile.objects.filter(period=period, profile_code=profile_code).first()
        return profile

    @action(methods=["post"], detail=True, url_path="validate-weights")
    def validate_weights(self, request, pk=None):
        period = self.get_object()
        profile = self._get_profile_from_request(period)
        try:
            if profile:
                profile.validate_weight_configuration()
            else:
                period.validate_weight_configuration()
        except DjangoValidationError as exc:
            return Response({"valid": False, "errors": get_validation_error_messages(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"valid": True, "errors": [], "detail": "Cấu hình trọng số KPI hợp lệ."})

    @action(methods=["post"], detail=True, url_path="activate")
    def activate(self, request, pk=None):
        period = self.get_object()
        if period.status != KpiPeriod.STATUS_DRAFT:
            return Response({"detail": "Chỉ kỳ KPI ở trạng thái DRAFT mới được kích hoạt."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            period.validate_weight_configuration()
        except DjangoValidationError as exc:
            return Response(
                {"detail": "Không thể kích hoạt vì cấu hình trọng số chưa hợp lệ.", "valid": False, "errors": get_validation_error_messages(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        period.status = KpiPeriod.STATUS_ACTIVE
        period.updated_by_user = request.user
        period.save(update_fields=["status", "updated_by_user", "updated_at"])
        return Response({"detail": "Kích hoạt kỳ KPI thành công.", "period": KpiPeriodDetailSerializer(period).data})

    @action(methods=["post"], detail=True, url_path="save-weight-config")
    @transaction.atomic
    def save_weight_config(self, request, pk=None):
        period = self.get_object()
        if period.status in [KpiPeriod.STATUS_LOCKED, KpiPeriod.STATUS_CLOSED]:
            raise DRFValidationError({"detail": "Kỳ KPI đã khóa hoặc đã chốt, không thể chỉnh sửa cấu hình."})

        serializer = KpiWeightConfigSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        profile = None
        profile_id = data.get("profile")
        profile_code = data.get("profile_code")
        if profile_id:
            profile = KpiProfile.objects.filter(period=period, id=profile_id).first()
        elif profile_code:
            profile = KpiProfile.objects.filter(period=period, profile_code=profile_code).first()

        if not profile:
            raise DRFValidationError({"profile": "Vui lòng chọn bộ KPI cần lưu trọng số."})

        if not can_manage_kpi_profile(request.user, profile):
            raise DRFValidationError({"detail": "Bạn không có quyền chỉnh sửa bộ KPI này."})

        changed = False
        old_data = {
            "sections": [],
            "groups": [],
            "metrics": [],
        }

        for item in data.get("sections", []):
            section = KpiSection.objects.get(period=period, profile=profile, id=item["id"])
            old_data["sections"].append(serialize_model_basic(section))
            section.weight_percent = item["weight_percent"]
            if "is_active" in item:
                section.is_active = item["is_active"]
            section.save(update_fields=["weight_percent", "is_active", "updated_at"])
            changed = True

        for item in data.get("groups", []):
            group = KpiGroup.objects.get(period=period, profile=profile, id=item["id"])
            old_data["groups"].append(serialize_model_basic(group))
            group.weight_percent = item["weight_percent"]
            if "is_active" in item:
                group.is_active = item["is_active"]
            group.save(update_fields=["weight_percent", "is_active", "updated_at"])
            changed = True

        for item in data.get("metrics", []):
            metric = KpiPeriodMetric.objects.get(period=period, profile=profile, id=item["id"])
            old_data["metrics"].append(serialize_model_basic(metric))
            metric.weight_percent = item["weight_percent"]
            if "is_active" in item:
                metric.is_active = item["is_active"]
            metric.save(update_fields=["weight_percent", "is_active", "updated_at"])
            changed = True

        validate_profile_weights_or_raise(profile)

        create_kpi_audit_log(
            period=period,
            object_type="KpiWeightConfig",
            object_id=profile.id,
            action_type="UPDATE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data={"profile": serialize_model_basic(profile)},
            note="Lưu cấu hình trọng số KPI theo bộ KPI.",
        )

        return Response(
            {
                "detail": "Lưu cấu hình trọng số KPI thành công." if changed else "Không có thay đổi nào để lưu.",
                "changed": changed,
                "weight_validation": get_weight_validation(profile),
                "period": KpiPeriodDetailSerializer(period).data,
            }
        )


class KpiProfileViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiProfileSerializer
    write_serializer_class = KpiProfileWriteSerializer
    serializer_class = KpiProfileSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiProfile"
    # Profile có thể được tạo trước rồi mới tạo section/group/KPI, nên không validate ngay khi CRUD profile.
    validate_weights_on_save = False

    def get_queryset(self):
        queryset = KpiProfile.objects.select_related("period").annotate(
            section_count=Count("sections", distinct=True),
            group_count=Count("groups", distinct=True),
            metric_count=Count("metrics", distinct=True),
        )
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile_code = self.request.query_params.get("profile_code")
        is_active = self.request.query_params.get("is_active")

        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile_code:
            queryset = queryset.filter(profile_code=profile_code)
        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        manageable_codes = get_manageable_profile_codes(self.request.user)
        if manageable_codes:
            queryset = queryset.filter(profile_code__in=manageable_codes)

        return queryset.order_by("period_id", "sort_order", "id")


class KpiSectionViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiSectionSerializer
    write_serializer_class = KpiSectionWriteSerializer
    serializer_class = KpiSectionSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiSection"
    validate_weights_on_save = True

    def get_queryset(self):
        queryset = KpiSection.objects.select_related("period", "profile").all()
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile = self.request.query_params.get("profile")
        profile_code = self.request.query_params.get("profile_code")
        is_active = self.request.query_params.get("is_active")

        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile:
            queryset = queryset.filter(profile_id=profile)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        return queryset.order_by("period_id", "profile__sort_order", "sort_order", "id")


class KpiGroupViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiGroupSerializer
    write_serializer_class = KpiGroupWriteSerializer
    serializer_class = KpiGroupSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiGroup"
    validate_weights_on_save = True

    def get_queryset(self):
        queryset = KpiGroup.objects.select_related("period", "profile", "section").all()
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile = self.request.query_params.get("profile")
        profile_code = self.request.query_params.get("profile_code")
        section_code = self.request.query_params.get("section_code")
        group_code = self.request.query_params.get("group_code")
        is_active = self.request.query_params.get("is_active")

        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile:
            queryset = queryset.filter(profile_id=profile)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        if section_code:
            queryset = queryset.filter(section__section_code=section_code)
        if group_code:
            queryset = queryset.filter(group_code=group_code)
        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")

        return queryset.order_by("period_id", "profile__sort_order", "section__sort_order", "sort_order", "id")


class KpiPeriodMetricViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiPeriodMetricSerializer
    write_serializer_class = KpiPeriodMetricWriteSerializer
    serializer_class = KpiPeriodMetricSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiPeriodMetric"
    validate_weights_on_save = True

    def get_queryset(self):
        queryset = KpiPeriodMetric.objects.select_related("period", "profile", "group", "group__section").all()
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile = self.request.query_params.get("profile")
        profile_code = self.request.query_params.get("profile_code")
        group_code = self.request.query_params.get("group_code")
        q = self.request.query_params.get("q")
        is_active = self.request.query_params.get("is_active")

        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile:
            queryset = queryset.filter(profile_id=profile)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
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

        return queryset.order_by("period_id", "profile__sort_order", "group__section__sort_order", "group__sort_order", "metric_code", "id")


class KpiPeriodGateConfigViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiPeriodGateConfigSerializer
    write_serializer_class = KpiPeriodGateConfigWriteSerializer
    serializer_class = KpiPeriodGateConfigSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiPeriodGateConfig"
    validate_weights_on_save = False

    def get_queryset(self):
        queryset = KpiPeriodGateConfig.objects.select_related("period", "profile", "gate_definition").all()
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile_code = self.request.query_params.get("profile_code")
        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        return queryset.order_by("period_id", "profile__sort_order", "gate_code")


class KpiRewardTierConfigViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiRewardTierConfigSerializer
    write_serializer_class = KpiRewardTierConfigWriteSerializer
    serializer_class = KpiRewardTierConfigSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiRewardTierConfig"
    validate_weights_on_save = False

    def get_queryset(self):
        queryset = KpiRewardTierConfig.objects.select_related("period", "profile").all()
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile_code = self.request.query_params.get("profile_code")
        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        return queryset.order_by("period_id", "profile__sort_order", "sort_order", "id")


class KpiGateDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiGateDefinitionSerializer
    permission_classes = [KpiConfigPermission]

    def get_queryset(self):
        queryset = KpiGateDefinition.objects.all()
        is_active = self.request.query_params.get("is_active")
        if is_active in ["true", "false"]:
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset.order_by("gate_code")


class KpiUserTargetViewSet(KpiPeriodConfigCrudMixin, viewsets.ModelViewSet):
    read_serializer_class = KpiUserTargetSerializer
    write_serializer_class = KpiUserTargetWriteSerializer
    serializer_class = KpiUserTargetSerializer
    permission_classes = [KpiConfigPermission]
    config_object_type = "KpiUserTarget"
    validate_weights_on_save = False

    def get_queryset(self):
        queryset = KpiUserTarget.objects.select_related("period", "profile", "metric", "user", "employee", "branch").all()
        queryset = filter_kpi_results_by_user(queryset, self.request.user)
        period = self.request.query_params.get("period")
        profile_code = self.request.query_params.get("profile_code")
        user = self.request.query_params.get("user")
        metric = self.request.query_params.get("metric")
        if period:
            queryset = queryset.filter(period_id=period)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        if user:
            queryset = queryset.filter(user_id=user)
        if metric:
            queryset = queryset.filter(metric_id=metric)
        return queryset.order_by("period_id", "profile__sort_order", "user_id", "metric__metric_code")

    def ensure_target_user_allowed(self, request, instance_or_serializer):
        if hasattr(instance_or_serializer, "validated_data"):
            profile = instance_or_serializer.validated_data.get("profile")
            metric = instance_or_serializer.validated_data.get("metric")
            target_user = instance_or_serializer.validated_data.get("user")
            if not profile and metric:
                profile = metric.profile
        else:
            profile = instance_or_serializer.profile
            target_user = instance_or_serializer.user
        if profile and target_user and not can_assign_target_for_profile(request.user, target_user, profile):
            raise DRFValidationError({"detail": "Bạn không có quyền set chỉ tiêu cho nhân viên thuộc bộ KPI này."})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.ensure_target_user_allowed(request, serializer)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self.ensure_target_user_allowed(request, instance)
        return super().update(request, *args, **kwargs)


class KpiUserMetricResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserMetricResultSerializer

    def get_permissions(self):
        if self.action == "calculate_auto":
            return [KpiAutoCalculatePermission()]
        return [KpiManualScorePermission()]

    def get_queryset(self):
        queryset = KpiUserMetricResult.objects.select_related(
            "period", "profile", "group", "metric", "user", "employee", "branch", "scored_by_user"
        ).all()
        queryset = filter_kpi_results_by_user(queryset, self.request.user)
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile_code = self.request.query_params.get("profile_code")
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
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
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

        return queryset.order_by("period_id", "profile__sort_order", "user_id", "group__sort_order", "metric__metric_code", "id")

    @action(methods=["post"], detail=False, url_path="manual-score")
    def manual_score(self, request):
        serializer = KpiManualScoreSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        target_user = serializer.validated_data["user"]
        if not can_score_target_user(request.user, target_user):
            return Response({"detail": "Bạn không có quyền chấm điểm KPI cho nhân viên này."}, status=status.HTTP_403_FORBIDDEN)

        period = serializer.validated_data["period"]
        profile = serializer.validated_data["profile"]
        metric = serializer.validated_data["metric"]
        old_result = KpiUserMetricResult.objects.filter(period=period, profile=profile, metric=metric, user=target_user).first()
        old_data = serialize_model_basic(old_result) if old_result else None
        result, created = serializer.save()
        create_kpi_audit_log(
            period=period,
            object_type="KpiUserMetricResult",
            object_id=result.id,
            action_type="CREATE" if created else "UPDATE",
            changed_by_user=request.user,
            old_data=old_data,
            new_data=serialize_model_basic(result),
            note="Nhập điểm KPI.",
        )
        return Response(
            {"detail": "Nhập điểm KPI thành công." if created else "Cập nhật điểm KPI thành công.", "created": created, "result": KpiUserMetricResultSerializer(result).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=False, url_path="calculate-auto")
    def calculate_auto(self, request):
        serializer = KpiAutoCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period = serializer.validated_data["period"]
        profile = serializer.validated_data.get("profile")
        target_user = serializer.validated_data.get("user")
        branch = serializer.validated_data.get("branch")
        users = [target_user] if target_user else list(get_default_kpi_users(branch_id=branch.id if branch else None))
        calculated_results = []
        for user in users:
            try:
                user_results = calculate_auto_kpis_for_user(period=period, profile=profile, user=user, calculated_by_user=request.user)
            except TypeError:
                user_results = calculate_auto_kpis_for_user(period=period, user=user, calculated_by_user=request.user)
            calculated_results.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "result_count": len(user_results),
                    "results": [KpiUserMetricResultSerializer(item["result"]).data for item in user_results],
                }
            )
        return Response({"detail": "Tính KPI tự động thành công.", "period": period.period_code, "profile": profile.profile_code if profile else None, "user_count": len(users), "results": calculated_results})


class KpiUserGateResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserGateResultSerializer
    permission_classes = [KpiManualScorePermission]

    def get_queryset(self):
        queryset = KpiUserGateResult.objects.select_related("period", "profile", "gate_config", "user", "employee", "branch").all()
        queryset = filter_kpi_results_by_user(queryset, self.request.user)
        period = self.request.query_params.get("period")
        profile_code = self.request.query_params.get("profile_code")
        user = self.request.query_params.get("user")
        branch = self.request.query_params.get("branch")
        gate_code = self.request.query_params.get("gate_code")
        is_passed = self.request.query_params.get("is_passed")
        if period:
            queryset = queryset.filter(period_id=period)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        if user:
            queryset = queryset.filter(user_id=user)
        if branch:
            queryset = queryset.filter(branch_id=branch)
        if gate_code:
            queryset = queryset.filter(gate_config__gate_code=gate_code)
        if is_passed in ["true", "false"]:
            queryset = queryset.filter(is_passed=is_passed == "true")
        return queryset.order_by("period_id", "profile__sort_order", "user_id", "gate_config__gate_code")


class KpiUserSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = KpiUserSummarySerializer

    def get_permissions(self):
        if self.action == "calculate":
            return [KpiAutoCalculatePermission()]
        return [KpiManualScorePermission()]

    def get_queryset(self):
        queryset = KpiUserSummary.objects.select_related("period", "profile", "user", "employee", "branch", "reward_tier").all()
        queryset = filter_kpi_results_by_user(queryset, self.request.user)
        period = self.request.query_params.get("period")
        period_code = self.request.query_params.get("period_code")
        profile_code = self.request.query_params.get("profile_code")
        user = self.request.query_params.get("user")
        branch = self.request.query_params.get("branch")
        reward_tier_code = self.request.query_params.get("reward_tier_code")
        if period:
            queryset = queryset.filter(period_id=period)
        if period_code:
            queryset = queryset.filter(period__period_code=period_code)
        if profile_code:
            queryset = queryset.filter(profile__profile_code=profile_code)
        if user:
            queryset = queryset.filter(user_id=user)
        if branch:
            queryset = queryset.filter(branch_id=branch)
        if reward_tier_code:
            queryset = queryset.filter(reward_tier_code=reward_tier_code)
        return queryset.order_by("period_id", "profile__sort_order", "-total_score", "id")

    @action(methods=["post"], detail=False, url_path="calculate")
    def calculate(self, request):
        serializer = KpiSummaryCalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period = serializer.validated_data["period"]
        profile = serializer.validated_data.get("profile")
        target_user = serializer.validated_data.get("user")
        branch = serializer.validated_data.get("branch")
        try:
            summaries = calculate_kpi_summaries(period=period, profile=profile, user=target_user, branch=branch, calculated_by_user=request.user)
        except TypeError:
            summaries = calculate_kpi_summaries(period=period, user=target_user, branch=branch, calculated_by_user=request.user)
        return Response({"detail": "Tổng hợp KPI thành công.", "period": period.period_code, "profile": profile.profile_code if profile else None, "summary_count": len(summaries), "summaries": KpiUserSummarySerializer(summaries, many=True).data})
