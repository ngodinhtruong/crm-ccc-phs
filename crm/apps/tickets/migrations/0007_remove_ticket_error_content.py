from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
    ('tickets', '0006_rename_tickets_error_g_3f0e71_idx_tickets_error_g_1b8f01_idx_and_more'),
]

    operations = [
        migrations.RemoveField(
            model_name="ticket",
            name="error_content",
        ),
        migrations.DeleteModel(
            name="TicketErrorContent",
        ),
    ]
