from django.test import TestCase


class ApiRootTests(TestCase):
    def test_api_root_lists_available_endpoints(self):
        response = self.client.get("/api/")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("tickets", data)
        self.assertIn("accounts", data)
        self.assertIn("customers", data)
        self.assertIn("sla", data)
        self.assertIn("master_data", data)
        self.assertIn("dashboard", data)
