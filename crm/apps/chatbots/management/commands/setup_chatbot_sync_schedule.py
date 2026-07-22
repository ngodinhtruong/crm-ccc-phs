import json

from django.conf import settings
from django.core.management.base import BaseCommand
from django_celery_beat.models import IntervalSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Setup periodic chatbot Supabase sync task"

    def handle(self, *args, **options):
        seconds = int(getattr(settings, "CHATBOT_SYNC_INTERVAL_SECONDS", 60))

        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=seconds,
            period=IntervalSchedule.SECONDS,
        )

        task_kwargs = {"create_tickets": True}

        task, created = PeriodicTask.objects.update_or_create(
            name="Sync chatbot Supabase data",
            defaults={
                "interval": schedule,
                "task": "apps.chatbots.tasks.sync_chatbot_supabase_task",
                "kwargs": json.dumps(task_kwargs),
                "enabled": True,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Chatbot sync schedule {'created' if created else 'updated'}: every {seconds}s"
            )
        )