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

BATCH_SIZE = 1000

# Một số dòng trên Supabase có session_id rỗng (chủ yếu là câu chào/rác từ
# tài khoản test). Vẫn phải nhập để không thiếu lượt ở "tổng tiếp nhận",
# nên gán cho mỗi dòng một session riêng thay vì bỏ qua.
ORPHAN_SESSION_PREFIX = "no-session"


def get_value(row, *keys):
    for key in keys:
        value = row.get(key)

        if value is not None:
            return value

    return None


def parse_dt(value):
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value

    return parse_datetime(str(value))


def get_session_id(row, external_id):
    session_id = str(get_value(row, "session_id", "sessionID", "sessionId") or "").strip()

    return session_id or f"{ORPHAN_SESSION_PREFIX}-{external_id}"


class Command(BaseCommand):
    help = "Sync chatbot data from Supabase into CRM"

    def add_arguments(self, parser):
        parser.add_argument(
            "--create-tickets",
            action="store_true",
            help="Tạo ticket CRM cho các phiên đã có trong cskh_requests",
        )
        parser.add_argument(
            "--branch-code",
            type=str,
            default=None,
            help="Mã chi nhánh xử lý mặc định cho ticket từ chatbot",
        )
        parser.add_argument(
            "--full",
            action="store_true",
            help="Kéo lại toàn bộ dữ liệu, bỏ qua mốc sync lần trước",
        )

    def handle(self, *args, **options):
        supabase_url = getattr(settings, "SUPABASE_URL", None)
        supabase_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)

        if not supabase_url or not supabase_key:
            raise RuntimeError(
                "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong settings."
            )

        client = create_client(supabase_url, supabase_key)
        full = options["full"]

        chat_table = settings.SUPABASE_XPRO_CHAT_TABLE
        state_table = settings.SUPABASE_CSKH_STATE_TABLE
        request_table = settings.SUPABASE_CSKH_REQUESTS_TABLE

        affected_sessions = set()
        affected_sessions |= self.sync_chat_logs(client, chat_table, full)
        affected_sessions |= self.sync_states(client, state_table, full)
        affected_sessions |= self.sync_requests(client, request_table, full)

        if affected_sessions:
            self.stdout.write(
                f"Tính lại tổng hợp cho {len(affected_sessions)} phiên..."
            )
            rebuild_chatbot_session_summaries(affected_session_ids=affected_sessions)
        else:
            self.stdout.write("Không có phiên nào thay đổi.")

        if options["create_tickets"]:
            branch_code = options["branch_code"]

            if branch_code:
                default_branch = Branch.objects.filter(branch_code=branch_code).first()
            else:
                default_branch = Branch.objects.first()

            if not default_branch:
                raise RuntimeError("Chưa có chi nhánh nào. Hãy tạo Branch trước.")

            created = create_crm_tickets_from_chatbot(default_branch=default_branch)
            self.stdout.write(f"Đã tạo {created} ticket CRM từ chatbot.")

        self.stdout.write(self.style.SUCCESS("Sync chatbot hoàn tất."))

    def fetch_incremental(self, client, table_name, time_column, since=None):
        rows = []
        start = 0

        while True:
            query = client.table(table_name).select("*").order(time_column)

            if since:
                query = query.gte(time_column, since.isoformat())

            response = query.range(start, start + BATCH_SIZE - 1).execute()
            batch = response.data or []
            rows.extend(batch)

            if len(batch) < BATCH_SIZE:
                break

            start += BATCH_SIZE

        return rows

    def load_rows(self, source_name, client, table_name, time_column, full):
        cursor, _ = ChatbotSyncCursor.objects.get_or_create(source_name=source_name)
        since = None if full else cursor.last_synced_at

        rows = self.fetch_incremental(client, table_name, time_column, since=since)

        return rows, cursor

    def save_cursor(self, cursor, max_dt, row_count):
        if max_dt:
            cursor.last_synced_at = max_dt

        cursor.last_row_count = row_count
        cursor.status = "SUCCESS"
        cursor.error_message = ""
        cursor.save()

    def sync_chat_logs(self, client, table_name, full):
        rows, cursor = self.load_rows(
            "xpro_chat_logs", client, table_name, "created_at", full
        )

        sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = get_value(row, "id", "external_id")

            if external_id is None:
                continue

            external_id = str(external_id)
            session_id = get_session_id(row, external_id)
            dt = parse_dt(get_value(row, "created_at", "create_at"))

            ChatbotChatLog.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "question": get_value(row, "question"),
                    "answer": get_value(row, "answer"),
                    "questionType": get_value(row, "questionType", "question_type"),
                    "category": get_value(row, "category", "categories"),
                    "external_created_at": dt,
                    "raw_payload": row,
                },
            )

            sessions.add(session_id)

            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        self.save_cursor(cursor, max_dt, len(rows))
        self.stdout.write(f"Chat logs: {len(rows)}")

        return sessions

    def sync_states(self, client, table_name, full):
        rows, cursor = self.load_rows(
            "cskh_state", client, table_name, "updated_at", full
        )

        sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = get_value(row, "id", "external_id")
            session_id = str(
                get_value(row, "session_id", "sessionID", "sessionId") or ""
            ).strip()

            # State/Request không có session_id thì vô nghĩa, không gắn được vào phiên nào
            if external_id is None or not session_id:
                continue

            dt = parse_dt(get_value(row, "updated_at", "updatedAt", "created_at"))

            ChatbotState.objects.update_or_create(
                external_id=str(external_id),
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "step": get_value(row, "step"),
                    "reason": get_value(row, "reason"),
                    "external_created_at": dt,
                    "raw_payload": row,
                },
            )

            sessions.add(session_id)

            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        self.save_cursor(cursor, max_dt, len(rows))
        self.stdout.write(f"CSKH states: {len(rows)}")

        return sessions

    def sync_requests(self, client, table_name, full):
        rows, cursor = self.load_rows(
            "cskh_requests", client, table_name, "created_at", full
        )

        sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = get_value(row, "id", "external_id")
            session_id = str(
                get_value(row, "session_id", "sessionID", "sessionId") or ""
            ).strip()

            if external_id is None or not session_id:
                continue

            dt = parse_dt(get_value(row, "created_at", "create_at"))

            ChatbotCskhRequest.objects.update_or_create(
                external_id=str(external_id),
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

            sessions.add(session_id)

            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        self.save_cursor(cursor, max_dt, len(rows))
        self.stdout.write(f"CSKH requests: {len(rows)}")

        return sessions
