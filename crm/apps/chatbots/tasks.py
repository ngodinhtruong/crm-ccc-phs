from celery import shared_task
from django.core.cache import cache
from django.core.management import call_command


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_chatbot_supabase_task(self, create_tickets=True):
    lock_key = "lock:sync_chatbot_supabase"
    lock_timeout = 60 * 10

    acquired = cache.add(lock_key, "1", lock_timeout)

    if not acquired:
        return {
            "status": "SKIPPED",
            "reason": "Another sync task is running",
        }

    try:
        args = []

        if create_tickets:
            args.append("--create-tickets")

        call_command("sync_chatbot_supabase", *args)

        return {
            "status": "SUCCESS",
        }
    finally:
        cache.delete(lock_key)