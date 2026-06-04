from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobcards', '0010_alter_jobcard_job_card_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobcard',
            name='vehicle_sub_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('sedan', 'Sedan'),
                    ('compact_suv', 'Compact SUV'),
                    ('suv', 'SUV'),
                    ('hatchback', 'Hatchback'),
                    ('others', 'Others'),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
