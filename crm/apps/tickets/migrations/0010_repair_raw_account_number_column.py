from django.db import migrations


def add_missing_raw_account_number(apps, schema_editor):
    Ticket = apps.get_model("tickets", "Ticket")
    table_name = Ticket._meta.db_table
    field = Ticket._meta.get_field("raw_account_number")

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }

    if field.column in columns:
        return

    schema_editor.add_field(Ticket, field)


def reverse_noop(apps, schema_editor):
    # Không tự động xóa cột khi rollback vì đây là migration repair.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0009_ticket_account_link_status_and_code_rule"),
    ]

    operations = [
        migrations.RunPython(
            add_missing_raw_account_number,
            reverse_noop,
        ),
    ]
