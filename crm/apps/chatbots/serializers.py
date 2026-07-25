from rest_framework import serializers

from apps.chatbots.constants import UNCATEGORIZED_LABEL
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)


class ChatbotSessionTicketFieldsMixin(serializers.Serializer):
    ticket_code = serializers.SerializerMethodField()
    ticket_status = serializers.SerializerMethodField()
    outcome_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    linked_status = serializers.SerializerMethodField()

    # Giữ tên ticket_chatbot_* cho frontend cũ sau khi bảng ticket chatbot
    # được gộp vào tickets.Ticket.
    ticket_chatbot_id = serializers.SerializerMethodField()
    ticket_chatbot_code = serializers.SerializerMethodField()
    ticket_chatbot_status = serializers.SerializerMethodField()

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
        return obj.ticket.account_link_status if obj.ticket else "UNLINKED"

    def get_ticket_chatbot_id(self, obj):
        return obj.ticket_id

    def get_ticket_chatbot_code(self, obj):
        return obj.ticket.ticket_code if obj.ticket else ""

    def get_ticket_chatbot_status(self, obj):
        if obj.ticket and obj.ticket.current_status:
            return obj.ticket.current_status.status_name
        return ""


class ChatbotSessionListSerializer(
    ChatbotSessionTicketFieldsMixin,
    serializers.ModelSerializer,
):
    """Payload gọn cho bảng phân trang; không trả full_conversation."""

    class Meta:
        model = ChatbotSessionSummary
        fields = [
            "id",
            "session_id",
            "user_id",
            "channel",
            "dashboard_category",
            "category_label",
            "outcome_type",
            "outcome_label",
            "msg_count_total",
            "has_cskh_state",
            "has_cskh_request",
            "state_step",
            "contact_info",
            "contact_type",
            "reason",
            "last_question",
            "ticket",
            "ticket_code",
            "ticket_status",
            "ticket_chatbot_id",
            "ticket_chatbot_code",
            "ticket_chatbot_status",
            "linked_status",
            "started_at",
            "ended_at",
        ]


class ChatbotSessionQuickSerializer(
    ChatbotSessionTicketFieldsMixin,
    serializers.ModelSerializer,
):
    """Payload tối thiểu cho bảng 5 ticket đang chờ ở overview."""

    class Meta:
        model = ChatbotSessionSummary
        fields = [
            "id",
            "session_id",
            "dashboard_category",
            "category_label",
            "reason",
            "last_question",
            "ticket",
            "ticket_code",
            "ticket_status",
            "ticket_chatbot_id",
            "ticket_chatbot_code",
            "ticket_chatbot_status",
            "linked_status",
            "started_at",
        ]


class ChatbotSessionDetailSerializer(
    ChatbotSessionTicketFieldsMixin,
    serializers.ModelSerializer,
):
    """Payload đầy đủ chỉ dùng ở endpoint chi tiết một phiên."""

    class Meta:
        model = ChatbotSessionSummary
        fields = "__all__"


# Alias tương thích cho code ngoài app đang import tên serializer cũ.
ChatbotSessionSummarySerializer = ChatbotSessionDetailSerializer


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
