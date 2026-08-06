"""
Sinh trọn bộ dữ liệu khảo sát CSAT: khách hàng, ticket và kết quả khảo sát.

    python manage.py seed_survey_dashboard --dry-run
    python manage.py seed_survey_dashboard
    python manage.py seed_survey_dashboard --count 200 --year 2026
    python manage.py seed_survey_dashboard --clear

Không đọc file Excel, không cần import tay: lệnh tự dựng khách hàng, tự tạo
ticket rồi ghi kết quả khảo sát lên chính những ticket đó. Chạy một phát là
dashboard CSAT có số liệu.

Mọi thứ sinh ra đều mang tiền tố riêng (khách hàng ``CSATSEED-``, ticket
``CSAT-SEED-``) nên ``--clear`` gỡ lại được đúng phần mình tạo, không đụng
vào dữ liệu thật.

Kết quả khảo sát ghi qua đúng hàm nghiệp vụ ``record_survey`` chứ không chèn
thẳng vào bảng, nên có đủ lịch sử gửi, kết quả chính thức và nhật ký chỉnh
sửa y như nhập tay.
"""

import random
from calendar import monthrange
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.branches.models import Branch
from apps.customers.models import Customer
from apps.tickets.models import (
    SurveySendStatus,
    Ticket,
    TicketSupportCategory,
    TicketSurveyLog,
)
from apps.tickets.surveys.services import SURVEY_TIMEZONE, record_survey

CUSTOMER_CODE_PREFIX = "CSATSEED-"
TICKET_CODE_PREFIX = "CSAT-SEED-"

MESSAGE_TEMPLATE = "Đánh giá chất lượng dịch vụ"
MESSAGE_TYPE = "Zalo ZNS"

# Tỷ lệ gửi hỏng, để thẻ "Gửi thất bại" khác 0 như thực tế.
FAILED_RATE = 0.12

# Trong số gửi thành công, bao nhiêu phần khách chịu chấm điểm. Dao động theo
# tháng để đường xu hướng không phẳng lì.
RESPONSE_RATE_RANGE = (0.55, 0.78)

# Phân bố điểm: 5★ và 4★ cộng lại ra CSAT khoảng 80%, đúng mức mục tiêu
# nghiệp vụ đang đặt trong dashboard.
RATING_WEIGHTS = [(5, 55), (4, 25), (3, 10), (2, 6), (1, 4)]

RATING_NOTES = {
    5: ["Nhân viên hỗ trợ nhanh", "Rất hài lòng", ""],
    4: ["Xử lý ổn, chờ hơi lâu", "Tạm ổn", ""],
    3: ["Bình thường", ""],
    2: ["Phản hồi chậm", "Chưa giải quyết dứt điểm"],
    1: ["Không hài lòng", "Gọi nhiều lần chưa xong"],
}

TICKET_TITLES = [
    "Không đăng nhập được ứng dụng",
    "Đặt lệnh báo lỗi phiên",
    "Chưa nhận được tiền rút",
    "Hỏi phí giao dịch",
    "Cập nhật thông tin tài khoản",
    "Quên mật khẩu đăng nhập",
    "Sao kê tài khoản tháng",
    "Xác thực lại eKYC",
    "Chuyển tiền nội bộ chưa về",
    "Hỏi lãi suất ký quỹ",
    "Đăng ký dịch vụ SMS",
    "Kiểm tra số dư tài khoản",
]

FIRST_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Đặng", "Bùi",
]
MIDDLE_NAMES = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Thanh", "Ngọc", "Quang", "Gia"]
LAST_NAMES = [
    "An", "Bình", "Cường", "Dũng", "Hà", "Hạnh", "Hùng", "Khoa", "Lan", "Linh",
    "Mai", "Nam", "Nga", "Nhung", "Phúc", "Quân", "Sơn", "Thảo", "Trang", "Tuấn",
    "Vy", "Yến",
]


class Command(BaseCommand):
    help = "Sinh khách hàng, ticket và kết quả khảo sát CSAT cho dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Số khảo sát cần sinh (mặc định 100).",
        )
        parser.add_argument(
            "--year",
            type=int,
            default=0,
            help="Năm cần rải dữ liệu. Bỏ trống thì lấy năm hiện tại.",
        )
        parser.add_argument(
            "--branch",
            default="",
            help="Mã chi nhánh xử lý. Bỏ trống thì lấy chi nhánh đầu tiên.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260806,
            help="Hạt ngẫu nhiên, để chạy lại ra cùng một bộ số.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Xoá khảo sát, ticket và khách hàng do lệnh này tạo rồi dừng.",
        )
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            return self._clear(options["dry_run"])

        count = options["count"]

        if count < 1:
            raise CommandError("--count phải lớn hơn 0.")

        rng = random.Random(options["seed"])
        now = datetime.now(SURVEY_TIMEZONE)
        year = options["year"] or now.year

        if year > now.year:
            raise CommandError("Không rải dữ liệu cho năm chưa tới.")

        branch = self._resolve_branch(options["branch"])
        categories = list(TicketSupportCategory.objects.all())

        if not categories:
            self.stdout.write(
                self.style.WARNING(
                    "Chưa có danh mục hỗ trợ nào — bảng phân tích theo danh mục "
                    "sẽ gom hết vào 'Khác'. Chạy seed_ticket_master trước nếu cần."
                )
            )

        last_month = now.month if year == now.year else 12
        quotas = self._month_quotas(count, last_month, rng)

        sequence = self._next_sequence()
        stats = {"success": 0, "failed": 0, "rated": 0, "customers": 0}
        per_month = []

        for month, quota in enumerate(quotas, start=1):
            month_rated = 0
            response_rate = rng.uniform(*RESPONSE_RATE_RANGE)

            for _ in range(quota):
                sequence += 1

                customer, is_new = self._make_customer(sequence, branch, rng)
                stats["customers"] += int(is_new)

                sent_at = self._random_moment(year, month, now, rng)
                # Ticket phải có trước lúc gửi khảo sát; lùi vài ngày cho hợp lý.
                created_at = sent_at - timedelta(days=rng.randint(1, 12))

                ticket = self._make_ticket(
                    sequence, customer, branch, categories, created_at, rng
                )

                failed = rng.random() < FAILED_RATE
                rating = None

                if not failed and rng.random() < response_rate:
                    rating = self._random_rating(rng)

                record_survey(
                    ticket=ticket,
                    send_status=(
                        SurveySendStatus.FAILED if failed else SurveySendStatus.SUCCESS
                    ),
                    sent_at=sent_at,
                    rating_score=rating,
                    rating_note=(
                        rng.choice(RATING_NOTES[rating]) if rating is not None else ""
                    ),
                    customer_name_text=customer.full_name,
                    message_name=f"[Zalo] seed - {customer.phone} - {sent_at:%Y%m%d%H%M%S}",
                    message_type=MESSAGE_TYPE,
                    message_template=MESSAGE_TEMPLATE,
                    ticket_ref_text=(
                        ticket.support_category.category_name
                        if ticket.support_category
                        else "Khác"
                    ),
                )

                stats["failed" if failed else "success"] += 1

                if rating is not None:
                    stats["rated"] += 1
                    month_rated += 1

            per_month.append((month, quota, month_rated))

        self._report(year, sum(quotas), stats, per_month)

        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.WARNING("\n--dry-run: không ghi gì."))
            return

        self.stdout.write(
            self.style.SUCCESS("\nXong. Mở Khảo sát > Dashboard CSAT để xem.")
        )

    # ------------------------------------------------------------------ phụ

    def _clear(self, dry_run):
        tickets = Ticket.objects.filter(ticket_code__startswith=TICKET_CODE_PREFIX)
        customers = Customer.objects.filter(
            customer_code__startswith=CUSTOMER_CODE_PREFIX
        )
        surveys = TicketSurveyLog.objects.filter(ticket__in=tickets)

        self.stdout.write(f"Khảo sát sẽ xoá  : {surveys.count()}")
        self.stdout.write(f"Ticket sẽ xoá    : {tickets.count()}")
        self.stdout.write(f"Khách hàng sẽ xoá: {customers.count()}")

        if dry_run:
            transaction.set_rollback(True)
            return

        # Xoá ticket là khảo sát và kết quả chính thức đi theo (cascade), nên
        # không cần dựng lại TicketFeedback như khi chỉ xoá riêng dòng khảo sát.
        tickets.delete()
        customers.delete()

        self.stdout.write(self.style.SUCCESS("Đã xoá sạch phần dữ liệu mẫu."))

    @staticmethod
    def _resolve_branch(code):
        if code:
            branch = Branch.objects.filter(branch_code=code).first()

            if branch is None:
                raise CommandError(f"Không thấy chi nhánh {code}")

            return branch

        branch = Branch.objects.order_by("id").first()

        if branch is None:
            raise CommandError("Chưa có chi nhánh nào trong hệ thống.")

        return branch

    @staticmethod
    def _next_sequence():
        """Chạy lại lệnh thì đánh số tiếp, không đè lên đợt trước."""
        last = (
            Ticket.objects.filter(ticket_code__startswith=TICKET_CODE_PREFIX)
            .order_by("-ticket_code")
            .values_list("ticket_code", flat=True)
            .first()
        )

        if not last:
            return 0

        try:
            return int(last.rsplit("-", 1)[-1])
        except ValueError:
            return 0

    def _make_customer(self, sequence, branch, rng):
        code = f"{CUSTOMER_CODE_PREFIX}{sequence:05d}"
        existing = Customer.objects.filter(customer_code=code).first()

        if existing:
            return existing, False

        name = " ".join(
            [rng.choice(FIRST_NAMES), rng.choice(MIDDLE_NAMES), rng.choice(LAST_NAMES)]
        )

        customer = Customer.objects.create(
            customer_code=code,
            full_name=name,
            phone=f"09{sequence:08d}"[:11],
            branch=branch,
        )

        return customer, True

    @staticmethod
    def _make_ticket(sequence, customer, branch, categories, created_at, rng):
        ticket = Ticket.objects.create(
            ticket_code=f"{TICKET_CODE_PREFIX}{sequence:05d}",
            title=rng.choice(TICKET_TITLES),
            customer=customer,
            handling_branch=branch,
            support_category=rng.choice(categories) if categories else None,
        )

        # created_at là auto_now_add nên phải ghi đè sau khi tạo.
        Ticket.objects.filter(pk=ticket.pk).update(created_at=created_at)

        return ticket

    @staticmethod
    def _month_quotas(total, last_month, rng):
        """
        Chia số khảo sát cho từng tháng, tháng gần đây nhiều hơn.

        Trọng số tăng dần để biểu đồ có hướng đi lên thay vì răng cưa quanh
        một mức, còn phần dư dồn ngẫu nhiên cho đủ tổng.
        """
        weights = [1.0 + 0.12 * index for index in range(last_month)]
        scale = total / sum(weights)

        quotas = [max(1, int(weight * scale)) for weight in weights]
        gap = total - sum(quotas)

        while gap > 0:
            quotas[rng.randrange(last_month)] += 1
            gap -= 1

        while gap < 0:
            index = max(range(last_month), key=lambda i: quotas[i])
            if quotas[index] <= 1:
                break
            quotas[index] -= 1
            gap += 1

        return quotas

    @staticmethod
    def _random_moment(year, month, now, rng):
        """Mốc gửi ngẫu nhiên trong tháng; tháng hiện tại không vượt quá hôm nay."""
        last_day = monthrange(year, month)[1]

        if year == now.year and month == now.month:
            last_day = min(last_day, now.day)

        day = rng.randint(1, max(1, last_day))
        moment = datetime(
            year,
            month,
            day,
            rng.randint(8, 17),
            rng.randint(0, 59),
            rng.randint(0, 59),
            tzinfo=SURVEY_TIMEZONE,
        )

        return min(moment, now - timedelta(minutes=1))

    @staticmethod
    def _random_rating(rng):
        population = [score for score, _weight in RATING_WEIGHTS]
        weights = [weight for _score, weight in RATING_WEIGHTS]

        return rng.choices(population, weights=weights, k=1)[0]

    def _report(self, year, created, stats, per_month):
        success = stats["success"]
        rated = stats["rated"]

        self.stdout.write(f"Năm {year}: sinh {created} khảo sát")
        self.stdout.write(f"  khách hàng mới : {stats['customers']}")
        self.stdout.write(f"  ticket mới     : {created}")
        self.stdout.write(f"  gửi thành công : {success}")
        self.stdout.write(f"  gửi thất bại   : {stats['failed']}")
        self.stdout.write(
            f"  khách đã chấm  : {rated}"
            + (f" ({rated * 100 // success}% số gửi thành công)" if success else "")
        )
        self.stdout.write("  theo tháng (tổng / đã chấm):")

        for month, quota, month_rated in per_month:
            self.stdout.write(f"    T{month:02d}  {quota:3d} / {month_rated:3d}")
