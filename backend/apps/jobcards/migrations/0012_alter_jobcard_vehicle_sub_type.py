from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobcards', '0011_jobcard_vehicle_sub_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='jobcard',
            name='vehicle_sub_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('sedan',               'Sedan'),
                    ('compact_suv',         'Compact SUV'),
                    ('suv',                 'SUV'),
                    ('hatchback',           'Hatchback'),
                    ('four_wheeler_others', '4-Wheeler Others'),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
