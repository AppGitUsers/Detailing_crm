from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0005_alter_inventory_minimum_threshold_and_more'),
    ]

    operations = [
        # Allow blank so the model save() can auto-generate it
        migrations.AlterField(
            model_name='invoice',
            name='invoice_number',
            field=models.CharField(blank=True, max_length=255, unique=True),
        ),
        # Optional reference number the vendor puts on their own invoice
        migrations.AddField(
            model_name='invoice',
            name='vendor_invoice_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
