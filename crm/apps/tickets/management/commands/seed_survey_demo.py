"""
Dựng khách hàng và ticket khớp với file khảo sát CSAT, để thử luồng import.

    python manage.py seed_survey_demo --dry-run
    python manage.py seed_survey_demo
    python manage.py seed_survey_demo --clear

Import khảo sát tra ticket theo **tên khách + tháng gửi**, nên mỗi dòng trong
file phải có sẵn một ticket của đúng khách đó, tạo trong đúng tháng đó. Lệnh
này dựng phần nền ấy; bản thân kết quả khảo sát thì KHÔNG tạo — đó mới là thứ
cần import để kiểm tra.
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.branches.models import Branch
from apps.customers.models import Customer
from apps.tickets.models import Ticket, TicketSupportCategory
from apps.tickets.surveys.services import read_survey_rows

DEFAULT_FILE = (
    Path(settings.BASE_DIR).parent
    / "docs"
    / "system-diagram"
    / "CSAT SURVEY.xlsx"
)

# Mã ticket của dữ liệu mẫu mang tiền tố riêng để --clear xoá lại được đúng
# phần mình tạo, không đụng vào ticket thật.
CODE_PREFIX = "CSAT-"

# Cột "Ticket" trong file là chữ tự do: khi thì tên nhóm hỗ trợ, khi thì tiêu
# đề thư. Chỉ map những giá trị nhận ra được; còn lại để trống danh mục và
# dashboard sẽ gom vào "Khác" — đoán bừa thì bảng theo danh mục sẽ sai.
CATEGORY_BY_TEXT = {
    "quản lý tài khoản phs": "Tài khoản khách hàng",
    "ứng dụng phs": "Ứng dụng chứng khoán",
    "hỗ trợ giao dịch": "Giao dịch CK",
    "nạp và rút tiền": "Nạp tiền",
    "dịch vụ cskh": "Chăm sóc khách hàng",
}


class Command(BaseCommand):
    help = "Seed khách hàng + ticket khớp file khảo sát CSAT để thử import"

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(DEFAULT_FILE))
        parser.add_argument(
            "--branch",
            default="",
            help="Mã chi nhánh xử lý. Bỏ trống thì lấy chi nhánh đầu tiên.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help=f"Xoá ticket mẫu (mã bắt đầu bằng {CODE_PREFIX}) rồi dừng.",
        )
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            return self._clear(options["dry_run"])

        path = Path(options["file"])

        if not path.exists():
            raise CommandError(f"Không thấy file: {path}")

        branch = self._resolve_branch(options["branch"])
        rows = read_survey_rows(path)

        if not rows:
            raise CommandError("File không có dòng dữ liệu nào.")

        categories = {
            name.lower(): category
            for name, category in TicketSupportCategory.objects.values_list(
                "category_name", "id"
            )
        }

        new_customers = 0
        new_tickets = 0
        skipped = []

        for row in rows:
            name = (row["customer_name_text"] or "").strip()
            phone = (row["phone"] or "").strip()
            sent_at = row["sent_at"]

            if not name or sent_at is None:
                # Không có tên hoặc không có ngày gửi thì import cũng không
                # tra ra ticket nào; dựng sẵn cũng vô ích.
                skipped.append(row["row_number"])
                continue

            customer, created = self._get_customer(name, phone, branch)
            new_customers += int(created)

            code = f"{CODE_PREFIX}{row['row_number']:03d}"
            title = (row["ticket_ref_text"] or "").strip() or "Yêu cầu hỗ trợ"

            if Ticket.objects.filter(ticket_code=code).exists():
                continue

            ticket = Ticket.objects.create(
                ticket_code=code,
                title=title[:255],
                customer=customer,
                handling_branch=branch,
                support_category_id=self._category_id(
                    row["ticket_ref_text"], categories
                ),
            )
            # created_at là auto_now_add nên phải ghi đè sau khi tạo: import
            # tra ticket theo tháng của mốc gửi khảo sát.
            Ticket.objects.filter(pk=ticket.pk).update(created_at=sent_at)
            new_tickets += 1

        self.stdout.write(f"Đọc {len(rows)} dòng từ {path.name}")
        self.stdout.write(f"  khách hàng tạo mới : {new_customers}")
        self.stdout.write(f"  ticket tạo mới     : {new_tickets}")

        if skipped:
            self.stdout.write(
                self.style.WARNING(
                    f"  bỏ qua {len(skipped)} dòng thiếu tên/ngày gửi: "
                    + ", ".join(str(n) for n in skipped)
                )
            )

        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.WARNING("\n--dry-run: không ghi gì."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                "\nXong. Giờ vào Khảo sát > Import Excel và chọn đúng file này."
            )
        )

    def _clear(self, dry_run):
        tickets = Ticket.objects.filter(ticket_code__startswith=CODE_PREFIX)
        count = tickets.count()

        self.stdout.write(f"Ticket mẫu sẽ xoá: {count}")

        if dry_run:
            transaction.set_rollback(True)
            return

        tickets.delete()
        self.stdout.write(self.style.SUCCESS("Đã xoá. Khách hàng giữ nguyên."))

    def _resolve_branch(self, code):
        if code:
            branch = Branch.objects.filter(branch_code=code).first()

            if branch is None:
                raise CommandError(f"Không thấy chi nhánh {code}")

            return branch

        branch = Branch.objects.order_by("id").first()

        if branch is None:
            raise CommandError("Chưa có chi nhánh nào trong hệ thống.")

        return branch

    def _get_customer(self, name, phone, branch):
        """
        Tra theo số điện thoại trước, rồi mới tới tên.

        File có vài dòng tên "no name" nhưng khác số điện thoại — đó là hai
        khách khác nhau, gộp theo tên sẽ nhập nhầm kết quả của người này sang
        người kia.
        """
        if phone:
            existing = Customer.objects.filter(phone=phone).first()

            if existing:
                return existing, False

        existing = Customer.objects.filter(full_name__iexact=name).first()

        if existing and not phone:
            return existing, False

        customer = Customer.objects.create(
            full_name=name[:255],
            phone=phone or None,
            branch=branch,
        )

        return customer, True

    @staticmethod
    def _category_id(text, categories):
        mapped = CATEGORY_BY_TEXT.get((text or "").strip().lower())

        return categories.get(mapped.lower()) if mapped else None
