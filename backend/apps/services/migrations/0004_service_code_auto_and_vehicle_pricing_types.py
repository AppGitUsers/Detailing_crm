from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0003_service_reduces_stock_servicevehicleprice'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='service_code',
            field=models.CharField(blank=True, max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='servicevehicleprice',
            name='vehicle_type',
            field=models.CharField(
                choices=[
                    ('two_wheeler',         'Two Wheeler'),
                    ('sedan',               'Sedan'),
                    ('compact_suv',         'Compact SUV'),
                    ('suv',                 'SUV'),
                    ('hatchback',           'Hatchback'),
                    ('four_wheeler_others', '4-Wheeler Others'),
                    ('others',              'Others'),
                ],
                max_length=20,
            ),
        ),
    ]
