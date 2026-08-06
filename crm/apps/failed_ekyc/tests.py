from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from django.db.models import Count

from apps.failed_ekyc.models import FailedEkycRecord
from apps.failed_ekyc.serializers import FailedEkycRecordSerializer
from apps.failed_ekyc.views import parse_date
from apps.failed_ekyc.permissions import HasFailedEkycPermission


class FailedEkycRecordTests(TestCase):
    def test_allows_record_without_customer_identifier(self):
        serializer = FailedEkycRecordSerializer(data={"step": "EKYC", "error_message": "Lỗi giấy tờ"})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_accepts_phone_without_account(self):
        serializer = FailedEkycRecordSerializer(data={"step": "EKYC", "phone": "0900000000", "error_message": "Lỗi giấy tờ"})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_parse_vietnamese_date_format(self):
        self.assertEqual(str(parse_date("04/07/2026")), "2026-07-04")

    def test_model_defaults(self):
        record = FailedEkycRecord.objects.create(phone="0900000000")
        self.assertEqual(record.step, "EKYC")
        self.assertEqual(record.follow_count, 0)

    def test_dashboard_trend_groups_date_field_without_truncation(self):
        FailedEkycRecord.objects.create(failed_at="2026-08-06", error_message="Lỗi 1")
        FailedEkycRecord.objects.create(failed_at="2026-08-06", error_message="Lỗi 2")
        rows = list(
            FailedEkycRecord.objects.values("failed_at")
            .annotate(count=Count("id"))
        )
        self.assertEqual(rows[0]["count"], 2)


class FailedEkycPermissionTests(SimpleTestCase):
    def setUp(self):
        self.permission = HasFailedEkycPermission()
        self.request = Mock()
        self.request.user.is_authenticated = True
        self.request.user.is_superuser = False

    @patch("apps.ekyc.permissions.PermissionService.get_user_role_codes", return_value=["ADMIN"])
    def test_admin_can_access(self, _roles):
        self.assertTrue(self.permission.has_permission(self.request, Mock()))

    @patch("apps.ekyc.permissions.PermissionService.get_user_role_codes", return_value=["CCC_STAFF"])
    def test_ccc_can_access(self, _roles):
        self.assertTrue(self.permission.has_permission(self.request, Mock()))
