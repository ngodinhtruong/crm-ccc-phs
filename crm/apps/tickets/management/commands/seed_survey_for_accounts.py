"""
Ghi kết quả khảo sát cho ticket của khách đã có tài khoản giao dịch.

Khác ``seed_survey_dashboard``: lệnh kia tự dựng khách hàng ``CSATSEED-`` riêng,
nên điểm khảo sát rơi vào một tập khách không hề có giao dịch. Màn Customer 360
đặt điểm khảo sát cạnh số liệu giao dịch, nên cần chính những khách đang có
``CustomerAccount`` cũng có điểm — nếu không, mở khách nào cũng chỉ thấy một
nửa số liệu.

Ghi qua ``record_survey`` chứ không chèn thẳng vào bảng, để có đủ lịch sử gửi,
kết quả chính thức và nhật ký y như nhập tay.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.customers.models import CustomerAccount
from apps.tickets.models import SurveyEntrySource, SurveySendStatus, Ticket
from apps.tickets.surveys.services import (
    SurveyAlreadyCompleted,
    has_successful_survey,
    record_survey,
)

# Nghiêng về điểm cao cho giống thực tế: phần lớn khách chấm 4-5 sao, điểm thấp
# là thiểu số. Phân bố phẳng sẽ cho ra CSAT ~50% và không phản ánh gì.
RATING_WEIGHTS = [(5, 40), (4, 25), (3, 12), (2, 8), (1, 6), (0, 4)]

# Một phần khách được gửi nhưng không trả lời — cột "chưa đánh giá" của
# dashboard cần có số, và tỷ lệ phản hồi 100% là không thực tế.
NO_ANSWER_RATE = 0.25

# Gửi hỏng: số điện thoại sai, khách chặn tin. Không tính vào mẫu số CSAT.
FAILED_SEND_RATE = 0.08

NOTES_BY_SCORE = {
    5: ["Nhân viên hỗ trợ nhiệt tình.", "Xử lý nhanh, rất hài lòng."],
    4: ["Hỗ trợ tốt, chờ hơi lâu.", "Ổn, mong phản hồi nhanh hơn."],
    3: ["Tạm được.", "Chưa giải quyết dứt điểm."],
    2: ["Phải gọi lại nhiều lần.", "Trả lời chưa rõ ràng."],
    1: ["Chờ quá lâu.", "Không hài lòng với cách xử lý."],
    0: ["Không giải quyết được vấn đề."],
}


class Command(BaseCommand):
    help = (
        "Ghi kết quả khảo sát cho ticket của khách hàng đã có tài khoản giao dịch."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--customers",
            type=int,
            default=0,
            help="Giới hạn số khách hàng được seed; 0 (mặc định) là tất cả.",
        )
        parser.add_argument(
            "--max-surveys",
            type=int,
            default=4,
            help="Số ticket được khảo sát tối đa mỗi khách, mặc định 4.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Chỉ thống kê, không ghi gì vào database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        limit = options["customers"]
        max_surveys = options["max_surveys"]
        dry_run = options["dry_run"]

        if limit < 0:
            raise CommandError("--customers không được âm.")

        if max_surveys <= 0:
            raise CommandError("--max-surveys phải lớn hơn 0.")

        customer_ids = list(
            CustomerAccount.objects.filter(customer__isnull=False)
            .order_by("account_number")
            .values_list("customer_id", flat=True)
            .distinct()
        )

        if limit:
            customer_ids = customer_ids[:limit]

        if not customer_ids:
            raise CommandError("Không có khách hàng nào có CustomerAccount.")

        tickets_by_customer = {}

        for ticket in (
            Ticket.objects.filter(customer_id__in=customer_ids)
            .select_related("customer")
            .order_by("id")
        ):
            tickets_by_customer.setdefault(ticket.customer_id, []).append(ticket)

        rng = random.Random(20260814)
        scores = [score for score, weight in RATING_WEIGHTS for _ in range(weight)]
        now = timezone.now()

        rated_count = 0
        no_answer_count = 0
        failed_count = 0
        skipped_count = 0
        score_distribution = {score: 0 for score, _ in RATING_WEIGHTS}

        for customer_id in customer_ids:
            tickets = tickets_by_customer.get(customer_id, [])

            if not tickets:
                continue

            chosen = rng.sample(tickets, min(len(tickets), rng.randint(1, max_surveys)))

            for ticket in chosen:
                # Ticket đã khảo sát thành công thì record_survey sẽ ném lỗi;
                # bỏ qua từ đây để không nuốt mất lỗi thật ở dưới.
                if has_successful_survey(ticket.pk):
                    skipped_count += 1
                    continue

                sent_at = now - timedelta(days=rng.randint(0, 365))

                if rng.random() < FAILED_SEND_RATE:
                    send_status = SurveySendStatus.FAILED
                    rating_score = None
                    failed_count += 1
                elif rng.random() < NO_ANSWER_RATE:
                    send_status = SurveySendStatus.SUCCESS
                    rating_score = None
                    no_answer_count += 1
                else:
                    send_status = SurveySendStatus.SUCCESS
                    rating_score = rng.choice(scores)
                    score_distribution[rating_score] += 1
                    rated_count += 1

                if dry_run:
                    continue

                try:
                    record_survey(
                        ticket=ticket,
                        send_status=send_status,
                        sent_at=sent_at,
                        rating_score=rating_score,
                        rating_note=(
                            rng.choice(NOTES_BY_SCORE[rating_score])
                            if rating_score is not None
                            else ""
                        ),
                        customer=ticket.customer,
                        customer_name_text=(
                            ticket.customer.full_name if ticket.customer else ""
                        ),
                        phone=ticket.customer.phone if ticket.customer else "",
                        message_name="Khảo sát hài lòng CCC",
                        message_type="ZNS",
                        message_template="CSAT_CCC_V1",
                        entry_source=SurveyEntrySource.MANUAL,
                    )
                except SurveyAlreadyCompleted:
                    skipped_count += 1

        distribution = " | ".join(
            f"{score}đ: {score_distribution[score]}" for score, _ in RATING_WEIGHTS
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== {'THỬ CHẠY' if dry_run else 'HOÀN TẤT'} GHI KHẢO SÁT ===\n"
                f"- Khách hàng xử lý: {len(customer_ids)}\n"
                f"- Gửi thành công + có điểm: {rated_count}\n"
                f"- Gửi thành công, khách không trả lời: {no_answer_count}\n"
                f"- Gửi thất bại: {failed_count}\n"
                f"- Bỏ qua (ticket đã khảo sát): {skipped_count}\n"
                f"- Phân bố điểm: {distribution}"
            )
        )
