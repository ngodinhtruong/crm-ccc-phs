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
