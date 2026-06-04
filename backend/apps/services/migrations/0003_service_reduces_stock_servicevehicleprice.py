from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_remove_serviceproduct_quantity_required'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='reduces_stock',
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name='ServiceVehiclePrice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('vehicle_type', models.CharField(choices=[('two_wheeler', 'Two Wheeler'), ('sedan', 'Sedan'), ('compact_suv', 'Compact SUV'), ('suv', 'SUV'), ('hatchback', 'Hatchback'), ('others', 'Others')], max_length=20)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicle_prices', to='services.service')),
            ],
            options={
                'unique_together': {('service', 'vehicle_type')},
            },
        ),
    ]
