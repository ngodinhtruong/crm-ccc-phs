from django.urls import path

from apps.chatbots.views import (
    ChatbotDashboardFAQAPIView,
    ChatbotDashboardOverviewAPIView,
    ChatbotDashboardTicketsAPIView,
)

urlpatterns = [
    path(
        "dashboard/overview/",
        ChatbotDashboardOverviewAPIView.as_view(),
        name="chatbot-dashboard-overview",
    ),
    path(
        "dashboard/tickets/",
        ChatbotDashboardTicketsAPIView.as_view(),
        name="chatbot-dashboard-tickets",
    ),
    path(
        "dashboard/faqs/",
        ChatbotDashboardFAQAPIView.as_view(),
        name="chatbot-dashboard-faqs",
    ),
]