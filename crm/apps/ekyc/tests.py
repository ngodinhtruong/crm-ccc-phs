from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.customers.models import Customer, CustomerAccount
from apps.branches.models import Branch
from apps.ekyc.models import EkycRecord

User = get_user_model()


class EkycRecordTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="admin_test",
            email="admin@test.com",
            password="password123",
        )
        self.branch = Branch.objects.create(
            branch_code="HO",
            branch_name="Hội Sở",
        )
        self.customer = Customer.objects.create(
            full_name="Nguyễn Văn A",
            phone="0901234567",
            branch=self.branch,
        )
        self.account = CustomerAccount.objects.create(
            customer=self.customer,
            account_number="054C123456",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_lookup_customer_api(self):
        url = "/api/ekyc/records/lookup-customer/"
        response = self.client.get(url, {"account_number": "054C123456"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("found"))
        self.assertEqual(response.data.get("customer_name"), "Nguyễn Văn A")
        self.assertEqual(response.data.get("branch_name"), "Hội Sở")

    def test_create_ekyc_record(self):
        url = "/api/ekyc/records/"
        payload = {
            "account_number": "054C123456",
            "customer": self.customer.id,
            "customer_account": self.account.id,
            "customer_name": "Nguyễn Văn A",
            "branch_name": "Hội Sở",
            "phone": "0901234567",
            "call_date": "2026-08-05",
            "follow_count": 1,
            "call_status": "Nghe máy",
            "call_result": "Khách hàng bấm phím",
            "note": "Xác thực cuộc gọi eKYC",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EkycRecord.objects.count(), 1)
        rec = EkycRecord.objects.first()
        self.assertEqual(rec.account_number, "054C123456")
        self.assertEqual(rec.call_status, "Nghe máy")

    def test_dashboard_api(self):
        EkycRecord.objects.create(
            account_number="054C123456",
            customer_name="Nguyễn Văn A",
            call_status="Nghe máy",
            call_result="Khách hàng bấm phím",
        )
        url = "/api/ekyc/records/dashboard/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("total_records"), 1)

    def test_dashboard_uses_pic_for_called_and_not_called_totals(self):
        # PIC is authoritative even when both records have a call date.
        common = {
            "customer_name": "Nguyễn Văn A",
            "call_date": "2026-08-05",
        }
        EkycRecord.objects.create(
            account_number="054C111111", pic="Autocall", **common
        )
        EkycRecord.objects.create(
            account_number="054C222222", pic="  KHÔNG   GỌI  ", **common
        )

        response = self.client.get(
            "/api/ekyc/records/dashboard/",
            {
                "call_date_from": "2026-08-01",
                "call_date_to": "2026-08-31",
                "granularity": "MONTH",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trend = response.data["daily_trends"][0]
        self.assertEqual(trend["count"], 2)
        self.assertEqual(trend["called"], 1)
        self.assertEqual(trend["not_called"], 1)

    def test_dashboard_includes_legacy_not_called_record_without_any_date(self):
        record = EkycRecord.objects.create(
            account_number="054C333333",
            customer_name="Nguyễn Văn A",
            pic="Không gọi",
            call_date=None,
        )
        # Some imported production rows predate timestamp population.
        EkycRecord.objects.filter(pk=record.pk).update(created_at=None, updated_at=None)

        response = self.client.get(
            "/api/ekyc/records/dashboard/",
            {
                "call_date_from": "2026-08-01",
                "call_date_to": "2026-08-31",
                "granularity": "MONTH",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["daily_trends"], [{
            "date": "08/2026",
            "count": 1,
            "called": 0,
            "not_called": 1,
            "lien_he_thanh_cong": 0,
            "khong_lien_he_duoc": 0,
            "khac_lien_he": 0,
            "ket_noi_thanh_cong": 0,
            "khong_ket_noi_duoc": 0,
            "bam_phim": 0,
            "khong_bam_phim": 0,
            "tat_may_ngang": 0,
            "khong_ket_noi_result": 1,
        }])

    def test_dashboard_trends_are_chronological(self):
        EkycRecord.objects.create(
            account_number="054C444444", pic="Autocall", call_date="2026-08-05"
        )
        EkycRecord.objects.create(
            account_number="054C555555", pic="Autocall", call_date="2026-07-05"
        )

        response = self.client.get(
            "/api/ekyc/records/dashboard/",
            {
                "call_date_from": "2026-07-01",
                "call_date_to": "2026-08-31",
                "granularity": "MONTH",
            },
        )

        self.assertEqual(
            [item["date"] for item in response.data["daily_trends"]],
            ["07/2026", "08/2026"],
        )
