"""Serializer cho màn hình Khảo sát CSAT."""

from rest_framework import serializers

from apps.tickets.models import (
    SurveyEntrySource,
    SurveySendStatus,
    TicketSurveyAuditLog,
    TicketSurveyLog,
)
from apps.tickets.surveys.services import SURVEY_TIMEZONE


class SurveyDateTimeField(serializers.DateTimeField):
    """
    Mốc gửi khảo sát, hiểu theo giờ Việt Nam.

    Người nhập gõ "05/07/2026 19:00" là 19 giờ ở Việt Nam. Chuỗi gửi lên
    không kèm múi giờ, mà ``DateTimeField`` mặc định lại quy về
    ``settings.TIME_ZONE`` — dự án đang để UTC, nên 19:00 bị lưu thành 19:00
    UTC tức 02:00 sáng hôm sau giờ Việt Nam. Sửa lại rồi lưu thì lệch tiếp
    một lần nữa, đúng kiểu "gõ giờ nào cũng không ăn".
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("default_timezone", SURVEY_TIMEZONE)
        super().__init__(**kwargs)


class SurveyTicketOptionSerializer(serializers.Serializer):
    """Một ticket để người nhập chọn khi tên khách khớp nhiều ticket."""

    id = serializers.IntegerField()
    ticket_code = serializers.CharField()
    title = serializers.CharField(allow_null=True, allow_blank=True)
    customer_id = serializers.IntegerField(allow_null=True)
    customer_name = serializers.CharField(allow_null=True, allow_blank=True)
    customer_phone = serializers.CharField(allow_null=True, allow_blank=True)
    support_category = serializers.CharField(allow_null=True, allow_blank=True)
    status_name = serializers.CharField(allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField(allow_null=True)
    # Ticket đã khảo sát thành công thì không được chọn nữa.
    has_survey = serializers.BooleanField()


class TicketSurveyLogSerializer(serializers.ModelSerializer):
    ticket_code = serializers.CharField(source="ticket.ticket_code", read_only=True)
    ticket_title = serializers.CharField(source="ticket.title", read_only=True)
    customer_name = serializers.SerializerMethodField()
    send_status_label = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketSurveyLog
        fields = [
            "id",
            "ticket",
            "ticket_code",
            "ticket_title",
            "customer",
            "customer_name",
            "customer_name_text",
            "phone",
            "send_status",
            "send_status_label",
            "sent_at",
            "message_name",
            "message_type",
            "message_template",
            "ticket_ref_text",
            "rating_score",
            "rating_note",
            "entry_source",
            "created_by_name",
            "created_at",
        ]

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.full_name

        return obj.customer_name_text or ""

    def get_send_status_label(self, obj):
        return SurveySendStatus.LABELS.get(obj.send_status, obj.send_status)

    def get_created_by_name(self, obj):
        user = obj.created_by_user

        if not user:
            return ""

        return user.get_full_name() or user.username


class TicketSurveyCreateSerializer(serializers.Serializer):
    """Một lần nhập tay: ticket do người dùng chọn, không tự đoán."""

    ticket = serializers.IntegerField()
    send_status = serializers.ChoiceField(
        choices=[code for code, _label in SurveySendStatus.CHOICES]
    )
    sent_at = SurveyDateTimeField(required=False, allow_null=True)

    # Để trống = chưa khảo sát; 0 = khách chấm 0 điểm.
    rating_score = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=5
    )
    rating_note = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

    customer_name_text = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    message_name = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    message_type = serializers.CharField(
        required=False, allow_blank=True, default="Zalo ZNS"
    )
    message_template = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    ticket_ref_text = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class TicketSurveyUpdateSerializer(serializers.Serializer):
    """
    Sửa một dòng khảo sát.

    Không nhận ``ticket``: đổi ticket của một dòng khảo sát đã nhập thì điểm
    CSAT của cả ticket cũ lẫn ticket mới đều sai. Nhập nhầm ticket thì xoá
    dòng đó bằng cách ghi lại, không chuyển qua lại.
    """

    send_status = serializers.ChoiceField(
        choices=[code for code, _label in SurveySendStatus.CHOICES],
        required=False,
    )
    sent_at = SurveyDateTimeField(required=False, allow_null=True)

    # Để trống = chưa khảo sát; 0 = khách chấm 0 điểm.
    rating_score = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=5
    )
    rating_note = serializers.CharField(required=False, allow_blank=True)

    customer_name_text = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    message_type = serializers.CharField(required=False, allow_blank=True)
    message_template = serializers.CharField(required=False, allow_blank=True)
    ticket_ref_text = serializers.CharField(required=False, allow_blank=True)

    note = serializers.CharField(required=False, allow_blank=True, default="")


class TicketSurveyAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()

    class Meta:
        model = TicketSurveyAuditLog
        fields = [
            "id",
            "action_type",
            "action_label",
            "changed_fields",
            "changed_by_name",
            "changed_at",
            "note",
        ]

    def get_changed_by_name(self, obj):
        user = obj.changed_by_user

        if not user:
            return ""

        return user.get_full_name() or user.username

    def get_action_label(self, obj):
        return dict(TicketSurveyAuditLog.ACTION_CHOICES).get(
            obj.action_type, obj.action_type
        )


class SurveyImportRowSerializer(serializers.Serializer):
    """Một dòng đã được người dùng gán ticket, chờ ghi xuống."""

    ticket = serializers.IntegerField()
    row_number = serializers.IntegerField(required=False, allow_null=True)
    send_status = serializers.ChoiceField(
        choices=[code for code, _label in SurveySendStatus.CHOICES]
    )
    sent_at = SurveyDateTimeField(required=False, allow_null=True)
    rating_score = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=5
    )
    rating_note = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    customer_name_text = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    message_name = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    message_type = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    message_template = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    ticket_ref_text = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class SurveyImportCommitSerializer(serializers.Serializer):
    rows = SurveyImportRowSerializer(many=True, allow_empty=False)

    def validate_rows(self, rows):
        seen = set()

        for row in rows:
            if row["ticket"] in seen:
                raise serializers.ValidationError(
                    "Một ticket chỉ được gán cho một dòng khảo sát trong cùng "
                    "lần import."
                )
            seen.add(row["ticket"])

        return rows


ENTRY_SOURCES = dict(SurveyEntrySource.CHOICES)
