import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.apps import apps

class Command(BaseCommand):
    help = 'Seed fake tickets for the first 6 months of 2026'

    def handle(self, *args, **options):
        self.stdout.write("Starting to seed tickets for 2026...")

        # Load models dynamically to avoid import issues
        Ticket = apps.get_model('tickets', 'Ticket')
        TicketStatus = apps.get_model('tickets', 'TicketStatus')
        TicketSource = apps.get_model('tickets', 'TicketSource')
        TicketSupportCategory = apps.get_model('tickets', 'TicketSupportCategory')
        TicketErrorGroup = apps.get_model('tickets', 'TicketErrorGroup')
        TicketErrorType = apps.get_model('tickets', 'TicketErrorType')
        TicketPriority = apps.get_model('tickets', 'TicketPriority')
        Branch = apps.get_model('branches', 'Branch')
        Customer = apps.get_model('customers', 'Customer')
        User = apps.get_model('accounts', 'User')

        # Fetch basic reference data
        statuses = list(TicketStatus.objects.all())
        sources = list(TicketSource.objects.all())
        categories = list(TicketSupportCategory.objects.all())
        error_groups = list(TicketErrorGroup.objects.all())
        error_types = list(TicketErrorType.objects.all())
        priorities = list(TicketPriority.objects.all())
        branches = list(Branch.objects.all())
        customers = list(Customer.objects.all()[:100]) # Limit to 100 for speed
        users = list(User.objects.all()[:10])

        if not statuses:
            self.stdout.write(self.style.ERROR("No TicketStatus found. Please run master data seed first."))
            return

        # Prepare dates
        start_date = timezone.make_aware(datetime(2026, 1, 1))
        end_date = timezone.make_aware(datetime(2026, 6, 30))
        delta_days = (end_date - start_date).days

        # Pre-calculate statuses by code for realistic scenarios
        closed_status = next((s for s in statuses if s.status_code == 'CLOSED'), statuses[-1])
        cancelled_status = next((s for s in statuses if s.status_code == 'CANCELLED'), statuses[-1])
        pending_statuses = [s for s in statuses if s.status_code not in ['CLOSED', 'CANCELLED', 'DONE', 'DONE_WAIT_CLOSE']]
        if not pending_statuses:
            pending_statuses = statuses

        total_tickets = 500
        batch_size = 50
        created_count = 0

        with transaction.atomic():
            tickets_to_create = []
            
            for i in range(total_tickets):
                # Random timestamp within the 6 months
                random_day = random.randint(0, delta_days)
                random_second = random.randint(0, 86400)
                created_at = start_date + timedelta(days=random_day, seconds=random_second)

                # Determine if ticket is completed, cancelled or pending
                state_roll = random.random()
                if state_roll < 0.6:
                    current_status = closed_status
                    closed_at = created_at + timedelta(days=random.randint(0, 3), hours=random.randint(1, 10))
                    cancelled_at = None
                elif state_roll < 0.75:
                    current_status = cancelled_status
                    closed_at = None
                    cancelled_at = created_at + timedelta(hours=random.randint(1, 24))
                else:
                    current_status = random.choice(pending_statuses)
                    closed_at = None
                    cancelled_at = None

                # Randomize fields
                source = random.choice(sources) if sources else None
                category = random.choice(categories) if categories else None
                branch = random.choice(branches) if branches else None
                customer = random.choice(customers) if customers else None
                priority = random.choice(priorities) if priorities else None
                user = random.choice(users) if users else None

                # 20% chance of being an error ticket
                err_group = None
                err_type = None
                if error_groups and random.random() < 0.2:
                    err_group = random.choice(error_groups)
                    if error_types:
                        # Try to find a matching error type, or just pick random
                        valid_types = [t for t in error_types if getattr(t, 'group_id', None) == err_group.id]
                        if valid_types:
                            err_type = random.choice(valid_types)
                        else:
                            err_type = random.choice(error_types)

                link_status = random.choice(["LINKED", "UNLINKED"])

                ticket = Ticket(
                    ticket_code=f"{created_at.strftime('%y%m')}{random.randint(1000, 99999)}",
                    title=f"Yêu cầu hỗ trợ {random.choice(['tài khoản', 'giao dịch', 'mật khẩu', 'ứng dụng', 'chuyển tiền'])}",
                    current_status=current_status,
                    source=source,
                    support_category=category,
                    handling_branch=branch,
                    customer=customer,
                    priority=priority,
                    error_group=err_group,
                    error_type=err_type,
                    account_link_status=link_status,
                    owner_user=user,
                    created_by_user=user,
                    request_content="Khách hàng cần hỗ trợ xử lý vấn đề...",
                )
                
                # Use save() instead of bulk_create to trigger all signals and auto-generation
                ticket.save()
                
                # Then override timestamps using update() so auto_now_add doesn't overwrite it
                Ticket.objects.filter(id=ticket.id).update(
                    created_at=created_at,
                    updated_at=created_at,
                    closed_at=closed_at,
                    cancelled_at=cancelled_at,
                )

                created_count += 1
                if created_count % batch_size == 0:
                    self.stdout.write(f"Seeded {created_count} tickets...")

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} tickets for 2026."))
