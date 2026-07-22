from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.scopes import filter_tickets_by_user
from apps.accounts.api_permissions import MasterDataPermission
from apps.tickets.serializers import (
    TicketSupportCategorySerializer,
    TicketClassificationSerializer,
    TicketStatusSerializer,
    TicketPrioritySerializer,
    TicketSourceSerializer,
    TicketErrorGroupSerializer,
    TicketErrorTypeSerializer,
)

from apps.tickets.models import (
    Ticket,
    TicketActivityLog,
    TicketFeedback,
    TicketSupportCategory,
    TicketClassification,
    TicketStatus,
    TicketPriority,
    TicketSource,
    TicketErrorGroup,
    TicketErrorType,
)

from apps.tickets.serializers import (
    TicketReadSerializer,
    TicketCreateSerializer,
    TicketAssignSerializer,
    TicketStatusUpdateSerializer,
    TicketAmendSerializer,
)
from apps.tickets.services import TicketService

class TicketSupportCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketSupportCategorySerializer

    def get_queryset(self):
        return TicketSupportCategory.objects.filter(
            is_active=True
        ).order_by("sort_order", "id")


class TicketClassificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketClassificationSerializer

    def get_queryset(self):
        queryset = TicketClassification.objects.select_related(
            "support_category"
        ).filter(is_active=True)

        support_category = self.request.query_params.get("support_category")

        if support_category:
            queryset = queryset.filter(support_category_id=support_category)

        return queryset.order_by("sort_order", "id")


class TicketStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketStatusSerializer

    def get_queryset(self):
        return TicketStatus.objects.filter(
            is_active=True
        ).order_by("sort_order", "id")


class TicketPriorityViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketPrioritySerializer

    def get_queryset(self):
        return TicketPriority.objects.filter(
            is_active=True
        ).order_by("level_order", "id")


class TicketSourceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketSourceSerializer

    def get_queryset(self):
        return TicketSource.objects.filter(
            is_active=True
        ).order_by("id")


class TicketErrorGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    serializer_class = TicketErrorGroupSerializer

    def get_queryset(self):
        queryset = TicketErrorGroup.objects.all()

        is_active = self.request.query_params.get("is_active")
        related_system = self.request.query_params.get("related_system")
        q = self.request.query_params.get("q")

        if is_active in {"true", "True", "1"}:
            queryset = queryset.filter(is_active=True)
        elif is_active in {"false", "False", "0"}:
            queryset = queryset.filter(is_active=False)

        if related_system:
            queryset = queryset.filter(related_system__icontains=related_system)

        if q:
            queryset = queryset.filter(
                Q(group_code__icontains=q)
                | Q(group_name__icontains=q)
                | Q(description__icontains=q)
                | Q(related_system__icontains=q)
            )

        return queryset.order_by("sort_order", "id")


class TicketErrorTypeViewSet(viewsets.ModelViewSet):
    permission_classes = [MasterDataPermission]
    serializer_class = TicketErrorTypeSerializer

    def get_queryset(self):
        queryset = TicketErrorType.objects.select_related("group").all()

        group = self.request.query_params.get("group") or self.request.query_params.get("error_group")
        is_active = self.request.query_params.get("is_active")
        related_system = self.request.query_params.get("related_system")
        q = self.request.query_params.get("q")

        if group:
            queryset = queryset.filter(group_id=group)

        if is_active in {"true", "True", "1"}:
            queryset = queryset.filter(is_active=True)
        elif is_active in {"false", "False", "0"}:
            queryset = queryset.filter(is_active=False)

        if related_system:
            queryset = queryset.filter(
                Q(related_system__icontains=related_system)
                | Q(group__related_system__icontains=related_system)
            )

        if q:
            queryset = queryset.filter(
                Q(type_code__icontains=q)
                | Q(type_name__icontains=q)
                | Q(description__icontains=q)
                | Q(group__group_code__icontains=q)
                | Q(group__group_name__icontains=q)
            )

        return queryset.order_by("group__sort_order", "sort_order", "id")



class TicketViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Ticket.objects.select_related(
            "customer",
            "company",
            "customer_account",
            "handling_branch",
            "assigned_unit",
            "assigned_employee",
            "owner_user",
            "support_category",
            "classification",
            "current_status",
            "priority",
            "source",
            "sla_policy",
            "error_group",
            "error_type",
        ).all()

        queryset = filter_tickets_by_user(queryset, self.request.user)

        params = self.request.query_params

        q = params.get("q")

        ticket_code = params.get("ticket_code")
        title = params.get("title")
        classification_method = params.get("classification_method")
        source_ref_id = params.get("source_ref_id")
        exclude_chatbot = params.get("exclude_chatbot")

        customer_name = params.get("customer_name")
        customer_phone = params.get("customer_phone")
        customer_account_no = params.get("customer_account_no") or params.get("account_number")
        raw_account_number = params.get("raw_account_number")
        account_link_status = params.get("account_link_status")
        company_name = params.get("company_name")

        handling_branch = params.get("handling_branch") or params.get("branch")
        assigned_unit = params.get("assigned_unit")
        assigned_employee = params.get("assigned_employee")
        owner_user = params.get("owner_user")

        support_category = params.get("support_category")
        classification = params.get("classification")
        current_status = params.get("current_status") or params.get("status")
        priority = params.get("priority")
        source = params.get("source")
        sla_policy = params.get("sla_policy")

        request_content = params.get("request_content")
        handling_solution = params.get("handling_solution")
        final_response = params.get("final_response")

        is_error_ticket = params.get("is_error_ticket") or params.get("has_error")
        error_group = params.get("error_group")
        error_type = params.get("error_type")
        error_note = params.get("error_note")
        related_system = params.get("related_system")
        external_status = params.get("external_status")

        customer = params.get("customer")
        company = params.get("company")

        created_from = params.get("created_from")
        created_to = params.get("created_to")
        updated_from = params.get("updated_from")
        updated_to = params.get("updated_to")

        support_category_name = params.get("support_category_name")
        classification_name = params.get("classification_name")
        status_name = params.get("status_name")
        priority_name = params.get("priority_name")
        source_name = params.get("source_name")
        sla_policy_name = params.get("sla_policy_name")

        handling_branch_name = params.get("handling_branch_name")
        assigned_unit_name = params.get("assigned_unit_name")
        assigned_employee_name = params.get("assigned_employee_name")
        owner_user_name = params.get("owner_user_name")

        if q:
            queryset = queryset.filter(
                Q(ticket_code__icontains=q)
                | Q(title__icontains=q)
                | Q(request_content__icontains=q)
                | Q(handling_solution__icontains=q)
                | Q(final_response__icontains=q)
                | Q(source_ref_id__icontains=q)
                | Q(error_note__icontains=q)
                | Q(related_system__icontains=q)
                | Q(error_group__group_code__icontains=q)
                | Q(error_group__group_name__icontains=q)
                | Q(error_type__type_code__icontains=q)
                | Q(error_type__type_name__icontains=q)
                | Q(customer__full_name__icontains=q)
                | Q(customer__phone__icontains=q)
                | Q(customer__email__icontains=q)
                | Q(company__company_name__icontains=q)
                | Q(customer_account__account_number__icontains=q)
                | Q(raw_account_number__icontains=q)
                | Q(owner_user__username__icontains=q)
                | Q(owner_user__email__icontains=q)
                | Q(assigned_employee__full_name__icontains=q)
            )

        if ticket_code:
            queryset = queryset.filter(ticket_code__icontains=ticket_code)

        if title:
            queryset = queryset.filter(title__icontains=title)

        if classification_method:
            queryset = queryset.filter(classification_method=classification_method)

        if source_ref_id:
            queryset = queryset.filter(source_ref_id__icontains=source_ref_id)

        # Chỉ loại đúng các Ticket đã được liên kết từ ChatbotSessionSummary.
        # Không dùng classification_method=AUTO vì còn có thể có Ticket tự động
        # từ các nguồn/API khác không phải chatbot.
        if exclude_chatbot in {"true", "True", "1"}:
            queryset = queryset.filter(chatbot_sessions__isnull=True)

        if customer_name:
            queryset = queryset.filter(customer__full_name__icontains=customer_name)

        if customer_phone:
            queryset = queryset.filter(customer__phone__icontains=customer_phone)

        if customer_account_no:
            queryset = queryset.filter(
                Q(customer_account__account_number__icontains=customer_account_no)
                | Q(raw_account_number__icontains=customer_account_no)
            )

        if raw_account_number:
            queryset = queryset.filter(raw_account_number__icontains=raw_account_number)

        if account_link_status:
            queryset = queryset.filter(account_link_status=account_link_status)

        if company_name:
            queryset = queryset.filter(company__company_name__icontains=company_name)

        if customer:
            queryset = queryset.filter(customer_id=customer)

        if company:
            queryset = queryset.filter(company_id=company)

        if handling_branch:
            queryset = queryset.filter(handling_branch_id=handling_branch)

        if assigned_unit:
            queryset = queryset.filter(assigned_unit_id=assigned_unit)

        if assigned_employee:
            queryset = queryset.filter(assigned_employee_id=assigned_employee)

        if owner_user:
            queryset = queryset.filter(owner_user_id=owner_user)

        if support_category:
            queryset = queryset.filter(support_category_id=support_category)

        if classification:
            queryset = queryset.filter(classification_id=classification)

        if current_status:
            if str(current_status).isdigit():
                queryset = queryset.filter(current_status_id=current_status)
            else:
                queryset = queryset.filter(current_status__status_code=current_status)

        if priority:
            queryset = queryset.filter(priority_id=priority)

        if source:
            queryset = queryset.filter(source_id=source)

        if sla_policy:
            queryset = queryset.filter(sla_policy_id=sla_policy)

        if request_content:
            queryset = queryset.filter(request_content__icontains=request_content)

        if handling_solution:
            queryset = queryset.filter(handling_solution__icontains=handling_solution)

        if final_response:
            queryset = queryset.filter(final_response__icontains=final_response)

        if is_error_ticket in {"true", "True", "1"}:
            queryset = queryset.filter(
                Q(error_group__isnull=False)
                | Q(error_type__isnull=False)
            )
        elif is_error_ticket in {"false", "False", "0"}:
            queryset = queryset.filter(
                error_group__isnull=True,
                error_type__isnull=True,
            )

        if error_group:
            queryset = queryset.filter(error_group_id=error_group)

        if error_type:
            queryset = queryset.filter(error_type_id=error_type)


        if error_note:
            queryset = queryset.filter(error_note__icontains=error_note)

        if related_system:
            queryset = queryset.filter(related_system__icontains=related_system)

        if external_status:
            queryset = queryset.filter(external_status__icontains=external_status)

        if created_from:
            queryset = queryset.filter(created_at__date__gte=created_from)

        if created_to:
            queryset = queryset.filter(created_at__date__lte=created_to)

        if updated_from:
            queryset = queryset.filter(updated_at__date__gte=updated_from)

        if updated_to:
            queryset = queryset.filter(updated_at__date__lte=updated_to)

        if support_category_name:
            queryset = queryset.filter(
                support_category__category_name__icontains=support_category_name
            )

        if classification_name:
            queryset = queryset.filter(
                classification__classification_name__icontains=classification_name
            )

        if status_name:
            queryset = queryset.filter(
                current_status__status_name__icontains=status_name
            )

        if priority_name:
            queryset = queryset.filter(
                priority__priority_name__icontains=priority_name
            )

        if source_name:
            queryset = queryset.filter(
                source__source_name__icontains=source_name
            )

        if sla_policy_name:
            queryset = queryset.filter(
                sla_policy__sla_name__icontains=sla_policy_name
            )

        if handling_branch_name:
            queryset = queryset.filter(
                handling_branch__branch_name__icontains=handling_branch_name
            )

        if assigned_unit_name:
            queryset = queryset.filter(
                assigned_unit__unit_name__icontains=assigned_unit_name
            )

        if assigned_employee_name:
            queryset = queryset.filter(
                assigned_employee__full_name__icontains=assigned_employee_name
            )

        if owner_user_name:
            queryset = queryset.filter(
                Q(owner_user__username__icontains=owner_user_name)
                | Q(owner_user__email__icontains=owner_user_name)
                | Q(owner_user__first_name__icontains=owner_user_name)
                | Q(owner_user__last_name__icontains=owner_user_name)
            )

        return queryset.order_by("-id")

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer

        if self.action == "assign":
            return TicketAssignSerializer

        if self.action == "status":
            return TicketStatusUpdateSerializer

        if self.action == "amend":
            return TicketAmendSerializer

        return TicketReadSerializer

    def handle_service_error(self, exc):
        if isinstance(exc, DjangoPermissionDenied):
            raise PermissionDenied(str(exc))

        if isinstance(exc, DjangoValidationError):
            raise ValidationError(exc.messages)

        raise exc

    def create(self, request, *args, **kwargs):
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            ticket = TicketService.create_ticket(
                **serializer.validated_data,
                created_by_user=request.user,
            )
        except Exception as exc:
            self.handle_service_error(exc)

        read_serializer = TicketReadSerializer(ticket)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        ticket = self.get_object()

        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            TicketService.assign_ticket(
                ticket=ticket,
                **serializer.validated_data,
                assigned_by_user=request.user,
            )
        except Exception as exc:
            self.handle_service_error(exc)

        ticket.refresh_from_db()
        read_serializer = TicketReadSerializer(ticket)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="status")
    def status(self, request, pk=None):
        ticket = self.get_object()

        serializer = TicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            TicketService.update_status(
                ticket=ticket,
                **serializer.validated_data,
                updated_by_user=request.user,
            )
        except Exception as exc:
            self.handle_service_error(exc)

        ticket.refresh_from_db()
        read_serializer = TicketReadSerializer(ticket)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="amend")
    def amend(self, request, pk=None):
        ticket = self.get_object()

        serializer = TicketAmendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            TicketService.amend_ticket(
                ticket=ticket,
                **serializer.validated_data,
                updated_by_user=request.user,
            )
        except Exception as exc:
            self.handle_service_error(exc)

        ticket.refresh_from_db()
        read_serializer = TicketReadSerializer(ticket)
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="survey")
    def survey(self, request, pk=None):
        """Đánh dấu gửi khảo sát hài lòng cho ticket (tạo/cập nhật TicketFeedback)."""
        ticket = self.get_object()
        send = bool(request.data.get("send_survey"))

        feedback, _ = TicketFeedback.objects.update_or_create(
            ticket=ticket,
            defaults={
                "customer": ticket.customer,
                "survey_sent": send,
                "survey_status": "SENT" if send else "NOT_SENT",
                "sent_at": timezone.now() if send else None,
                "updated_at": timezone.now(),
            },
        )

        return Response(
            {
                "ticket": ticket.id,
                "survey_sent": feedback.survey_sent,
                "survey_status": feedback.survey_status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """Lịch sử thay đổi ticket: đổi gì, từ → đến, ai đổi, khi nào."""
        ticket = self.get_object()

        logs = (
            TicketActivityLog.objects.filter(ticket=ticket)
            .select_related("created_by_user")
            .order_by("-created_at", "-id")
        )

        data = [
            {
                "id": log.id,
                "action_type": log.action_type,
                "action_name": log.action_name,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "changed_by": (
                    str(log.created_by_user) if log.created_by_user else ""
                ),
                "created_at": log.created_at,
                "note": log.note,
            }
            for log in logs
        ]

        return Response(data, status=status.HTTP_200_OK)