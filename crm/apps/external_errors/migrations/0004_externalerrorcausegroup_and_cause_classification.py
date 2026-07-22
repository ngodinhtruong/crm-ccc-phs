
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "external_errors",
            "0003_alter_externalerrorrecord_completed_date_and_more",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalErrorCauseGroup",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(blank=True, null=True)),
                (
                    "cause_code",
                    models.CharField(
                        db_index=True,
                        max_length=50,
                        unique=True,
                    ),
                ),
                (
                    "cause_name",
                    models.CharField(max_length=255, unique=True),
                ),
                ("description", models.TextField(blank=True, null=True)),
                ("keywords", models.JSONField(blank=True, default=list)),
                ("examples", models.JSONField(blank=True, default=list)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                (
                    "is_active",
                    models.BooleanField(db_index=True, default=True),
                ),
            ],
            options={
                "db_table": "external_error_cause_groups",
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="records",
                to="external_errors.externalerrorcausegroup",
            ),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="normalized_cause",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_classification_confidence",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_need_review",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_classification_status",
            field=models.CharField(
                choices=[
                    ("UNCLASSIFIED", "Chưa phân loại"),
                    ("CLASSIFIED", "Đã phân loại"),
                    ("NEED_REVIEW", "Cần kiểm tra"),
                    ("CONFIRMED", "Đã xác nhận"),
                    ("FAILED", "Lỗi phân loại"),
                ],
                db_index=True,
                default="UNCLASSIFIED",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_classification_error",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_llm_model_id",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="externalerrorrecord",
            name="cause_classified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="externalerrorrecord",
            index=models.Index(
                fields=["received_date", "cause_group"],
                name="ext_err_recv_cause_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="externalerrorrecord",
            index=models.Index(
                fields=[
                    "cause_classification_status",
                    "cause_need_review",
                ],
                name="ext_err_cause_stat_idx",
            ),
        ),
    ]
