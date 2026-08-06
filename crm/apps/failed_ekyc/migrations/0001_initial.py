import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("customers", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="FailedEkycRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(blank=True, null=True)),
                ("step", models.CharField(choices=[("EKYC", "EKYC"), ("UPDATE_PASSWORD", "UPDATE_PASSWORD"), ("REGISTER_SERVICE", "REGISTER_SERVICE"), ("VERIFY_OPEN_ACCOUNT", "VERIFY_OPEN_ACCOUNT"), ("UPDATE_INFO", "UPDATE_INFO")], db_index=True, default="EKYC", max_length=50)),
                ("branch_name", models.CharField(blank=True, max_length=255)),
                ("account_number", models.CharField(blank=True, db_index=True, max_length=50)),
                ("customer_name", models.CharField(blank=True, max_length=255)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("failed_at", models.DateField(blank=True, db_index=True, null=True)),
                ("error_message", models.TextField(blank=True)),
                ("pic", models.CharField(blank=True, db_index=True, max_length=100)),
                ("call_date", models.DateField(blank=True, db_index=True, null=True)),
                ("follow_count", models.PositiveIntegerField(default=0)),
                ("call_status", models.CharField(blank=True, choices=[("KHÔNG CALL", "KHÔNG CALL"), ("Nghe máy", "Nghe máy"), ("Không nghe máy", "Không nghe máy"), ("Thuê bao/Số không tồn tại", "Thuê bao/Số không tồn tại")], db_index=True, max_length=100)),
                ("call_result", models.CharField(blank=True, choices=[("Thành công", "Thành công"), ("KH cần thử lại", "KH cần thử lại"), ("Không thành công", "Không thành công")], db_index=True, max_length=100)),
                ("cs_comment", models.TextField(blank=True)),
                ("created_by_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_failed_ekyc_records", to=settings.AUTH_USER_MODEL)),
                ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="failed_ekyc_records", to="customers.customer")),
                ("customer_account", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="failed_ekyc_records", to="customers.customeraccount")),
            ],
            options={"db_table": "failed_ekyc_records", "ordering": ["-failed_at", "-id"], "permissions": [("import_failedekycrecord", "Can import failed eKYC records"), ("export_failedekycrecord", "Can export failed eKYC records"), ("view_failedekycdashboard", "Can view failed eKYC dashboard")]},
        )
    ]
