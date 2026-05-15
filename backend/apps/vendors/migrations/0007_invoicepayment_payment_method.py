from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0006_invoice_auto_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoicepayment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('cash',       'Cash'),
                    ('upi',        'UPI'),
                    ('card',       'Card'),
                    ('netbanking', 'Net Banking'),
                    ('cheque',     'Cheque'),
                    ('other',      'Other'),
                ],
                default='cash',
                max_length=20,
            ),
        ),
    ]
