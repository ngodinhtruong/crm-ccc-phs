from django.contrib import admin
from .models import (
    ChatbotChatLog,
    ChatbotState,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotSyncCursor,
)


@admin.register(ChatbotSyncCursor)
class ChatbotSyncCursorAdmin(admin.ModelAdmin):
    list_display = ("source_name", "last_synced_at", "last_success_at", "last_row_count", "status")
    search_fields = ("source_name",)

@admin.register(ChatbotSessionSummary)
class ChatbotSessionSummaryAdmin(admin.ModelAdmin):
    list_display = ("session_id", "outcome_type", "has_cskh_request", "started_at")
    list_filter = ("outcome_type", "has_cskh_request")
    search_fields = ("session_id", "user_id")

@admin.register(ChatbotChatLog)
class ChatbotChatLogAdmin(admin.ModelAdmin):
    list_display = ("session_id", "category", "external_created_at")
    search_fields = ("session_id", "question")

@admin.register(ChatbotState)
class ChatbotStateAdmin(admin.ModelAdmin):
    list_display = ("session_id", "step", "external_created_at")
    search_fields = ("session_id",)

@admin.register(ChatbotCskhRequest)
class ChatbotCskhRequestAdmin(admin.ModelAdmin):
    list_display = ("session_id", "contact_type", "status", "external_created_at")
    search_fields = ("session_id", "contact_info")
