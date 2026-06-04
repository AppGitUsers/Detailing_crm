from django.db import migrations


def add_setting(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    Setting.objects.get_or_create(
        field_name='incentive_order_threshold',
        defaults={
            'label':       'Incentive Order Threshold',
            'value':       '10',
            'category':    'incentive',
            'field_type':  'number',
            'options':     '',
            'description': 'Minimum number of job card services an employee must complete in a month to qualify for the incentive.',
            'sort_order':  7,
        },
    )


def remove_setting(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    Setting.objects.filter(field_name='incentive_order_threshold').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('site_settings', '0002_default_data'),
    ]

    operations = [
        migrations.RunPython(add_setting, remove_setting),
    ]
