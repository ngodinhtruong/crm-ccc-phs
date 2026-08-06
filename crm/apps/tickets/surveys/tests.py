"""
Test cho chức năng khảo sát CSAT.

Hai chỗ dễ sai mà nhìn màn hình không phát hiện được: quy tắc "chỉ lần gửi
thành công mới tính", và việc cắt ngày theo giờ Việt Nam khi tra ticket —
cắt theo UTC thì khảo sát gửi lúc 08:55 sáng sẽ tra sang ngày hôm trước.
"""

from datetime import datetime, timedelta
from io import BytesIO

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.branches.models import Branch
from apps.customers.models import Customer
from apps.tickets.models import (
    TicketSupportCategory,
    SurveySendStatus,
    Ticket,
    TicketFeedback,
    TicketSurveyAuditLog,
    TicketSurveyLog,
)
from apps.tickets.surveys.services import (
    SURVEY_TIMEZONE,
    SurveyAlreadyCompleted,
    combine_sent_at,
    day_bounds,
    extract_phone,
    month_bounds,
    parse_rating,
    read_survey_rows,
    record_survey,
    update_survey,
)
from apps.tickets.surveys.dashboard import build_survey_dashboard
from apps.tickets.surveys.views import TicketSurveyViewSet


def vn(year, month, day, hour=0, minute=0, second=0):
    return datetime(year, month, day, hour, minute, second, tzinfo=SURVEY_TIMEZONE)


class SurveyParsingTests(TestCase):
    """Các hàm thuần đọc dữ liệu từ file khảo sát."""

    def test_phone_is_taken_from_message_name_when_column_is_empty(self):
        # Cột "Số điện thoại" rỗng toàn bộ file, số nằm trong cột "Tên".
        self.assertEqual(
            extract_phone("[Zalo] admin - 0913334686 - 2026-07-01 08:55:06"),
            "0913334686",
        )

    def test_explicit_phone_wins_over_message_name(self):
        self.assertEqual(
            extract_phone("[Zalo] admin - 0913334686 - 2026-07-01", "0987654321"),
            "0987654321",
        )

    def test_blank_rating_is_not_zero(self):
        # Để trống = chưa khảo sát; 0 = khách chấm 0 điểm. Gộp hai thứ này lại
        # sẽ kéo điểm CSAT trung bình xuống sai.
        self.assertIsNone(parse_rating(""))
        self.assertIsNone(parse_rating(None))
        self.assertEqual(parse_rating("0"), 0)
        self.assertEqual(parse_rating("5"), 5)

    def test_sent_at_is_read_in_vietnam_time(self):
        moment = combine_sent_at(vn(2026, 7, 1).date(), vn(2026, 7, 1, 8, 55).timetz())

        self.assertEqual(moment.hour, 8)
        self.assertEqual(str(moment.tzinfo), "Asia/Ho_Chi_Minh")

    def test_day_bounds_cover_a_whole_vietnam_day(self):
        start, end = day_bounds(vn(2026, 7, 1, 8, 55))

        self.assertEqual(start, vn(2026, 7, 1))
        self.assertEqual(end, vn(2026, 7, 2))

        # Cắt theo UTC thì 08:55 giờ VN rơi vào 01:55 UTC cùng ngày, nhưng
        # 00:30 giờ VN lại rơi sang 17:30 hôm trước — đó là lỗi hay gặp.
        midnight_start, _ = day_bounds(vn(2026, 7, 1, 0, 30))
        self.assertEqual(midnight_start, vn(2026, 7, 1))

    def test_month_bounds_cover_a_whole_vietnam_month(self):
        start, end = month_bounds(vn(2026, 7, 17, 8, 55))

        self.assertEqual(start, vn(2026, 7, 1))
        self.assertEqual(end, vn(2026, 8, 1))

    def test_month_bounds_roll_over_the_year(self):
        start, end = month_bounds(vn(2026, 12, 20, 23, 30))

        self.assertEqual(start, vn(2026, 12, 1))
        self.assertEqual(end, vn(2027, 1, 1))

    def test_reads_a_minimal_xlsx(self):
        rows = read_survey_rows(BytesIO(_build_xlsx()))

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["send_status"], SurveySendStatus.SUCCESS)
        self.assertEqual(rows[0]["customer_name_text"], "Nguyễn Văn A")
        self.assertEqual(rows[0]["phone"], "0913334686")
        self.assertEqual(rows[0]["rating_score"], 5)
        self.assertEqual(rows[0]["sent_at"], vn(2026, 7, 1, 8, 55, 6))

        self.assertEqual(rows[1]["send_status"], SurveySendStatus.FAILED)
        self.assertEqual(rows[1]["rating_score"], 0)


class SurveyRecordingTests(TestCase):
    """Quy tắc: chỉ lần gửi thành công mới tạo ra kết quả chính thức."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="survey-tester", password="x"
        )
        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Nguyễn Văn A", phone="0913334686", branch=cls.branch
        )
        cls.ticket = Ticket.objects.create(
            ticket_code="T-0001",
            title="Khách hỏi phí giao dịch",
            customer=cls.customer,
            handling_branch=cls.branch,
        )

    def test_failed_send_only_goes_to_history(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=timezone.now(),
            rating_score=0,
        )

        self.assertEqual(TicketSurveyLog.objects.count(), 1)
        self.assertFalse(TicketFeedback.objects.filter(ticket=self.ticket).exists())

    def test_failed_send_never_stores_a_rating(self):
        # File khảo sát vẫn ghi 0 ở dòng thất bại, nhưng khách chưa nhận được
        # tin thì không thể chấm điểm — ghi lại sẽ thành điểm giả.
        log = record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=timezone.now(),
            rating_score=0,
        )

        self.assertIsNone(log.rating_score)

    def test_successful_send_creates_the_official_result(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=5,
            message_name="[Zalo] admin - 0913334686 - 2026-07-01 08:55:06",
        )

        feedback = TicketFeedback.objects.get(ticket=self.ticket)

        self.assertTrue(feedback.survey_sent)
        self.assertEqual(feedback.rating_score, 5)
        self.assertEqual(feedback.survey_status, "RESPONDED")
        self.assertEqual(feedback.phone, "0913334686")

    def test_success_without_rating_is_sent_not_responded(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=None,
        )

        feedback = TicketFeedback.objects.get(ticket=self.ticket)

        self.assertEqual(feedback.survey_status, "SENT")
        self.assertIsNone(feedback.rating_score)
        self.assertIsNone(feedback.responded_at)

    def test_failed_send_can_be_retried_until_it_succeeds(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=timezone.now(),
        )
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=4,
        )

        self.assertEqual(TicketSurveyLog.objects.count(), 2)
        self.assertEqual(TicketFeedback.objects.count(), 1)

    def test_a_ticket_is_not_surveyed_twice_after_success(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=5,
        )

        with self.assertRaises(SurveyAlreadyCompleted):
            record_survey(
                ticket=self.ticket,
                send_status=SurveySendStatus.SUCCESS,
                sent_at=timezone.now(),
                rating_score=1,
            )

        self.assertEqual(TicketSurveyLog.objects.count(), 1)


class SurveyTicketLookupTests(TestCase):
    """Gõ tên khách -> ticket của khách đó trong tháng gửi khảo sát."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username="survey-admin", password="x", email="a@b.c"
        )
        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Trần Thị Huyền", phone="0962700450", branch=cls.branch
        )
        cls.other = Customer.objects.create(
            full_name="Lê Văn Cường", phone="0913812263", branch=cls.branch
        )

        # Mốc cố định, không lấy theo ``now``: ranh giới cần kiểm là ranh giới
        # THÁNG, mà "hôm nay trừ 10 ngày" khi thì rơi sang tháng trước khi thì
        # không, làm test đúng sai tuỳ ngày chạy.
        cls.survey_day = vn(2026, 7, 17, 9, 0)

        # Hai ticket cùng khách, cùng ngày -> đúng tình huống phải chọn tay.
        cls.same_day = [
            cls._make_ticket(f"T-SAME-{index}", cls.customer, cls.survey_day)
            for index in range(2)
        ]
        # Khác ngày nhưng vẫn trong tháng 7 -> phải lọt vào.
        cls.same_month = cls._make_ticket(
            "T-SAME-MONTH", cls.customer, vn(2026, 7, 3, 14, 30)
        )
        # Tháng khác -> không được lọt vào.
        cls.other_month = cls._make_ticket(
            "T-OTHER-MONTH", cls.customer, vn(2026, 6, 28, 10, 0)
        )
        cls.other_customer = cls._make_ticket("T-OTHER-CUS", cls.other, cls.survey_day)

    @property
    def survey_date_text(self):
        return self.survey_day.strftime("%Y-%m-%d")

    @classmethod
    def _make_ticket(cls, code, customer, created_at):
        ticket = Ticket.objects.create(
            ticket_code=code,
            title=f"Ticket {code}",
            customer=customer,
            handling_branch=cls.branch,
        )
        # created_at là auto-ish nên phải ghi đè sau khi tạo.
        Ticket.objects.filter(pk=ticket.pk).update(created_at=created_at)
        ticket.refresh_from_db()
        return ticket

    def lookup(self, **params):
        request = APIRequestFactory().get("/api/tickets/surveys/ticket-options/", params)
        force_authenticate(request, user=self.user)

        response = TicketSurveyViewSet.as_view({"get": "ticket_options"})(request)
        self.assertEqual(response.status_code, 200)

        return response.data["results"]

    def test_returns_every_ticket_of_that_customer_in_that_month(self):
        results = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )

        self.assertEqual(
            sorted(item["ticket_code"] for item in results),
            sorted(
                [ticket.ticket_code for ticket in self.same_day]
                + [self.same_month.ticket_code]
            ),
        )

    def test_a_ticket_from_another_day_in_the_same_month_is_included(self):
        # Khảo sát hay được gửi sau khi ticket đóng vài ngày, khoá đúng ngày
        # gửi thì người nhập tra không ra ticket nào.
        results = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )
        codes = {item["ticket_code"] for item in results}

        self.assertIn(self.same_month.ticket_code, codes)

    def test_tickets_from_other_months_are_excluded(self):
        results = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )
        codes = {item["ticket_code"] for item in results}

        self.assertNotIn(self.other_month.ticket_code, codes)

    def test_month_parameter_finds_the_same_tickets_as_a_full_date(self):
        by_month = self.lookup(customer_name="Trần Thị Huyền", month="2026-07")
        by_date = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )

        self.assertEqual(
            [item["ticket_code"] for item in by_month],
            [item["ticket_code"] for item in by_date],
        )

    def test_other_customers_are_excluded(self):
        results = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )
        codes = {item["ticket_code"] for item in results}

        self.assertNotIn(self.other_customer.ticket_code, codes)

    def test_phone_also_finds_the_customer(self):
        results = self.lookup(phone="0962700450", date=self.survey_date_text)

        self.assertEqual(len(results), 3)

    def test_surveyed_tickets_are_flagged_so_they_cannot_be_reused(self):
        record_survey(
            ticket=self.same_day[0],
            send_status=SurveySendStatus.SUCCESS,
            sent_at=self.survey_day,
            rating_score=5,
        )

        results = self.lookup(
            customer_name="Trần Thị Huyền", date=self.survey_date_text
        )
        flags = {item["ticket_code"]: item["has_survey"] for item in results}

        self.assertTrue(flags[self.same_day[0].ticket_code])
        self.assertFalse(flags[self.same_day[1].ticket_code])

    def test_no_name_and_no_phone_returns_nothing(self):
        # Không có gì để tra thì phải trả rỗng, không được liệt kê toàn bộ.
        self.assertEqual(self.lookup(date="2026-07-01"), [])


class SurveyEditTests(TestCase):
    """Sửa một dòng khảo sát: kết quả chính thức và nhật ký phải theo kịp."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username="survey-editor", password="x", email="edit@b.c"
        )
        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Phạm Thị Lan", phone="0905000111", branch=cls.branch
        )

    def setUp(self):
        self.ticket = Ticket.objects.create(
            ticket_code="T-EDIT-1",
            customer=self.customer,
            handling_branch=self.branch,
        )
        self.log = record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=vn(2026, 7, 17, 8, 55),
            rating_score=3,
            created_by_user=self.user,
        )

    def test_entry_writes_a_create_audit_row(self):
        self.assertEqual(
            list(self.log.audit_logs.values_list("action_type", flat=True)),
            [TicketSurveyAuditLog.ACTION_CREATE],
        )

    def test_edit_records_who_changed_what(self):
        update_survey(log=self.log, changed_by_user=self.user, rating_score=5)

        audit = self.log.audit_logs.filter(
            action_type=TicketSurveyAuditLog.ACTION_UPDATE
        ).get()

        self.assertEqual(audit.changed_by_user, self.user)
        self.assertEqual(audit.changed_fields["rating_score"]["old"], 3)
        self.assertEqual(audit.changed_fields["rating_score"]["new"], 5)
        self.assertEqual(audit.changed_fields["rating_score"]["label"], "Rate")

    def test_saving_without_changing_anything_writes_no_audit_row(self):
        update_survey(log=self.log, changed_by_user=self.user, rating_score=3)

        self.assertFalse(
            self.log.audit_logs.filter(
                action_type=TicketSurveyAuditLog.ACTION_UPDATE
            ).exists()
        )

    def test_edit_updates_the_official_result(self):
        update_survey(log=self.log, changed_by_user=self.user, rating_score=5)

        self.assertEqual(TicketFeedback.objects.get(ticket=self.ticket).rating_score, 5)

    def test_turning_a_success_into_a_failure_withdraws_the_official_result(self):
        # Chỗ dễ sót nhất: đổi trạng thái nhưng để nguyên TicketFeedback thì
        # báo cáo CSAT vẫn tính điểm của lần gửi vừa bị phủ nhận.
        update_survey(
            log=self.log,
            changed_by_user=self.user,
            send_status=SurveySendStatus.FAILED,
        )

        feedback = TicketFeedback.objects.get(ticket=self.ticket)

        self.assertFalse(feedback.survey_sent)
        self.assertIsNone(feedback.rating_score)
        self.log.refresh_from_db()
        self.assertIsNone(self.log.rating_score)
        self.assertIsNone(self.log.feedback_id)

    def test_a_failed_row_can_be_corrected_to_success(self):
        failed_ticket = Ticket.objects.create(
            ticket_code="T-EDIT-2",
            customer=self.customer,
            handling_branch=self.branch,
        )
        failed = record_survey(
            ticket=failed_ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=vn(2026, 7, 17, 9, 0),
            created_by_user=self.user,
        )

        update_survey(
            log=failed,
            changed_by_user=self.user,
            send_status=SurveySendStatus.SUCCESS,
            rating_score=4,
        )

        self.assertEqual(
            TicketFeedback.objects.get(ticket=failed_ticket).rating_score, 4
        )

    def test_cannot_promote_a_second_row_to_success_on_the_same_ticket(self):
        # Ticket gửi hỏng hai lần rồi người nhập sửa lần đầu thành công. Lần
        # thứ hai không được sửa thành công theo, nếu không ticket có hai kết
        # quả chính thức — đúng thứ mà đường nhập mới đã chặn.
        retry_ticket = Ticket.objects.create(
            ticket_code="T-EDIT-3",
            customer=self.customer,
            handling_branch=self.branch,
        )
        first = record_survey(
            ticket=retry_ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=vn(2026, 7, 17, 9, 0),
            created_by_user=self.user,
        )
        second = record_survey(
            ticket=retry_ticket,
            send_status=SurveySendStatus.FAILED,
            sent_at=vn(2026, 7, 18, 9, 0),
            created_by_user=self.user,
        )

        update_survey(
            log=first,
            changed_by_user=self.user,
            send_status=SurveySendStatus.SUCCESS,
            rating_score=5,
        )

        with self.assertRaises(SurveyAlreadyCompleted):
            update_survey(
                log=second,
                changed_by_user=self.user,
                send_status=SurveySendStatus.SUCCESS,
                rating_score=1,
            )

    def test_the_ticket_of_a_row_cannot_be_moved(self):
        with self.assertRaises(ValueError):
            update_survey(log=self.log, changed_by_user=self.user, ticket=99)

    def patch(self, log_id, payload, user=None):
        request = APIRequestFactory().patch(
            f"/api/tickets/surveys/{log_id}/", payload, format="json"
        )
        force_authenticate(request, user=user or self.user)

        return TicketSurveyViewSet.as_view({"patch": "partial_update"})(
            request, pk=log_id
        )

    def test_patch_endpoint_saves_the_edit(self):
        response = self.patch(self.log.pk, {"rating_score": 1, "note": "Nhập nhầm"})

        self.assertEqual(response.status_code, 200)
        self.log.refresh_from_db()
        self.assertEqual(self.log.rating_score, 1)

        audit = self.log.audit_logs.filter(
            action_type=TicketSurveyAuditLog.ACTION_UPDATE
        ).get()
        self.assertEqual(audit.note, "Nhập nhầm")

    def test_audit_log_endpoint_lists_the_history(self):
        self.patch(self.log.pk, {"rating_score": 1})

        request = APIRequestFactory().get(
            f"/api/tickets/surveys/{self.log.pk}/audit-logs/"
        )
        force_authenticate(request, user=self.user)
        response = TicketSurveyViewSet.as_view({"get": "audit_logs"})(
            request, pk=self.log.pk
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["action_type"] for row in response.data],
            [TicketSurveyAuditLog.ACTION_UPDATE, TicketSurveyAuditLog.ACTION_CREATE],
        )
        self.assertEqual(response.data[0]["changed_by_name"], self.user.username)


class SurveyApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username="survey-api", password="x", email="c@d.e"
        )
        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Nguyễn Văn A", phone="0913334686", branch=cls.branch
        )
        cls.ticket = Ticket.objects.create(
            ticket_code="T-API-1",
            customer=cls.customer,
            handling_branch=cls.branch,
        )

    def post(self, payload):
        request = APIRequestFactory().post(
            "/api/tickets/surveys/", payload, format="json"
        )
        force_authenticate(request, user=self.user)

        return TicketSurveyViewSet.as_view({"post": "create"})(request)

    def test_typed_time_is_read_as_vietnam_time(self):
        # Người nhập gõ 19:00 là 19 giờ Việt Nam. settings.TIME_ZONE đang là
        # UTC, nên nếu serializer để mặc định thì mốc này bị lưu thành 19:00
        # UTC = 02:00 sáng hôm sau giờ VN, và mỗi lần sửa lại lệch thêm.
        response = self.post(
            {
                "ticket": self.ticket.pk,
                "send_status": SurveySendStatus.SUCCESS,
                "sent_at": "2026-07-05T19:00:00",
                "rating_score": 5,
            }
        )

        self.assertEqual(response.status_code, 201)

        saved = TicketSurveyLog.objects.get().sent_at.astimezone(SURVEY_TIMEZONE)

        self.assertEqual(saved, vn(2026, 7, 5, 19, 0))

    def test_editing_the_time_keeps_it_in_vietnam_time(self):
        log = record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=vn(2026, 7, 5, 19, 0),
            rating_score=5,
        )

        request = APIRequestFactory().patch(
            f"/api/tickets/surveys/{log.pk}/",
            {"sent_at": "2026-07-05T08:55:06"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = TicketSurveyViewSet.as_view({"patch": "partial_update"})(
            request, pk=log.pk
        )

        self.assertEqual(response.status_code, 200)

        log.refresh_from_db()

        self.assertEqual(
            log.sent_at.astimezone(SURVEY_TIMEZONE), vn(2026, 7, 5, 8, 55, 6)
        )

    def test_manual_entry_is_saved(self):
        response = self.post(
            {
                "ticket": self.ticket.pk,
                "send_status": SurveySendStatus.SUCCESS,
                "sent_at": timezone.now().isoformat(),
                "rating_score": 5,
                "customer_name_text": "Nguyễn Văn A",
            }
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TicketSurveyLog.objects.count(), 1)

    def test_second_survey_on_the_same_ticket_is_rejected(self):
        payload = {
            "ticket": self.ticket.pk,
            "send_status": SurveySendStatus.SUCCESS,
            "sent_at": timezone.now().isoformat(),
            "rating_score": 5,
        }
        self.post(payload)
        response = self.post(payload)

        self.assertEqual(response.status_code, 409)
        self.assertEqual(TicketSurveyLog.objects.count(), 1)

    def test_list_can_be_filtered_by_ticket(self):
        # Tab khảo sát trong màn ticket dựa hẳn vào bộ lọc này; thiếu nó thì
        # ticket nào cũng hiện khảo sát của mọi ticket khác.
        other = Ticket.objects.create(
            ticket_code="T-API-2",
            customer=self.customer,
            handling_branch=self.branch,
        )
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=4,
        )
        record_survey(
            ticket=other,
            send_status=SurveySendStatus.FAILED,
            sent_at=timezone.now(),
        )

        request = APIRequestFactory().get(
            "/api/tickets/surveys/", {"ticket": self.ticket.pk}
        )
        force_authenticate(request, user=self.user)
        response = TicketSurveyViewSet.as_view({"get": "list"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["ticket_code"] for row in response.data["results"]],
            [self.ticket.ticket_code],
        )

    def test_column_filters_narrow_the_list(self):
        other_customer = Customer.objects.create(
            full_name="Trần Thị B", phone="0977000111", branch=self.branch
        )
        other = Ticket.objects.create(
            ticket_code="T-API-COL",
            customer=other_customer,
            handling_branch=self.branch,
        )
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=5,
            customer_name_text="Nguyễn Văn A",
            phone="0913334686",
        )
        record_survey(
            ticket=other,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=None,
            customer_name_text="Trần Thị B",
            phone="0977000111",
        )

        def codes(**params):
            request = APIRequestFactory().get("/api/tickets/surveys/", params)
            force_authenticate(request, user=self.user)
            response = TicketSurveyViewSet.as_view({"get": "list"})(request)

            self.assertEqual(response.status_code, 200)

            return [row["ticket_code"] for row in response.data["results"]]

        self.assertEqual(codes(ticket_code="COL"), ["T-API-COL"])
        self.assertEqual(codes(customer="Nguyễn"), ["T-API-1"])
        self.assertEqual(codes(phone="0977"), ["T-API-COL"])
        self.assertEqual(codes(rating="5"), ["T-API-1"])
        # "Chưa chấm" là lựa chọn riêng, không phải điểm 0.
        self.assertEqual(codes(rating="unrated"), ["T-API-COL"])
        self.assertEqual(codes(rating="0"), [])
        self.assertEqual(len(codes()), 2)

    def test_summary_ignores_unrated_and_failed_rows(self):
        record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=4,
        )
        other = Ticket.objects.create(
            ticket_code="T-API-2",
            customer=self.customer,
            handling_branch=self.branch,
        )
        record_survey(
            ticket=other,
            send_status=SurveySendStatus.FAILED,
            sent_at=timezone.now(),
            rating_score=0,
        )

        request = APIRequestFactory().get("/api/tickets/surveys/summary/")
        force_authenticate(request, user=self.user)
        data = TicketSurveyViewSet.as_view({"get": "summary"})(request).data

        self.assertEqual(data["total"], 2)
        self.assertEqual(data["success"], 1)
        self.assertEqual(data["failed"], 1)
        self.assertEqual(data["rated"], 1)
        # Dòng thất bại không có điểm nên không được kéo trung bình xuống.
        self.assertEqual(data["average_score"], 4.0)


def _build_xlsx():
    """Một file .xlsx tối thiểu đúng 11 cột như file khảo sát thật."""
    import zipfile

    header = [
        "Tên",
        "Tình trạng",
        "Loại tin nhắn",
        "Khách hàng",
        "Số điện thoại",
        "Mẫu tin nhắn",
        "Ngày bắt đầu gửi",
        "Thời gian bắt đầu gửi",
        "Ticket",
        "Rate",
        "Mô tả rate",
    ]
    rows = [
        header,
        [
            "[Zalo] admin - 0913334686 - 2026-07-01 08:55:06",
            "Thành công",
            "Zalo ZNS",
            "Nguyễn Văn A",
            "",
            "Đánh giá chất lượng dịch vụ",
            "46204",  # 01/07/2026 theo cách Excel đếm ngày
            "08:55:06",
            "Hỗ trợ Giao dịch",
            "5",
            "",
        ],
        [
            "[Zalo] admin - 0913812263 - 2026-07-02 08:05:47",
            "Thất bại",
            "Zalo ZNS",
            "Lê Văn Cường",
            "",
            "Đánh giá chất lượng dịch vụ",
            "46205",
            "08:05:47",
            "Khác",
            "0",
            "",
        ],
    ]

    strings = []

    def cell(col_index, value, row_index):
        ref = f"{chr(ord('A') + col_index)}{row_index}"

        if value == "":
            return ""

        # Ngày và điểm để dạng số, phần còn lại dùng bảng chuỗi dùng chung.
        if value.replace(".", "").isdigit():
            return f'<c r="{ref}"><v>{value}</v></c>'

        if value not in strings:
            strings.append(value)

        return f'<c r="{ref}" t="s"><v>{strings.index(value)}</v></c>'

    body = "".join(
        f'<row r="{index}">'
        + "".join(cell(col, value, index) for col, value in enumerate(row))
        + "</row>"
        for index, row in enumerate(rows, start=1)
    )

    sheet = (
        '<?xml version="1.0"?><worksheet '
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{body}</sheetData></worksheet>"
    )
    shared = (
        '<?xml version="1.0"?><sst '
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        f'count="{len(strings)}" uniqueCount="{len(strings)}">'
        + "".join(f"<si><t>{value}</t></si>" for value in strings)
        + "</sst>"
    )

    buffer = BytesIO()

    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("xl/worksheets/sheet1.xml", sheet)
        archive.writestr("xl/sharedStrings.xml", shared)

    return buffer.getvalue()


class SurveyDashboardTests(TestCase):
    """
    Số liệu CSAT.

    Dựng lại đúng ví dụ của nghiệp vụ: 34 lần gửi thành công, 2 lần hỏng,
    8 khách chấm điểm, điểm trung bình 4.75, tỷ lệ phản hồi 23.53%.
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username="survey-dash", password="x", email="dash@b.c"
        )
        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Nguyễn Thị Dashboard", phone="0900111222", branch=cls.branch
        )

        cls.app = TicketSupportCategory.objects.create(
            category_code="APP", category_name="Ứng dụng PHS"
        )
        cls.trading = TicketSupportCategory.objects.create(
            category_code="TRADE", category_name="Hỗ trợ Giao dịch"
        )

        cls.june = vn(2026, 6, 15, 9, 0)
        cls.may = vn(2026, 5, 15, 9, 0)

        counter = [0]

        def send(category, status, score, moment):
            counter[0] += 1
            ticket = Ticket.objects.create(
                ticket_code=f"T-DASH-{counter[0]}",
                customer=cls.customer,
                handling_branch=cls.branch,
                support_category=category,
            )
            return record_survey(
                ticket=ticket,
                send_status=status,
                sent_at=moment,
                rating_score=score,
            )

        # Tháng 6: 4 gửi cho "Ứng dụng PHS", 1 khách chấm 5 điểm.
        send(cls.app, SurveySendStatus.SUCCESS, 5, cls.june)
        for _ in range(3):
            send(cls.app, SurveySendStatus.SUCCESS, None, cls.june)

        # 7 gửi cho "Hỗ trợ Giao dịch", 3 khách chấm 5/5/4 -> TB 4.67.
        for score in (5, 5, 4):
            send(cls.trading, SurveySendStatus.SUCCESS, score, cls.june)
        for _ in range(4):
            send(cls.trading, SurveySendStatus.SUCCESS, None, cls.june)

        # 2 lần gửi hỏng — không được vào mẫu số của tỷ lệ phản hồi.
        for _ in range(2):
            send(cls.trading, SurveySendStatus.FAILED, None, cls.june)

        # Tháng 5 để so sánh: 2 khách chấm 4 và 5 -> TB 4.5.
        for score in (4, 5):
            send(cls.app, SurveySendStatus.SUCCESS, score, cls.may)

    def load(self, today=None, **params):
        """
        Gọi thẳng hàm dựng số liệu khi cần ghim "hôm nay".

        Biểu đồ so sánh cắt phần tương lai theo thời điểm hiện tại, nên test
        phải cố định mốc đó; API không nhận tham số này.
        """
        if today is not None:
            return build_survey_dashboard(
                TicketSurveyLog.objects.all(),
                granularity=params.get("granularity"),
                period_value=params.get("period"),
                start_text=params.get("start_date"),
                end_text=params.get("end_date"),
                today=today,
            )

        request = APIRequestFactory().get("/api/tickets/surveys/dashboard/", params)
        force_authenticate(request, user=self.user)

        response = TicketSurveyViewSet.as_view({"get": "dashboard"})(request)
        self.assertEqual(response.status_code, 200)

        return response.data

    def test_period_label_and_range(self):
        data = self.load(granularity="month", period="2026-06")

        self.assertEqual(data["period"]["label"], "Tháng 06/2026")
        self.assertEqual(data["period"]["start"], "2026-06-01")
        # Mốc cuối phải nằm trong kỳ để hiện "01 - 30/06", không phải 01/07.
        self.assertEqual(data["period"]["end"], "2026-06-30")
        self.assertEqual(data["previous_period"]["label"], "Tháng 05/2026")

    def test_failed_sends_stay_out_of_the_response_rate(self):
        metrics = self.load(granularity="month", period="2026-06")["metrics"]

        self.assertEqual(metrics["success"], 11)
        self.assertEqual(metrics["failed"], 2)
        self.assertEqual(metrics["rated"], 4)
        self.assertEqual(metrics["unrated"], 7)
        # 4/11 chứ không phải 4/13 — khách chưa nhận được tin thì không thể
        # trách họ không phản hồi.
        self.assertEqual(metrics["response_rate"], 36.36)

    def test_average_score_and_csat(self):
        metrics = self.load(granularity="month", period="2026-06")["metrics"]

        # (5 + 5 + 5 + 4) / 4
        self.assertEqual(metrics["average_score"], 4.75)
        # Cả 4 khách đều chấm từ 4 điểm trở lên.
        self.assertEqual(metrics["csat_percent"], 100.0)

    def test_csat_counts_satisfied_customers_not_the_average(self):
        low = Ticket.objects.create(
            ticket_code="T-DASH-LOW",
            customer=self.customer,
            handling_branch=self.branch,
            support_category=self.app,
        )
        record_survey(
            ticket=low,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=self.june,
            rating_score=1,
        )

        metrics = self.load(granularity="month", period="2026-06")["metrics"]

        # 4 hài lòng / 5 đã chấm. Nếu lấy điểm TB quy ra phần trăm thì ra
        # 4/5 = 80% một cách tình cờ, nên kiểm luôn điểm TB để phân biệt.
        self.assertEqual(metrics["csat_percent"], 80.0)
        self.assertEqual(metrics["average_score"], 4.0)

    def test_unrated_is_not_scored_as_zero(self):
        # 7 khách không chấm điểm; gộp họ thành 0 điểm thì TB tụt còn 1.73.
        metrics = self.load(granularity="month", period="2026-06")["metrics"]

        self.assertEqual(metrics["average_score"], 4.75)

    def test_category_rows(self):
        rows = {
            row["category"]: row
            for row in self.load(granularity="month", period="2026-06")["categories"]
        }

        self.assertEqual(rows["Ứng dụng PHS"]["sent"], 4)
        self.assertEqual(rows["Ứng dụng PHS"]["rated"], 1)
        self.assertEqual(rows["Ứng dụng PHS"]["response_rate"], 25.0)
        self.assertEqual(rows["Ứng dụng PHS"]["average_score"], 5.0)

        self.assertEqual(rows["Hỗ trợ Giao dịch"]["sent"], 7)
        self.assertEqual(rows["Hỗ trợ Giao dịch"]["rated"], 3)
        self.assertEqual(rows["Hỗ trợ Giao dịch"]["response_rate"], 42.86)
        self.assertEqual(rows["Hỗ trợ Giao dịch"]["average_score"], 4.67)

    def test_comparison_against_the_previous_period(self):
        rows = {
            row["key"]: row
            for row in self.load(granularity="month", period="2026-06")["comparison"]
        }

        self.assertEqual(rows["rated"]["current"], 4)
        self.assertEqual(rows["rated"]["previous"], 2)
        self.assertEqual(rows["rated"]["change_percent"], 100.0)
        self.assertEqual(rows["rated"]["target"], 12)

        self.assertEqual(rows["average_score"]["previous"], 4.5)
        self.assertEqual(rows["average_score"]["change_percent"], 5.6)

    def test_change_is_blank_when_the_previous_period_is_empty(self):
        # Chia cho 0 không ra phần trăm nào đúng; phải trả rỗng chứ không
        # được bịa ra 0% hay 100%.
        rows = {
            row["key"]: row
            for row in self.load(granularity="month", period="2026-05")["comparison"]
        }

        self.assertIsNone(rows["rated"]["change_percent"])

    def test_quarter_rolls_up_the_months_inside_it(self):
        metrics = self.load(granularity="quarter", period="2026-Q2")["metrics"]

        # Q2 gồm cả tháng 5 và tháng 6.
        self.assertEqual(metrics["rated"], 6)
        self.assertEqual(metrics["success"], 13)

    def test_year_rolls_up_everything(self):
        data = self.load(granularity="year", period="2026")

        self.assertEqual(data["period"]["label"], "Năm 2026")
        self.assertEqual(data["previous_period"]["label"], "Năm 2025")
        self.assertEqual(data["metrics"]["rated"], 6)

    def test_custom_range_wins_over_the_period_preset(self):
        data = self.load(
            granularity="month",
            period="2026-06",
            start_date="2026-05-01",
            end_date="2026-05-31",
        )

        self.assertEqual(data["granularity"], "custom")
        self.assertEqual(data["period"]["label"], "01/05/2026 - 31/05/2026")
        self.assertEqual(data["metrics"]["rated"], 2)

    def test_custom_range_compares_against_a_window_of_the_same_length(self):
        # 01-31/05 dài 31 ngày, nên kỳ so sánh là 31 ngày ngay trước đó
        # (31/03 - 30/04), không phải cả tháng 4 hay cả quý.
        data = self.load(
            granularity="month",
            period="2026-06",
            start_date="2026-05-01",
            end_date="2026-05-31",
        )

        self.assertEqual(
            data["previous_period"]["label"], "31/03/2026 - 30/04/2026"
        )

    def test_custom_range_includes_the_last_day(self):
        # Mốc cuối là nửa mở trong truy vấn; quên cộng một ngày thì khảo sát
        # gửi đúng ngày cuối kỳ bị rơi ra ngoài.
        data = self.load(
            granularity="month",
            period="2026-06",
            start_date="2026-06-01",
            end_date="2026-06-15",
        )

        self.assertEqual(data["period"]["end"], "2026-06-15")
        self.assertEqual(data["metrics"]["rated"], 4)

    def test_a_reversed_range_falls_back_to_the_preset(self):
        data = self.load(
            granularity="month",
            period="2026-06",
            start_date="2026-06-30",
            end_date="2026-06-01",
        )

        self.assertEqual(data["period"]["label"], "Tháng 06/2026")

    def test_month_series_covers_the_year_up_to_now(self):
        # "Xem theo tháng" so các tháng từ đầu năm tới tháng đang xem, không
        # kéo tới T12 vì tháng chưa tới luôn bằng 0.
        data = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )
        labels = [item["label"] for item in data["series"]]

        self.assertEqual(
            labels,
            [f"Tháng {m:02d}/2026" for m in range(1, 7)],
        )

    def test_series_fills_empty_periods_with_zero(self):
        data = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )
        by_label = {item["label"]: item for item in data["series"]}

        # Tháng 1-4 không có khảo sát nào nhưng vẫn phải có mặt trên trục.
        self.assertEqual(by_label["Tháng 01/2026"]["success"], 0)
        self.assertEqual(by_label["Tháng 05/2026"]["rated"], 2)
        self.assertEqual(by_label["Tháng 06/2026"]["rated"], 4)

    def test_a_period_with_no_sends_has_no_rate_instead_of_zero(self):
        # Đây là chỗ dễ sai nhất của biểu đồ đường: tháng không gửi gì mà trả
        # 0% thì đường tụt xuống đáy, đọc ra như dịch vụ tệ, trong khi thực
        # tế không có số liệu nào cả.
        data = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )
        empty = next(
            item for item in data["series"] if item["label"] == "Tháng 01/2026"
        )

        self.assertEqual(empty["success"], 0)
        self.assertIsNone(empty["response_rate"])
        self.assertIsNone(empty["csat_percent"])
        self.assertIsNone(empty["average_score"])

    def test_a_period_with_sends_but_no_ratings_keeps_a_response_rate(self):
        # Gửi được mà không ai chấm thì tỷ lệ phản hồi 0% là con số thật,
        # không được biến thành "không có số liệu".
        quiet = Ticket.objects.create(
            ticket_code="T-DASH-QUIET",
            customer=self.customer,
            handling_branch=self.branch,
            support_category=self.app,
        )
        record_survey(
            ticket=quiet,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=vn(2026, 4, 10),
            rating_score=None,
        )

        data = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )
        april = next(
            item for item in data["series"] if item["label"] == "Tháng 04/2026"
        )

        self.assertEqual(april["success"], 1)
        self.assertEqual(april["response_rate"], 0.0)
        # Chưa ai chấm thì CSAT và điểm TB vẫn là không có số liệu.
        self.assertIsNone(april["csat_percent"])
        self.assertIsNone(april["average_score"])

    def test_series_splits_sends_into_success_and_failure(self):
        data = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )
        june = next(
            item for item in data["series"] if item["label"] == "Tháng 06/2026"
        )

        # 11 gửi được + 2 gửi hỏng = 13 lượt gửi.
        self.assertEqual(june["success"], 11)
        self.assertEqual(june["failed"], 2)
        self.assertEqual(june["total"], june["success"] + june["failed"])

    def test_series_carries_short_axis_labels(self):
        # Trục hoành có tới 12 mốc; viết đủ chữ "Tháng" thì nhãn chồng nhau.
        months = self.load(
            granularity="month", period="2026-06", today=vn(2026, 6, 20)
        )["series"]
        quarters = self.load(
            granularity="quarter", period="2026-Q2", today=vn(2026, 6, 20)
        )["series"]
        years = self.load(
            granularity="year", period="2026", today=vn(2026, 6, 20)
        )["series"]

        self.assertEqual(months[0]["short_label"], "T01/2026")
        self.assertEqual(months[0]["label"], "Tháng 01/2026")
        self.assertEqual(quarters[0]["short_label"], "Q1/2026")
        self.assertEqual(years[0]["short_label"], "Năm 2025")

    def test_series_marks_the_period_being_viewed(self):
        data = self.load(
            granularity="month", period="2026-05", today=vn(2026, 6, 20)
        )
        current = [item["label"] for item in data["series"] if item["is_current"]]

        self.assertEqual(current, ["Tháng 05/2026"])

    def test_quarter_series_covers_the_quarters_of_the_year(self):
        data = self.load(
            granularity="quarter", period="2026-Q2", today=vn(2026, 6, 20)
        )

        self.assertEqual(
            [item["label"] for item in data["series"]],
            ["Quý 1/2026", "Quý 2/2026"],
        )
        self.assertEqual(data["series"][1]["rated"], 6)

    def test_year_series_compares_this_year_with_last_year(self):
        data = self.load(granularity="year", period="2026", today=vn(2026, 6, 20))

        self.assertEqual(
            [item["label"] for item in data["series"]],
            ["Năm 2025", "Năm 2026"],
        )
        self.assertEqual(data["series"][0]["total"], 0)
        self.assertEqual(data["series"][1]["rated"], 6)

    def test_series_of_a_past_year_shows_all_twelve_months(self):
        # Năm đã qua thì không có gì để cắt, phải đủ 12 cột.
        data = self.load(
            granularity="month", period="2025-03", today=vn(2026, 6, 20)
        )

        self.assertEqual(len(data["series"]), 12)

    def test_other_periods_are_excluded(self):
        metrics = self.load(granularity="month", period="2026-07")["metrics"]

        self.assertEqual(metrics["total"], 0)
        self.assertEqual(metrics["average_score"], 0.0)
        self.assertEqual(metrics["response_rate"], 0.0)


class SurveyPermissionTests(TestCase):
    """
    Chỉ admin và CCC được nhập khảo sát.

    Khảo sát là điểm đánh giá chất lượng phục vụ của chính đội CCC nên quyền
    ghi phải hẹp; Sale Admin xem được nhưng không nhập được.
    """

    @classmethod
    def setUpTestData(cls):
        from apps.accounts.models import (
            Permission,
            Role,
            RolePermission,
            ScopeType,
            UserRole,
        )
        from apps.common.constants import PermissionCode

        cls.branch = Branch.objects.create(branch_code="HO", branch_name="Hội sở")
        cls.customer = Customer.objects.create(
            full_name="Nguyễn Văn A", phone="0913334686", branch=cls.branch
        )
        cls.ticket = Ticket.objects.create(
            ticket_code="T-PERM-1",
            customer=cls.customer,
            handling_branch=cls.branch,
        )

        def make_user(username, role_code=None):
            # users.email là UNIQUE nên không để trống được.
            user = get_user_model().objects.create_user(
                username=username, password="x", email=f"{username}@example.com"
            )

            if role_code:
                role, _ = Role.objects.get_or_create(
                    role_code=role_code, defaults={"role_name": role_code}
                )
                # Không cấp TICKET_VIEW thì user không nhìn thấy ticket nào và
                # sẽ nhận 404 chứ không phải 403 — khi đó test không còn phân
                # biệt được "cấm nhập" với "không thấy ticket".
                for permission in ROLE_PERMISSIONS.get(role_code, [view_perm]):
                    RolePermission.objects.get_or_create(
                        role=role, permission=permission
                    )
                UserRole.objects.create(
                    user=user, role=role, scope_type=ScopeType.ALL
                )

            return user

        def make_permission(code):
            permission, _ = Permission.objects.get_or_create(
                permission_code=code, defaults={"permission_name": code}
            )
            return permission

        # Quyền xem ticket là điều kiện để thấy dữ liệu; quyền khảo sát mới
        # quyết định được xem/nhập kết quả hay không.
        view_perm = make_permission(PermissionCode.TICKET_VIEW)
        survey_view = make_permission(PermissionCode.SURVEY_VIEW)
        survey_entry = make_permission(PermissionCode.SURVEY_ENTRY)
        survey_update = make_permission(PermissionCode.SURVEY_UPDATE)

        # CCC được nhập và sửa; Sale Admin chỉ được xem.
        ROLE_PERMISSIONS = {
            "CS_STAFF": [view_perm, survey_view, survey_entry, survey_update],
            "CS_SUPERVISOR": [view_perm, survey_view, survey_entry, survey_update],
            "SA_STAFF": [view_perm, survey_view],
        }

        cls.admin = get_user_model().objects.create_superuser(
            username="perm-admin", password="x", email="p@q.r"
        )
        cls.ccc = make_user("perm-ccc", "CS_STAFF")
        cls.ccc_sup = make_user("perm-ccc-sup", "CS_SUPERVISOR")
        cls.sale_admin = make_user("perm-sa", "SA_STAFF")
        cls.no_role = make_user("perm-none")

    def post_as(self, user, ticket=None):
        request = APIRequestFactory().post(
            "/api/tickets/surveys/",
            {
                "ticket": (ticket or self.ticket).pk,
                "send_status": SurveySendStatus.SUCCESS,
                "sent_at": timezone.now().isoformat(),
                "rating_score": 5,
            },
            format="json",
        )
        force_authenticate(request, user=user)

        return TicketSurveyViewSet.as_view({"post": "create"})(request).status_code

    def get_as(self, user):
        request = APIRequestFactory().get("/api/tickets/surveys/")
        force_authenticate(request, user=user)

        return TicketSurveyViewSet.as_view({"get": "list"})(request).status_code

    def patch_as(self, user, log_id):
        request = APIRequestFactory().patch(
            f"/api/tickets/surveys/{log_id}/", {"rating_score": 2}, format="json"
        )
        force_authenticate(request, user=user)

        return TicketSurveyViewSet.as_view({"patch": "partial_update"})(
            request, pk=log_id
        ).status_code

    def make_log(self):
        return record_survey(
            ticket=self.ticket,
            send_status=SurveySendStatus.SUCCESS,
            sent_at=timezone.now(),
            rating_score=5,
        )

    def test_admin_can_enter(self):
        self.assertEqual(self.post_as(self.admin), 201)

    def test_ccc_staff_can_enter(self):
        self.assertEqual(self.post_as(self.ccc), 201)

    def test_ccc_supervisor_can_enter(self):
        self.assertEqual(self.post_as(self.ccc_sup), 201)

    def test_sale_admin_cannot_enter(self):
        self.assertEqual(self.post_as(self.sale_admin), 403)
        self.assertEqual(TicketSurveyLog.objects.count(), 0)

    def test_user_without_role_cannot_enter(self):
        self.assertEqual(self.post_as(self.no_role), 403)
        self.assertEqual(TicketSurveyLog.objects.count(), 0)

    def test_ccc_can_edit(self):
        self.assertEqual(self.patch_as(self.ccc, self.make_log().pk), 200)

    def test_admin_can_edit(self):
        self.assertEqual(self.patch_as(self.admin, self.make_log().pk), 200)

    def test_sale_admin_cannot_edit(self):
        # Xem được không có nghĩa là sửa được: chặn create mà quên chặn patch
        # thì Sale Admin vẫn đổi được điểm CSAT của đội CCC.
        log = self.make_log()

        self.assertEqual(self.patch_as(self.sale_admin, log.pk), 403)

        log.refresh_from_db()
        self.assertEqual(log.rating_score, 5)

    def test_import_is_blocked_for_sale_admin_too(self):
        # Chặn create mà quên chặn import thì vẫn ghi được qua đường vòng.
        for url_path, action_name in (
            ("import-preview", "import_preview"),
            ("import-commit", "import_commit"),
        ):
            with self.subTest(action=action_name):
                request = APIRequestFactory().post(
                    f"/api/tickets/surveys/{url_path}/", {}, format="json"
                )
                force_authenticate(request, user=self.sale_admin)
                response = TicketSurveyViewSet.as_view({"post": action_name})(request)

                self.assertEqual(response.status_code, 403)

    def test_sale_admin_can_still_read(self):
        # Cấm nhập nhưng vẫn cho xem điểm — cấp quản lý cần đọc số liệu.
        self.assertEqual(self.get_as(self.sale_admin), 200)

    def test_user_without_any_role_cannot_even_read(self):
        self.assertEqual(self.get_as(self.no_role), 403)
