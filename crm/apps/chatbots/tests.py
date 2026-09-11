from django.test import SimpleTestCase, TestCase

from apps.chatbots.constants import parse_category
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.services import (
    CONTACT_TYPE_ACCOUNT,
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_MULTIPLE,
    CONTACT_TYPE_PHONE,
    detect_outcome,
    find_customer_by_contact,
    normalize_contact_type,
)
from apps.chatbots.sources import (
    CSKH_REQUESTS,
    XPRO_CHAT_LOGS,
    format_contact_info,
    get_bool,
    parse_contact_payload,
)


class ChatbotTicketRoutingTests(SimpleTestCase):
    def test_contact_type_is_normalized_to_plain_codes(self):
        self.assertEqual(
            normalize_contact_type("số tài khoản", "0123456789"),
            CONTACT_TYPE_ACCOUNT,
        )
        self.assertEqual(
            normalize_contact_type("email", "customer@example.com"),
            CONTACT_TYPE_EMAIL,
        )
        self.assertEqual(
            normalize_contact_type("điện thoại", "0909000000"),
            CONTACT_TYPE_PHONE,
        )

    def test_contact_type_can_be_inferred_from_value(self):
        self.assertEqual(
            normalize_contact_type("", "customer@example.com"),
            CONTACT_TYPE_EMAIL,
        )
        self.assertEqual(
            normalize_contact_type("", "0909000000"),
            CONTACT_TYPE_PHONE,
        )

    def test_cskh_request_routes_session_to_ccc(self):
        outcome = detect_outcome([], has_state=True, has_request=True)

        self.assertEqual(outcome, ChatbotSessionSummary.OUTCOME_CCC)


class ChatbotDashboardSectionTests(SimpleTestCase):
    def test_missing_sections_keeps_full_backward_compatible_payload(self):
        from apps.chatbots.dashboard.constants import ALL_SECTIONS, parse_dashboard_sections

        sections, explicit = parse_dashboard_sections(None)

        self.assertEqual(sections, ALL_SECTIONS)
        self.assertFalse(explicit)

    def test_sections_are_deduplicated_and_unknown_values_are_ignored(self):
        from apps.chatbots.dashboard.constants import parse_dashboard_sections

        sections, explicit = parse_dashboard_sections(
            "summary,traffic,summary,unknown"
        )

        self.assertEqual(sections, ("summary", "traffic"))
        self.assertTrue(explicit)

    def test_list_serializer_does_not_expose_full_conversation(self):
        from apps.chatbots.serializers import ChatbotSessionListSerializer

        self.assertNotIn(
            "full_conversation",
            ChatbotSessionListSerializer.Meta.fields,
        )
        self.assertIn("last_question", ChatbotSessionListSerializer.Meta.fields)


class ChatbotSourceSchemaTests(SimpleTestCase):
    """
    Nguồn chatbot đã đổi schema (bảng *_UAT). Các test dưới khóa lại đúng
    những chỗ hai thế hệ bảng lệch nhau — đó là nơi luồng sinh ticket gãy.
    """

    def test_category_reads_both_plain_and_json_shapes(self):
        # Cùng một chủ đề, nguồn ghi hai dạng nằm lẫn nhau trong cùng một phiên.
        self.assertEqual(
            parse_category('{"category_id":20,"category":"Dịch vụ khác & Hỗ trợ"}'),
            (20, "Dịch vụ khác & Hỗ trợ"),
        )
        self.assertEqual(
            parse_category("Dịch vụ khác & Hỗ trợ"),
            (None, "Dịch vụ khác & Hỗ trợ"),
        )
        self.assertEqual(parse_category(None), (None, ""))
        # JSON hỏng thì giữ nguyên chuỗi, không nuốt mất chủ đề.
        self.assertEqual(parse_category('{"category":'), (None, '{"category":'))

    def test_request_row_maps_issue_and_json_contact_info(self):
        row = {
            "id": 3,
            "user_id": "022C099996",
            "session_id": "c7229666",
            "platform": "xpro",
            "contact_info": {
                "email": "an@gmail.com",
                "phone": "0377929765",
                "full_name": "vivi",
                "customer_type": None,
                "account_number": None,
            },
            "contact_type": "MULTIPLE",
            "category": '{"category_id":20,"category":"Dịch vụ khác & Hỗ trợ"}',
            "status": "pending",
            "issue": "Hỏi về chương trình thưởng giới thiệu",
        }

        fields = CSKH_REQUESTS.extra_fields(row)

        # Cột `issue` của nguồn mới thay cho `reason` của nguồn cũ.
        self.assertEqual(fields["reason"], "Hỏi về chương trình thưởng giới thiệu")
        self.assertEqual(fields["category"], "Dịch vụ khác & Hỗ trợ")
        self.assertEqual(fields["category_id"], 20)
        # Khối liên hệ giữ nguyên cấu trúc, không bị dàn phẳng rồi mất.
        self.assertEqual(
            fields["contact_payload"],
            {"full_name": "vivi", "phone": "0377929765", "email": "an@gmail.com"},
        )
        self.assertIn("0377929765", fields["contact_info"])
        self.assertIn("an@gmail.com", fields["contact_info"])

    def test_request_row_still_reads_legacy_shape(self):
        row = {
            "id": 9,
            "session_id": "s1",
            "contact_info": "0909000000",
            "contact_type": "phone",
            "reason": "Khách hỏi phí giao dịch",
            "status": "pending",
        }

        fields = CSKH_REQUESTS.extra_fields(row)

        self.assertEqual(fields["reason"], "Khách hỏi phí giao dịch")
        self.assertEqual(fields["contact_info"], "0909000000")
        # Nguồn cũ chỉ đưa một giá trị đơn: không dựng payload giả.
        self.assertIsNone(fields["contact_payload"])

    def test_chat_row_maps_issue_columns(self):
        row = {
            "id": 287,
            "platform": "xpro",
            "session_id": "s2",
            "question": "q",
            "answer": "a",
            "questionType": "customer care center",
            "category": "Ứng dụng & Nền tảng giao dịch",
            "language": "VI",
            "issue": "Khách hàng hỏi về Elite Seed",
            "is_issue_occurrence": "true",
            "relation_issue": "SAME_ISSUE",
        }

        fields = XPRO_CHAT_LOGS.extra_fields(row)

        self.assertEqual(fields["issue"], "Khách hàng hỏi về Elite Seed")
        self.assertEqual(fields["relation_issue"], "SAME_ISSUE")
        self.assertIs(fields["is_issue_occurrence"], True)

    def test_string_false_is_not_read_as_true(self):
        # bool("false") là True — đọc thẳng cột chuỗi là lật ngược ý nghĩa.
        self.assertIs(get_bool({"flag": "false"}, "flag"), False)
        self.assertIs(get_bool({"flag": "true"}, "flag"), True)
        self.assertIsNone(get_bool({"flag": "?"}, "flag"))
        self.assertIsNone(get_bool({}, "flag"))

    def test_contact_info_display_is_labelled(self):
        payload = parse_contact_payload({"phone": "0909", "account_number": "1234"})

        self.assertEqual(format_contact_info(payload), "Số TK: 1234 | SĐT: 0909")


class ChatbotMultiContactTests(SimpleTestCase):
    def test_multiple_contact_type_is_recognized(self):
        payload = {"phone": "0909000000", "email": "a@b.com"}

        self.assertEqual(
            normalize_contact_type("MULTIPLE", "SĐT: 0909000000 | Email: a@b.com", payload),
            CONTACT_TYPE_MULTIPLE,
        )

    def test_single_field_payload_keeps_its_own_type(self):
        self.assertEqual(
            normalize_contact_type("MULTIPLE", None, {"full_name": "vy", "phone": "0909"}),
            CONTACT_TYPE_PHONE,
        )
        self.assertEqual(
            normalize_contact_type("MULTIPLE", None, {"account_number": "0001"}),
            CONTACT_TYPE_ACCOUNT,
        )

    def test_display_string_does_not_decide_contact_type(self):
        # Chuỗi hiển thị có '@' nên suy từ nó là mọi thứ thành EMAIL.
        self.assertEqual(
            normalize_contact_type("MULTIPLE", "Họ tên: vivi | Email: an@gmail.com", {"phone": "0377"}),
            CONTACT_TYPE_PHONE,
        )


class ChatbotCustomerLookupTests(TestCase):
    """Tra khách hàng từ khối liên hệ nhiều trường của nguồn mới."""

    def setUp(self):
        from apps.branches.models import Branch
        from apps.customers.models import Customer, CustomerAccount

        branch = Branch.objects.create(branch_code="B1", branch_name="CN 1")

        self.owner = Customer.objects.create(
            full_name="Chủ tài khoản",
            phone="0900000001",
            email="owner@example.com",
            branch=branch,
        )
        self.account = CustomerAccount.objects.create(
            customer=self.owner,
            account_number="022C000001",
        )
        self.other = Customer.objects.create(
            full_name="Người khác",
            phone="0900000002",
            email="other@example.com",
            branch=branch,
        )

    def test_account_number_wins_over_phone(self):
        # Khách gõ nhầm SĐT của người khác nhưng số TK là của mình: số TK là
        # định danh do PHS cấp nên phải thắng.
        customer, account = find_customer_by_contact(
            "MULTIPLE",
            None,
            payload={
                "account_number": self.account.account_number,
                "phone": self.other.phone,
            },
        )

        self.assertEqual(customer, self.owner)
        self.assertEqual(account, self.account)

    def test_falls_through_to_email_when_phone_unknown(self):
        customer, account = find_customer_by_contact(
            "MULTIPLE",
            None,
            payload={"phone": "0999999999", "email": "other@example.com"},
        )

        self.assertEqual(customer, self.other)
        self.assertIsNone(account)

    def test_no_match_leaves_ticket_unlinked(self):
        customer, account = find_customer_by_contact(
            "MULTIPLE",
            None,
            payload={"full_name": "vivi", "phone": "0377929765"},
        )

        self.assertIsNone(customer)
        self.assertIsNone(account)

    def test_legacy_single_value_lookup_still_works(self):
        customer, _ = find_customer_by_contact("phone", "0900000002")

        self.assertEqual(customer, self.other)
