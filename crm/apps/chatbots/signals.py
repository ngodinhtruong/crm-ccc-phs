from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.chatbots.dashboard.cache import bump_chatbot_dashboard_cache_version
from apps.chatbots.models import (
    ChatbotChatLog,
    ChatbotCskhRequest,
    ChatbotSessionSummary,
    ChatbotState,
)


@receiver([post_save, post_delete], sender=ChatbotSessionSummary)
@receiver([post_save, post_delete], sender=ChatbotChatLog)
@receiver([post_save, post_delete], sender=ChatbotState)
@receiver([post_save, post_delete], sender=ChatbotCskhRequest)
def on_chatbot_data_changed(sender, instance, **kwargs):
    """
    Tự động hỏng cache của chatbot dashboard khi bất kỳ bản ghi chatbot
    nào bị xóa, sửa hoặc thêm mới.
    """
    bump_chatbot_dashboard_cache_version()
