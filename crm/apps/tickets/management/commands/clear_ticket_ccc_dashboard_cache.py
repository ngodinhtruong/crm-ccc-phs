from django.core.management.base import BaseCommand

from apps.tickets.dashboard_cache import invalidate_ticket_dashboard_cache


class Command(BaseCommand):
    help = "Làm mới toàn bộ cache Dashboard CCC Ticket."

    def handle(self, *args, **options):
        invalidate_ticket_dashboard_cache()
        self.stdout.write(
            self.style.SUCCESS("Đã làm mới cache Dashboard CCC Ticket.")
        )
