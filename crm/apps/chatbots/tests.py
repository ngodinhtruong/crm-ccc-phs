from django.test import SimpleTestCase

from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.services import (
    CONTACT_TYPE_ACCOUNT,
    CONTACT_TYPE_EMAIL,
    CONTACT_TYPE_PHONE,
    detect_outcome,
    normalize_contact_type,
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
