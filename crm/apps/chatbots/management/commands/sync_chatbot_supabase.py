from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from supabase import create_client

from apps.branches.models import Branch
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotState,
    ChatbotSyncCursor,
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

        affected_chat = self.sync_chat_logs(client, chat_table)
        affected_state = self.sync_states(client, state_table)
        affected_request = self.sync_requests(client, request_table)

        affected_sessions = affected_chat | affected_state | affected_request

        if affected_sessions:
            self.stdout.write(f"Rebuilding chatbot session summaries for {len(affected_sessions)} sessions...")
            rebuild_chatbot_session_summaries(affected_session_ids=affected_sessions)
        else:
            self.stdout.write("No new sessions to rebuild.")

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

    def fetch_incremental(self, client, table_name, since_date=None, time_column="created_at"):
        result = []
        start = 0
        batch_size = 1000

        while True:
            query = client.table(table_name).select("*")
            if since_date:
                query = query.gte(time_column, since_date.isoformat())
                
            response = query.range(start, start + batch_size - 1).execute()

            rows = response.data or []
            result.extend(rows)

            if len(rows) < batch_size:
                break

            start += batch_size

        return result

    def get_and_update_cursor(self, source_name, client, table_name, time_columns):
        cursor, _ = ChatbotSyncCursor.objects.get_or_create(source_name=source_name)
        last_synced_at = cursor.last_synced_at

        # We need to know which time column to filter on in Supabase
        # Default to created_at if multiple are possible, as Supabase usually prefers one.
        # But we pass it to fetch_incremental.
        # Since Supabase python client requires knowing the exact column name, 
        # we assume time_columns[0] is the primary one used in DB schema.
        time_column_db = time_columns[0]
        
        rows = self.fetch_incremental(client, table_name, since_date=last_synced_at, time_column=time_column_db)
        
        return rows, cursor

    def sync_chat_logs(self, client, table_name):
        # In Supabase, the column is usually created_at
        rows, cursor = self.get_and_update_cursor("xpro_chat_logs", client, table_name, ["created_at"])
        affected_sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")
            dt = parse_dt(get_value(row, "create_at", "created_at"))

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
                    "external_created_at": dt,
                    "raw_payload": row,
                },
            )
            affected_sessions.add(session_id)
            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        cursor.last_synced_at = max_dt
        cursor.last_row_count = len(rows)
        cursor.save()

        self.stdout.write(f"Synced chat logs: {len(rows)}")
        return affected_sessions

    # def sync_states(self, client, table_name):
    #     rows = self.fetch_all(client, table_name)

    #     for row in rows:
    #         external_id = str(get_value(row, "id", "external_id"))
    #         session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")

    #         if not external_id or not session_id:
    #             continue

    #         ChatbotState.objects.update_or_create(
    #             external_id=external_id,
    #             defaults={
    #                 "session_id": session_id,
    #                 "user_id": get_value(row, "user_id", "user_ID", "userId"),
    #                 "channel": get_value(row, "channel"),
    #                 "state": get_value(row, "state", "status"),
    #                 "step": get_value(row, "step"),
    #                 "answer": get_value(row, "answer"),
    #                 "category": get_value(row, "category", "categories", "catogeries"),
    #                 "external_created_at": parse_dt(get_value(row, "create_at", "created_at")),
    #                 "raw_payload": row,
    #             },
    #         )

    #     self.stdout.write(f"Synced states: {len(rows)}")
    def sync_states(self, client, table_name):
        rows, cursor = self.get_and_update_cursor("cskh_state", client, table_name, ["updated_at"])
        affected_sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")
            dt = parse_dt(get_value(row, "updated_at", "updatedAt"))

            if not external_id or not session_id:
                continue

            ChatbotState.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "step": get_value(row, "step"),
                    "reason": get_value(row, "reason"), # Đã thêm cột reason
                    # Lấy updated_at theo đúng schema Supabase
                    "external_created_at": dt,
                    "raw_payload": row,
                },
            )
            affected_sessions.add(session_id)
            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        cursor.last_synced_at = max_dt
        cursor.last_row_count = len(rows)
        cursor.save()

        self.stdout.write(f"Synced states: {len(rows)}")
        return affected_sessions

    def sync_requests(self, client, table_name):
        rows, cursor = self.get_and_update_cursor("cskh_requests", client, table_name, ["created_at"])
        affected_sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = str(get_value(row, "id", "external_id"))
            session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "")
            dt = parse_dt(get_value(row, "create_at", "created_at"))

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
                    "external_created_at": dt,
                    "raw_payload": row,
                },
            )
            affected_sessions.add(session_id)
            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        cursor.last_synced_at = max_dt
        cursor.last_row_count = len(rows)
        cursor.save()

        self.stdout.write(f"Synced CSKH requests: {len(rows)}")
        return affected_sessions

    