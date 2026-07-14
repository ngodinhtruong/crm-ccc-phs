from rest_framework import serializers

from apps.chatbots.constants import UNCATEGORIZED_LABEL
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)


class ChatbotSessionSummarySerializer(serializers.ModelSerializer):
    ticket_code = serializers.SerializerMethodField()
    ticket_status = serializers.SerializerMethodField()
    outcome_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    linked_status = serializers.SerializerMethodField()

    class Meta:
        model = ChatbotSessionSummary
        fields = "__all__"

    def get_ticket_code(self, obj):
        return obj.ticket.ticket_code if obj.ticket else ""

    def get_ticket_status(self, obj):
        if obj.ticket and obj.ticket.current_status:
            return obj.ticket.current_status.status_name

        return ""

    def get_outcome_label(self, obj):
        return obj.get_outcome_type_display()

    def get_category_label(self, obj):
        return obj.dashboard_category or UNCATEGORIZED_LABEL

    def get_linked_status(self, obj):
        if obj.ticket and (obj.ticket.customer_account or obj.ticket.customer):
            return "LINKED"

        return "UNLINKED"


class ChatbotChatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotChatLog
        fields = [
            "id",
            "session_id",
            "user_id",
            "channel",
            "question",
            "answer",
            "questionType",
            "category",
            "external_created_at",
        ]


class ChatbotStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotState
        fields = "__all__"


class ChatbotCskhRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotCskhRequest
        fields = "__all__"


class ChatbotFAQReportSerializer(serializers.Serializer):
    """Một dòng xếp hạng FAQ: chủ đề + số lượt hỏi + số phiên."""

    category = serializers.CharField()
    hit_count = serializers.IntegerField()
    session_count = serializers.IntegerField()
    latest_at = serializers.DateTimeField(allow_null=True)
