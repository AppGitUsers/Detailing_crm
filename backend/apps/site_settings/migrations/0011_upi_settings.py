from django.db import migrations


def add_upi_settings(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    rows = [
        dict(field_name='upi_id',   label='UPI ID',
             value='', category='business', field_type='text',
             description='Your UPI VPA used for payment QR codes (e.g. workshop@okhdfcbank)',
             sort_order=20),
        dict(field_name='upi_name', label='UPI Payee Name',
             value='', category='business', field_type='text',
             description='Payee name shown on the UPI QR (e.g. My Workshop)',
             sort_order=21),
        dict(field_name='upi_note', label='UPI Payment Note',
             value='Car Detailing Payment', category='business', field_type='text',
             description='Transaction note shown in UPI apps',
             sort_order=22),
    ]
    for row in rows:
        Setting.objects.get_or_create(
            field_name=row['field_name'],
            defaults={k: v for k, v in row.items() if k != 'field_name'},
        )


def remove_upi_settings(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    Setting.objects.filter(field_name__in=['upi_id', 'upi_name', 'upi_note']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('site_settings', '0010_notify_service_complete'),
    ]

    operations = [
        migrations.RunPython(add_upi_settings, remove_upi_settings),
    ]
