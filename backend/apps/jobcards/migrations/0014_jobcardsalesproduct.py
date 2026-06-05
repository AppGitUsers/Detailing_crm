from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('jobcards', '0013_jobcard_garage_owner'),
        ('vendors',  '0008_alter_inventory_unique_together_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='JobCardSalesProduct',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity',   models.DecimalField(decimal_places=2, max_digits=10)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('job_card',   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sales_products', to='jobcards.jobcard')),
                ('inventory',  models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='vendors.inventory')),
            ],
        ),
    ]
