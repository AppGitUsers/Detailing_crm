from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0004_service_code_auto_and_vehicle_pricing_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='has_warranty',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='service',
            name='warranty_months',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
