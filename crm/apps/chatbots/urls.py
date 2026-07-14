from django.urls import path

from apps.chatbots.views import (
    ChatbotDashboardFAQAPIView,
    ChatbotDashboardOverviewAPIView,
    ChatbotDashboardTicketsAPIView,
    ChatbotSessionDetailAPIView,
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
    path(
        "dashboard/sessions/<str:session_id>/",
        ChatbotSessionDetailAPIView.as_view(),
        name="chatbot-session-detail",
    ),
]
