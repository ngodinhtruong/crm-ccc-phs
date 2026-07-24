from datetime import date

from django.http import QueryDict
from django.test import SimpleTestCase

from apps.tickets.ccc_dashboard import (
    ALL_DASHBOARD_SECTIONS,
    REPORT_SECTION_NAMES,
    _requested_sections,
    _selected_report_months,
)


class TicketCccDashboardSectionTests(SimpleTestCase):
    def test_no_sections_keeps_backward_compatible_full_payload(self):
        params = QueryDict("")

        self.assertEqual(_requested_sections(params), set(ALL_DASHBOARD_SECTIONS))

    def test_report_alias_expands_report_sections(self):
        params = QueryDict("sections=reports")

        self.assertEqual(_requested_sections(params), set(REPORT_SECTION_NAMES))

    def test_comma_separated_sections(self):
        params = QueryDict("sections=overview,trend")

        self.assertEqual(_requested_sections(params), {"overview", "trend"})

    def test_report_months_are_limited_to_most_recent_months(self):
        months = _selected_report_months(
            date(2025, 1, 1),
            date(2026, 1, 31),
            max_months=3,
        )

        self.assertEqual(
            months,
            [date(2025, 11, 1), date(2025, 12, 1), date(2026, 1, 1)],
        )
