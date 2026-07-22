from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.branches.models import Branch
from apps.chatbots.models import ChatbotSessionSummary
from apps.chatbots.services import create_crm_tickets_from_chatbot


class Command(BaseCommand):
    help = (
        "Tạo bù ticket CRM cho mọi phiên chatbot có nhóm xử lý "
        "'Chuyển CCC xử lý' nhưng chưa liên kết ticket."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--branch-code",
            type=str,
            default=None,
            help="Mã chi nhánh xử lý mặc định cho ticket chatbot.",
        )

    def handle(self, *args, **options):
        branch_code = options["branch_code"] or getattr(
            settings,
            "CHATBOT_DEFAULT_BRANCH_CODE",
            None,
        )

        if branch_code:
            default_branch = Branch.objects.filter(branch_code=branch_code).first()
        else:
            default_branch = Branch.objects.order_by("id").first()

        if default_branch is None:
            raise CommandError(
                "Chưa có chi nhánh xử lý. Hãy seed Branch hoặc truyền --branch-code."
            )

        pending = ChatbotSessionSummary.objects.filter(
            outcome_type=ChatbotSessionSummary.OUTCOME_CCC,
            ticket__isnull=True,
        ).count()

        self.stdout.write(
            f"Có {pending} phiên 'Chuyển CCC xử lý' chưa có ticket."
        )

        created = create_crm_tickets_from_chatbot(
            default_branch=default_branch,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Đã tạo {created} ticket CRM; "
                f"chi nhánh mặc định: {default_branch}."
            )
        )
