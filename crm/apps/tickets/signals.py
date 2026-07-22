from django.db import transaction
from django.db.models.signals import post_delete, post_save

from apps.tickets.dashboard_cache import invalidate_ticket_dashboard_cache
from apps.tickets.models import (
    Tag,
    Ticket,
    TicketClassification,
    TicketErrorGroup,
    TicketErrorType,
    TicketFeedback,
    TicketSource,
    TicketStatus,
    TicketSupportCategory,
    TicketTag,
)


def _schedule_dashboard_invalidation(**kwargs):
    transaction.on_commit(invalidate_ticket_dashboard_cache)


DASHBOARD_MODELS = (
    Ticket,
    TicketFeedback,
    TicketTag,
    Tag,
    TicketSupportCategory,
    TicketClassification,
    TicketStatus,
    TicketSource,
    TicketErrorGroup,
    TicketErrorType,
)

for model in DASHBOARD_MODELS:
    post_save.connect(
        _schedule_dashboard_invalidation,
        sender=model,
        weak=False,
        dispatch_uid=f"tickets.dashboard.invalidate.save.{model._meta.label_lower}",
    )
    post_delete.connect(
        _schedule_dashboard_invalidation,
        sender=model,
        weak=False,
        dispatch_uid=f"tickets.dashboard.invalidate.delete.{model._meta.label_lower}",
    )

# SLA data belongs to another app but directly affects this dashboard.
try:
    from apps.sla.models import TicketSlaTracking
except ImportError:  # pragma: no cover - protects partial app loading
    TicketSlaTracking = None

if TicketSlaTracking is not None:
    post_save.connect(
        _schedule_dashboard_invalidation,
        sender=TicketSlaTracking,
        weak=False,
        dispatch_uid="tickets.dashboard.invalidate.save.sla_tracking",
    )
    post_delete.connect(
        _schedule_dashboard_invalidation,
        sender=TicketSlaTracking,
        weak=False,
        dispatch_uid="tickets.dashboard.invalidate.delete.sla_tracking",
    )
