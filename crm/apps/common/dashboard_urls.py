from django.urls import path

from apps.common.dashboard_views import (
    DashboardSummaryAPIView,
    HomeDashboardAPIView,
    GeneralDashboardAPIView,
)


urlpatterns = [
    path("summary/", DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
    path("home/", HomeDashboardAPIView.as_view(), name="dashboard-home"),
    path("general/", GeneralDashboardAPIView.as_view(), name="dashboard-general"),
]