import logging
import time

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sale_admin.admin_dashboard import get_sale_admin_report_payload
from apps.sale_admin.permissions import SaDashboardPermission


logger = logging.getLogger(__name__)


class SaleAdminReportDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, SaDashboardPermission]

    def get(self, request):
        started_at = time.perf_counter()
        payload = get_sale_admin_report_payload(request)
        elapsed_ms = (time.perf_counter() - started_at) * 1000

        response = Response(payload)
        response["Server-Timing"] = f"sale_admin_dashboard;dur={elapsed_ms:.2f}"

        if elapsed_ms >= 2_000:
            logger.warning(
                "Sale Admin dashboard xử lý chậm: %.2f ms; user_id=%s; params=%s",
                elapsed_ms,
                getattr(request.user, "id", None),
                dict(request.query_params),
            )

        return response


# Tên cũ để tương thích với import/route trước đây.
class SaleAdminAdminDashboardAPIView(SaleAdminReportDashboardAPIView):
    pass
