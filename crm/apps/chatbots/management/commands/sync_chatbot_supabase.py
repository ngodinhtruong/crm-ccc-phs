from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from supabase import create_client

from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotState,
    ChatbotSyncCursor,
)
from apps.chatbots.services import (
    create_crm_tickets_from_chatbot,
    rebuild_chatbot_session_summaries,
    resolve_default_branch,
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


def get_session_id(row):
    """session_id thô của một dòng; rỗng nghĩa là dòng không gắn được vào phiên."""
    return str(get_value(row, "session_id", "sessionID", "sessionId") or "").strip()


# Ba bảng nguồn chỉ khác nhau ở model đích, cột thời gian và vài cột riêng —
# phần còn lại (phân trang, mốc sync, gom session, cập nhật cursor) giống hệt
# nhau nên mô tả bằng dữ liệu và dùng chung một vòng nhập.
SYNC_SOURCES = (
    {
        "name": "xpro_chat_logs",
        "label": "Chat logs",
        "table_setting": "SUPABASE_XPRO_CHAT_TABLE",
        "model": ChatbotChatLog,
        "order_column": "created_at",
        "time_keys": ("created_at", "create_at"),
        # Chat log không có session_id vẫn nhập, xem như một phiên riêng.
        "allow_orphan_session": True,
        "extra_fields": lambda row: {
            "question": get_value(row, "question"),
            "answer": get_value(row, "answer"),
            "questionType": get_value(row, "questionType", "question_type"),
            "category": get_value(row, "category", "categories"),
        },
    },
    {
        "name": "cskh_state",
        "label": "CSKH states",
        "table_setting": "SUPABASE_CSKH_STATE_TABLE",
        "model": ChatbotState,
        "order_column": "updated_at",
        "time_keys": ("updated_at", "updatedAt", "created_at"),
        # State/Request không có session_id thì vô nghĩa: không biết gắn vào
        # phiên nào để tính ra nhóm xử lý.
        "allow_orphan_session": False,
        "extra_fields": lambda row: {
            "step": get_value(row, "step"),
            "reason": get_value(row, "reason"),
        },
    },
    {
        "name": "cskh_requests",
        "label": "CSKH requests",
        "table_setting": "SUPABASE_CSKH_REQUESTS_TABLE",
        "model": ChatbotCskhRequest,
        "order_column": "created_at",
        "time_keys": ("created_at", "create_at"),
        "allow_orphan_session": False,
        "extra_fields": lambda row: {
            "contact_info": get_value(row, "contact_info"),
            "contact_type": get_value(row, "contact_type"),
            "reason": get_value(row, "reason"),
            "status": get_value(row, "status"),
        },
    },
)


class Command(BaseCommand):
    help = "Sync chatbot data from Supabase into CRM"

    def add_arguments(self, parser):
        ticket_group = parser.add_mutually_exclusive_group()
        ticket_group.add_argument(
            "--create-tickets",
            dest="create_tickets",
            action="store_true",
            help="Tạo ticket CRM cho các phiên thuộc nhóm Chuyển CCC xử lý.",
        )
        ticket_group.add_argument(
            "--no-create-tickets",
            dest="create_tickets",
            action="store_false",
            help="Chỉ đồng bộ dữ liệu chatbot, không tạo ticket CRM.",
        )
        parser.set_defaults(create_tickets=True)
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

        affected_sessions = set()

        for source in SYNC_SOURCES:
            affected_sessions |= self.sync_source(client, source, full)

        if affected_sessions:
            self.stdout.write(
                f"Tính lại tổng hợp cho {len(affected_sessions)} phiên..."
            )
            rebuild_chatbot_session_summaries(affected_session_ids=affected_sessions)
        else:
            self.stdout.write("Không có phiên nào thay đổi.")

        if options["create_tickets"]:
            default_branch = resolve_default_branch(options["branch_code"])

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

    def save_cursor(self, cursor, max_dt, row_count):
        if max_dt:
            cursor.last_synced_at = max_dt

        cursor.last_row_count = row_count
        cursor.status = "SUCCESS"
        cursor.error_message = ""
        cursor.save()

    def sync_source(self, client, source, full):
        """Nhập một bảng nguồn, trả về tập session_id vừa đụng tới."""
        cursor, _ = ChatbotSyncCursor.objects.get_or_create(source_name=source["name"])
        rows = self.fetch_incremental(
            client,
            getattr(settings, source["table_setting"]),
            source["order_column"],
            since=None if full else cursor.last_synced_at,
        )

        model = source["model"]
        sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = get_value(row, "id", "external_id")

            if external_id is None:
                continue

            external_id = str(external_id)
            session_id = get_session_id(row)

            if not session_id:
                if not source["allow_orphan_session"]:
                    continue

                session_id = f"{ORPHAN_SESSION_PREFIX}-{external_id}"

            dt = parse_dt(get_value(row, *source["time_keys"]))

            model.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, "user_id", "user_ID", "userId"),
                    "channel": get_value(row, "channel"),
                    "external_created_at": dt,
                    "raw_payload": row,
                    **source["extra_fields"](row),
                },
            )

            sessions.add(session_id)

            if dt and (not max_dt or dt > max_dt):
                max_dt = dt

        self.save_cursor(cursor, max_dt, len(rows))
        self.stdout.write(f"{source['label']}: {len(rows)}")

        return sessions
