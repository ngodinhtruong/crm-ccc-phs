import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from apps.tickets.models import Ticket

queryset = Ticket.objects.all()
print("Total tickets:", queryset.count())


