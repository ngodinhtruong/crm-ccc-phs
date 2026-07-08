from rest_framework import serializers

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
        labels = {
            "BOT_DONE": "Đã đóng — Chatbot",
            "CCC": "Đang xử lý — CCC",
            "SPAM": "Câu hỏi rác",
            "TIMEOUT": "Timeout",
            "WAITING_INFO": "Đang chờ thông tin",
            "COLLECTED": "Đã thu thập thông tin",
        }

        return labels.get(obj.outcome_type, obj.outcome_type)

    def get_linked_status(self, obj):
        if obj.ticket and obj.ticket.customer_account:
            return "LINKED"

        if obj.ticket and obj.ticket.customer:
            return "LINKED"

        return "UNLINKED"


class ChatbotChatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotChatLog
        fields = "__all__"


class ChatbotStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotState
        fields = "__all__"


class ChatbotCskhRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotCskhRequest
        fields = "__all__"


class ChatbotFAQReportSerializer(serializers.Serializer):
    question = serializers.CharField()
    answer = serializers.CharField(allow_blank=True)
    category = serializers.CharField(allow_blank=True)
    hit_count = serializers.IntegerField()
    latest_at = serializers.DateTimeField(allow_null=True)