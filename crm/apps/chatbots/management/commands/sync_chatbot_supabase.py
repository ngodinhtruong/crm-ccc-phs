from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.chatbots.dashboard.periods import DASHBOARD_TIMEZONE
from supabase import create_client

from apps.chatbots.models import ChatbotChatLog, ChatbotSyncCursor
from apps.chatbots.services import (
    create_crm_tickets_from_chatbot,
    rebuild_chatbot_session_summaries,
    resolve_default_branch,
)
from apps.chatbots.sources import (
    DEFAULT_SESSION_KEYS,
    SYNC_SOURCES,
    get_value,
)

BATCH_SIZE = 1000

# Một số dòng trên Supabase có khóa phiên rỗng (chủ yếu là câu chào/rác từ
# tài khoản test). Vẫn phải nhập để không thiếu lượt ở "tổng tiếp nhận",
# nên gán cho mỗi dòng một session riêng thay vì bỏ qua.
ORPHAN_SESSION_PREFIX = "no-session"


def parse_dt(value):
    """
    Chuẩn hóa mốc thời gian từ Supabase về datetime có múi giờ Việt Nam.

    Mọi mốc trên Supabase đều là GIỜ VIỆT NAM, kể cả các cột ``timestamptz``:
    n8n ghi giờ địa phương rồi Postgres tự dán ``+00:00`` vào, biến nó thành
    UTC giả. Đối chiếu phân bố giờ trong ngày của xpro_chat_logs với
    chat_questions và cskh_* thì thấy rõ điều đó.

    Vì vậy lấy nguyên con số giờ-phút-giây, bỏ offset (nếu có) rồi gán
    Asia/Ho_Chi_Minh — không cộng trừ gì. Ghi thẳng DASHBOARD_TIMEZONE thay vì
    ``timezone.get_current_timezone()`` để cách đọc dữ liệu không đổi theo
    ``settings.TIME_ZONE``: đổi setting đó là mọi mốc lệch 7 tiếng mà không có
    gì báo.

    Không gắn múi giờ thì Django cảnh báo rồi hiểu ngầm là UTC, và phép so
    ``dt > max_dt`` với mốc lấy từ DB sẽ ném
    ``TypeError: can't compare offset-naive and offset-aware datetimes``.
    """
    if not value:
        return None

    dt = value if hasattr(value, "isoformat") else parse_datetime(str(value))

    if not dt:
        return None

    if not timezone.is_naive(dt):
        dt = dt.replace(tzinfo=None)

    return dt.replace(tzinfo=DASHBOARD_TIMEZONE)


def get_session_id(row, keys=DEFAULT_SESSION_KEYS):
    """
    Khóa gom phiên của một dòng; rỗng nghĩa là dòng không gắn được vào phiên.

    Mỗi bảng nguồn để khóa này ở một cột khác nhau (``session_id`` với XPro,
    ``sender_id`` với Zalo) nên tên cột do chính nguồn khai báo.
    """
    return str(get_value(row, *keys) or "").strip()


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
                f"Tinh lai tong hop cho {len(affected_sessions)} phien..."
            )
            rebuild_chatbot_session_summaries(affected_session_ids=affected_sessions)
        else:
            self.stdout.write("Khong co phien nao thay doi.")

        if options["create_tickets"]:
            default_branch = resolve_default_branch(options["branch_code"])

            if not default_branch:
                raise RuntimeError("Chua co chi nhanh nao. Hay tao Branch truo-c.")

            created = create_crm_tickets_from_chatbot(default_branch=default_branch)
            self.stdout.write(f"Da tao {created} ticket CRM tu chatbot.")

        self.stdout.write(self.style.SUCCESS("Sync chatbot hoan tat."))

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
        cursor, _ = ChatbotSyncCursor.objects.get_or_create(source_name=source.name)
        rows = self.fetch_incremental(
            client,
            getattr(settings, source.table_setting),
            source.order_column,
            since=None if full else cursor.last_synced_at,
        )

        sessions = set()
        max_dt = cursor.last_synced_at

        for row in rows:
            external_id = get_value(row, "id", "external_id")

            if external_id is None:
                continue

            # Dòng chat không có cả câu hỏi lẫn câu trả lời thì không phải một
            # lượt trò chuyện — bỏ để không sinh phiên rỗng trên dashboard.
            if source.model is ChatbotChatLog and not (
                get_value(row, "question") or get_value(row, "answer")
            ):
                continue

            external_id = str(external_id)
            session_id = get_session_id(row, source.session_keys)

            if not session_id:
                if not source.allow_orphan_session:
                    continue

                session_id = f"{ORPHAN_SESSION_PREFIX}-{source.name}-{external_id}"

            dt = parse_dt(get_value(row, *source.time_keys))

            # Nguồn nào đổ chung bảng thì source_name phải nằm trong khóa tra:
            # id của xpro_chat_logs và chat_questions trùng dải nhau.
            lookup = {"external_id": external_id}

            if source.track_source:
                lookup["source_name"] = source.name

            source.model.objects.update_or_create(
                **lookup,
                defaults={
                    "session_id": session_id,
                    "user_id": get_value(row, *source.user_keys),
                    "channel": get_value(row, "platform", "channel"),
                    "external_created_at": dt,
                    "raw_payload": row,
                    **source.extra_fields(row),
                },
            )

            sessions.add(session_id)

            if dt:
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                if max_dt and timezone.is_naive(max_dt):
                    max_dt = timezone.make_aware(max_dt, timezone.get_current_timezone())

                if not max_dt or dt > max_dt:
                    max_dt = dt

        self.save_cursor(cursor, max_dt, len(rows))
        self.stdout.write(f"{source.label}: {len(rows)}")

        return sessions
