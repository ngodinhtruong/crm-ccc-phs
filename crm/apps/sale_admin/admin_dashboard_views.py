from datetime import date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sale_admin.admin_dashboard import (
    build_sale_admin_dashboard_payload,
    can_view_admin_dashboard,
)


def parse_year_month(request):
    today = date.today()

    try:
        year = int(request.query_params.get("year") or today.year)
        month = int(request.query_params.get("month") or today.month)
    except (TypeError, ValueError):
        raise ValueError("Năm/tháng không hợp lệ.")

    if month < 1 or month > 12:
        raise ValueError("Tháng phải nằm trong khoảng 1-12.")

    if year < 2000 or year > 2100:
        raise ValueError("Năm phải nằm trong khoảng 2000-2100.")

    return year, month


class SaleAdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view_admin_dashboard(request.user):
            return Response(
                {"detail": "Bạn không có quyền xem dashboard quản trị Sale Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            year, month = parse_year_month(request)
            branch = request.query_params.get("branch") or None
            payload = build_sale_admin_dashboard_payload(
                user=request.user,
                year=year,
                month=month,
                branch_id=branch,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(payload)
