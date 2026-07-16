from rest_framework import serializers

from apps.chatbots.constants import UNCATEGORIZED_LABEL
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
    TicketChatbot,
)


class ChatbotSessionSummarySerializer(serializers.ModelSerializer):
    ticket_code = serializers.SerializerMethodField()
    ticket_status = serializers.SerializerMethodField()
    outcome_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    linked_status = serializers.SerializerMethodField()

    # Ticket chatbot (luồng mới) — dùng để mở trang chi tiết ticket
    ticket_chatbot_id = serializers.SerializerMethodField()
    ticket_chatbot_code = serializers.SerializerMethodField()
    ticket_chatbot_status = serializers.SerializerMethodField()

    class Meta:
        model = ChatbotSessionSummary
        fields = "__all__"

    def get_ticket_code(self, obj):
        if obj.ticket_chatbot:
            return obj.ticket_chatbot.ticket_code

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
        if obj.ticket_chatbot:
            return obj.ticket_chatbot.link_status

        if obj.ticket and (obj.ticket.customer_account or obj.ticket.customer):
            return "LINKED"

        return "UNLINKED"

    def get_ticket_chatbot_id(self, obj):
        return obj.ticket_chatbot_id

    def get_ticket_chatbot_code(self, obj):
        return obj.ticket_chatbot.ticket_code if obj.ticket_chatbot else ""

    def get_ticket_chatbot_status(self, obj):
        if obj.ticket_chatbot:
            return obj.ticket_chatbot.status_label

        return ""


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


class TicketChatbotSerializer(serializers.ModelSerializer):
    """Ticket sinh ra từ chatbot (luồng chuyển CCC)."""

    # status = mã trạng thái (code) lấy từ FK current_status → giữ tương thích FE
    status = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    link_status_label = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()

    # Thông tin quản lý (hiển thị tên thay vì id)
    assigned_employee_name = serializers.SerializerMethodField()
    assigned_employee_department = serializers.SerializerMethodField()
    handling_branch_name = serializers.SerializerMethodField()
    assigned_unit_name = serializers.SerializerMethodField()
    sla_policy_name = serializers.SerializerMethodField()
    priority_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketChatbot
        fields = "__all__"

    def get_status(self, obj):
        return obj.status_code

    def get_status_label(self, obj):
        return obj.status_label

    def get_link_status_label(self, obj):
        return obj.get_link_status_display()

    def get_owner_username(self, obj):
        return str(obj.owner_user) if obj.owner_user else ""

    def get_customer_name(self, obj):
        return obj.customer.full_name if obj.customer else ""

    def get_assigned_employee_name(self, obj):
        return obj.assigned_employee.full_name if obj.assigned_employee else ""

    def get_assigned_employee_department(self, obj):
        return obj.assigned_employee.department if obj.assigned_employee else ""

    def get_handling_branch_name(self, obj):
        return obj.handling_branch.branch_name if obj.handling_branch else ""

    def get_assigned_unit_name(self, obj):
        return obj.assigned_unit.unit_name if obj.assigned_unit else ""

    def get_sla_policy_name(self, obj):
        return obj.sla_policy.sla_name if obj.sla_policy else ""

    def get_priority_name(self, obj):
        return obj.priority.priority_name if obj.priority else ""

    def get_category_label(self, obj):
        return obj.dashboard_category or UNCATEGORIZED_LABEL
