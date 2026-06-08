from django.db import migrations


def empty_email_to_null(apps, schema_editor):
    Customer = apps.get_model('customers', 'Customer')
    Customer.objects.filter(email='').update(email=None)


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0005_garageowner_customer_garage'),
    ]

    operations = [
        migrations.RunPython(empty_email_to_null, migrations.RunPython.noop),
    ]
