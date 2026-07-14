# Generated for KPI dashboard measurement windows.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("kpis", "0004_kpiprofile_kpisection_alter_kpigroup_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="kpiusermetricresult",
            name="window_start_date",
            field=models.DateField(blank=True, null=True, db_index=True),
        ),
        migrations.AddField(
            model_name="kpiusermetricresult",
            name="window_end_date",
            field=models.DateField(blank=True, null=True, db_index=True),
        ),
        migrations.AddField(
            model_name="kpiusermetricresult",
            name="denominator_value",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=20, null=True),
        ),
        migrations.AddField(
            model_name="kpiusermetricresult",
            name="contributing_record_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
