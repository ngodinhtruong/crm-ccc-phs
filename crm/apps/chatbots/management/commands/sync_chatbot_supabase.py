from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from supabase import create_client

from apps.branches.models import Branch
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotState,
)
from apps.chatbots.services import (
    create_crm_tickets_from_chatbot,
    rebuild_chatbot_session_summaries,
)


def get_value(row, *keys):
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]

    return None


def parse_dt(value):
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value

    return parse_datetime(str(value))


class Command(BaseCommand):
    help = "Sync chatbot data from Supabase into CRM"

    def add_arguments(self, parser):
        parser.add_argument(
            "--create-tickets",
            action="store_true",
            help="Create CRM tickets for sessions existing in cskh_requests",
        )
        parser.add_argument(
            "--branch-code",
            type=str,
            default=None,
            help="Default handling branch code for chatbot tickets",
        )

    def handle(self, *args, **options):
        supabase_url = getattr(settings, "SUPABASE_URL", None)
        supabase_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)

        if not supabase_url or not supabase_key:
            raise RuntimeError(
                "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in settings."
            )

        client = create_client(supabase_url, supabase_key)

        chat_table = getattr(settings, "SUPABASE_XPRO_CHAT_TABLE", "xpro_chat")
        state_table = getattr(settings, "SUPABASE_CSKH_STATE_TABLE", "cskh_state")
        request_table = getattr(settings, "SUPABASE_CSKH_REQUESTS_TABLE", "cskh_requests")

        self.sync_chat_logs(client, chat_table)
        self.sync_states(client, state_table)
        self.sync_requests(client, request_table)

        self.stdout.write("Rebuilding chatbot session summaries...")
        rebuild_chatbot_session_summaries()

        if options["create_tickets"]:
            branch_code = options["branch_code"]

            if branch_code:
                default_branch = Branch.objects.filter(branch_code=branch_code).first()
            else:
                default_branch = Branch.objects.first()

            if not default_branch:
                raise RuntimeError("No branch found. Please create branch first.")

            self.stdout.write("Creating CRM tickets from chatbot CCC sessions...")
            create_crm_tickets_from_chatbot(default_branch=default_branch)

        self.stdout.write(self.style.SUCCESS("Sync chatbot data completed."))

    def fetch_all(self, client, table_name):
        result = []
        start = 0
        batch_size = 1000

        while True:
            response = (
                client.table(table_name)
                .select("*")
                .range(start, start + batch_size - 1)
                .execute()
            )

            rows = response.data or []
            result.extend(rows)

            if len(rows) < batch_size:
                break

            start += batch_size

        return result

    def sync_chat_logs(self, client, table_name):
        rows = self.fetch_all(client, table_name)

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")

            if not external_id or not session_id:
                continue

            ChatbotChatLog.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "question": get_value(row, "question"),
                    "answer": get_value(row, "answer"),
                    "category": get_value(row, "category", "categories", "catogeries"),
                    "external_created_at": parse_dt(get_value(row, "create_at", "created_at")),
                    "raw_payload": row,
                },
            )

        self.stdout.write(f"Synced chat logs: {len(rows)}")

    def sync_states(self, client, table_name):
        rows = self.fetch_all(client, table_name)

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")

            if not external_id or not session_id:
                continue

            ChatbotState.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "state": get_value(row, "state", "status"),
                    "step": get_value(row, "step"),
                    "answer": get_value(row, "answer"),
                    "category": get_value(row, "category", "categories", "catogeries"),
                    "external_created_at": parse_dt(get_value(row, "create_at", "created_at")),
                    "raw_payload": row,
                },
            )

        self.stdout.write(f"Synced states: {len(rows)}")

    def sync_requests(self, client, table_name):
        rows = self.fetch_all(client, table_name)

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")

            if not external_id or not session_id:
                continue

            ChatbotCskhRequest.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "contact_info": get_value(row, "contact_info"),
                    "contact_type": get_value(row, "contact_type"),
                    "reason": get_value(row, "reason"),
                    "status": get_value(row, "status"),
                    "external_created_at": parse_dt(get_value(row, "create_at", "created_at")),
                    "raw_payload": row,
                },
            )

        self.stdout.write(f"Synced CSKH requests: {len(rows)}")

    