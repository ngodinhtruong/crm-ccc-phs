from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.scopes import filter_tickets_by_user
from apps.tickets.models import Ticket
from apps.tickets.serializers import (
    TicketReadSerializer,
    TicketCreateSerializer,
    TicketAssignSerializer,
    TicketStatusUpdateSerializer,
    TicketAmendSerializer,
)
from apps.tickets.services import TicketService


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
            "support_category",
            "classification",
            "current_status",
            "priority",
            "source",
            "sla_policy",
            "created_by_user",
            "updated_by_user",
        ).all().order_by("-created_at")

        queryset = filter_tickets_by_user(queryset, self.request.user)

        status_code = self.request.query_params.get("status")
        priority_id = self.request.query_params.get("priority")
        branch_id = self.request.query_params.get("branch")
        assigned_employee_id = self.request.query_params.get("assigned_employee")
        customer_id = self.request.query_params.get("customer")
        keyword = self.request.query_params.get("q")

        if status_code:
            queryset = queryset.filter(current_status__status_code=status_code)

        if priority_id:
            queryset = queryset.filter(priority_id=priority_id)

        if branch_id:
            queryset = queryset.filter(handling_branch_id=branch_id)

        if assigned_employee_id:
            queryset = queryset.filter(assigned_employee_id=assigned_employee_id)

        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        if keyword:
            queryset = queryset.filter(
                Q(ticket_code__icontains=keyword)
                | Q(title__icontains=keyword)
                | Q(request_content__icontains=keyword)
                | Q(customer__full_name__icontains=keyword)
                | Q(customer__phone__icontains=keyword)
            )

        return queryset

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