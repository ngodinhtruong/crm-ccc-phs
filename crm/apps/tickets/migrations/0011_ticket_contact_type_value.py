from django.db import migrations, models


def fill_contact_type_and_source(apps, schema_editor):
    """
    Cột cũ raw_account_number chỉ chứa số tài khoản, nên mọi dòng có giá trị đều
    là contact_type = ACCOUNT. Đồng thời thêm nguồn XPRO cho ticket chatbot.
    """
    Ticket = apps.get_model("tickets", "Ticket")
    TicketSource = apps.get_model("tickets", "TicketSource")

    Ticket.objects.filter(contact_value__isnull=False).exclude(
        contact_value=""
    ).update(contact_type="ACCOUNT")

    TicketSource.objects.get_or_create(
        source_code="XPRO",
        defaults={"source_name": "X Pro", "is_active": True},
    )


def unfill(apps, schema_editor):
    Ticket = apps.get_model("tickets", "Ticket")
    Ticket.objects.update(contact_type=None)


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0010_retire_pending_close_status"),
    ]

    operations = [
        # Đổi tên thay vì xoá-thêm để không mất dữ liệu số tài khoản đã nhập.
        migrations.RenameField(
            model_name="ticket",
            old_name="raw_account_number",
            new_name="contact_value",
        ),
        migrations.AlterField(
            model_name="ticket",
            name="contact_value",
            field=models.CharField(
                blank=True, db_index=True, max_length=255, null=True
            ),
        ),
        migrations.AddField(
            model_name="ticket",
            name="contact_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PHONE", "Số điện thoại"),
                    ("EMAIL", "Email"),
                    ("ACCOUNT", "Số tài khoản"),
                ],
                db_index=True,
                max_length=20,
                null=True,
            ),
        ),
        migrations.RunPython(fill_contact_type_and_source, unfill),
    ]
