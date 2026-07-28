from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("sale_admin", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="sarecord",
            index=models.Index(
                fields=["branch", "call_date"],
                name="sa_rec_branch_call_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sarecord",
            index=models.Index(
                fields=["pic_user", "call_date"],
                name="sa_rec_pic_call_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sarecord",
            index=models.Index(
                fields=["reactivation", "call_date"],
                name="sa_rec_react_call_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sarecord",
            index=models.Index(
                fields=["customer_account", "call_date"],
                name="sa_rec_account_call_idx",
            ),
        ),
    ]
