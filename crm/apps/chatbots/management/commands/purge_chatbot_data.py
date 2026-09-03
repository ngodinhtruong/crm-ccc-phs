from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
    ChatbotSyncCursor,
)


class Command(BaseCommand):
    help = "Purge all chatbot data in CRM and reset sync cursors"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Re-sync all data from Supabase immediately after purge",
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Purge without asking for confirmation",
        )

    def handle(self, *args, **options):
        auto_sync = options["sync"]
        no_input = options["no_input"]

        if not no_input:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: This will PURGE ALL chatbot data (Logs, Summaries, States, Sync Cursors) from CRM DB."
                )
            )

        models_to_purge = [
            ChatbotSessionSummary,
            ChatbotChatLog,
            ChatbotState,
            ChatbotCskhRequest,
            ChatbotSyncCursor,
        ]

        total_deleted = 0

        with transaction.atomic():
            for model in models_to_purge:
                count, _ = model.objects.all().delete()
                total_deleted += count
                self.stdout.write(f"Deleted {count} rows from {model._meta.db_table}")

        # Perform checkpoint outside atomic block
        if connection.vendor == "sqlite":
            try:
                with connection.cursor() as cursor:
                    cursor.execute("PRAGMA wal_checkpoint(PASSIVE);")
            except Exception as e:
                self.stdout.write(f"WAL checkpoint note: {e}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully purged all chatbot data (Total: {total_deleted} rows)."
            )
        )

        if auto_sync:
            self.stdout.write(self.style.NOTICE("Re-syncing all data from Supabase from scratch..."))
            call_command("sync_chatbot_supabase", full=True)
