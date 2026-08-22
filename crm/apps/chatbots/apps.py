from django.apps import AppConfig


class ChatbotsConfig(AppConfig):
    name = "apps.chatbots"

    def ready(self):
        import apps.chatbots.signals  # noqa: F401

