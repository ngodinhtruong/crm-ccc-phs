from django.apps import AppConfig


class TicketsConfig(AppConfig):
    name = "apps.tickets"

    def ready(self):
        # Register dashboard cache invalidation signals.
        from apps.tickets import signals  # noqa: F401
