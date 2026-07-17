from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sale_admin.admin_dashboard import get_sale_admin_report_payload


class SaleAdminReportDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_sale_admin_report_payload(request))


# Backward-compatible class name for older imports/routes.
class SaleAdminAdminDashboardAPIView(SaleAdminReportDashboardAPIView):
    pass
