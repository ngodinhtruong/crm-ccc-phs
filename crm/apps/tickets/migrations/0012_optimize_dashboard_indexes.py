from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0011_ticket_tkt_created_status_ix_and_more"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="ticket",
            name="tkt_created_status_ix",
        ),
        migrations.RemoveIndex(
            model_name="ticket",
            name="tkt_created_branch_ix",
        ),
        migrations.RemoveIndex(
            model_name="ticket",
            name="tkt_created_source_ix",
        ),
        migrations.RemoveIndex(
            model_name="ticket",
            name="tkt_created_category_ix",
        ),
        migrations.RemoveIndex(
            model_name="ticket",
            name="tkt_created_link_ix",
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["current_status", "created_at"],
                name="tkt_status_created_ix",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["handling_branch", "created_at"],
                name="tkt_branch_created_ix",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["source", "created_at"],
                name="tkt_source_created_ix",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["support_category", "created_at"],
                name="tkt_category_created_ix",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["account_link_status", "created_at"],
                name="tkt_link_created_ix",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["assigned_employee", "created_at"],
                name="tkt_employee_created_ix",
            ),
        ),
    ]
