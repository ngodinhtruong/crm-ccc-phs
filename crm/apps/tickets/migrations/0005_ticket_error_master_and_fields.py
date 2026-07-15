# Generated for ticket error taxonomy and error report fields.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0004_alter_tag_id_alter_ticket_id_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="TicketErrorGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(blank=True, null=True)),
                ("group_code", models.CharField(max_length=50, unique=True)),
                ("group_name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("related_system", models.CharField(blank=True, max_length=100, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(blank=True, null=True)),
            ],
            options={
                "db_table": "ticket_error_groups",
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.CreateModel(
            name="TicketErrorType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(blank=True, null=True)),
                ("type_code", models.CharField(max_length=50, unique=True)),
                ("type_name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("related_system", models.CharField(blank=True, max_length=100, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(blank=True, null=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="error_types", to="tickets.ticketerrorgroup")),
            ],
            options={
                "db_table": "ticket_error_types",
                "ordering": ["group__sort_order", "sort_order", "id"],
            },
        ),
        migrations.CreateModel(
            name="TicketErrorContent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(blank=True, null=True)),
                ("content_code", models.CharField(max_length=50, unique=True)),
                ("content_name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(blank=True, null=True)),
                ("error_type", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="error_contents", to="tickets.ticketerrortype")),
            ],
            options={
                "db_table": "ticket_error_contents",
                "ordering": ["error_type__group__sort_order", "error_type__sort_order", "sort_order", "id"],
            },
        ),
        migrations.AddField(
            model_name="ticket",
            name="error_group",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="tickets.ticketerrorgroup"),
        ),
        migrations.AddField(
            model_name="ticket",
            name="error_type",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="tickets.ticketerrortype"),
        ),
        migrations.AddField(
            model_name="ticket",
            name="error_content",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="tickets.ticketerrorcontent"),
        ),
        migrations.AddField(
            model_name="ticket",
            name="error_note",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="ticket",
            name="related_system",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="ticket",
            name="external_status",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="ticket",
            name="last_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="ticketerrorgroup",
            index=models.Index(fields=["group_code"], name="ticket_erro_group_c_69c553_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorgroup",
            index=models.Index(fields=["group_name"], name="ticket_erro_group_n_d1fe32_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorgroup",
            index=models.Index(fields=["related_system"], name="ticket_erro_related_9f0c6d_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorgroup",
            index=models.Index(fields=["is_active"], name="ticket_erro_is_acti_f94a4b_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrortype",
            index=models.Index(fields=["group"], name="ticket_erro_group_i_693d3a_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrortype",
            index=models.Index(fields=["type_code"], name="ticket_erro_type_co_8f5c42_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrortype",
            index=models.Index(fields=["type_name"], name="ticket_erro_type_na_4bd350_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrortype",
            index=models.Index(fields=["related_system"], name="ticket_erro_related_4b49bb_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrortype",
            index=models.Index(fields=["is_active"], name="ticket_erro_is_acti_0aa625_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorcontent",
            index=models.Index(fields=["error_type"], name="ticket_erro_error_t_611aa4_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorcontent",
            index=models.Index(fields=["content_code"], name="ticket_erro_content_37f1cf_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorcontent",
            index=models.Index(fields=["content_name"], name="ticket_erro_content_61d553_idx"),
        ),
        migrations.AddIndex(
            model_name="ticketerrorcontent",
            index=models.Index(fields=["is_active"], name="ticket_erro_is_acti_5c680d_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["error_group"], name="tickets_error_g_3f0e71_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["error_type"], name="tickets_error_t_7e0e4b_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["error_content"], name="tickets_error_c_ad98b4_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["related_system"], name="tickets_related_9e97f5_idx"),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(fields=["external_status"], name="tickets_external_945ce8_idx"),
        ),
    ]
