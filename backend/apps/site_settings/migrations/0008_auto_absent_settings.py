from django.db import migrations

NEW_SETTINGS = [
    # (field_name, label, value, category, field_type, options, description, sort_order)
    ('auto_absent_threshold_hours', 'Auto-Absent Threshold (hours)', '1', 'operations', 'number', '',
     'Hours after shift start with no check-in before an employee is automatically marked absent. Default: 1.', 21),
    ('NOTIFY_AUTO_ABSENT', 'Notify on Auto-Absent', 'true', 'operations', 'select', 'true,false',
     'Send a WhatsApp alert to the employee and admin when someone is auto-marked absent.', 22),
]


def add_settings(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    for row in NEW_SETTINGS:
        Setting.objects.get_or_create(
            field_name=row[0],
            defaults={
                'label':       row[1],
                'value':       row[2],
                'category':    row[3],
                'field_type':  row[4],
                'options':     row[5],
                'description': row[6],
                'sort_order':  row[7],
            },
        )


def remove_settings(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    Setting.objects.filter(field_name__in=[r[0] for r in NEW_SETTINGS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('site_settings', '0007_merge_20260608_1058'),
    ]

    operations = [
        migrations.RunPython(add_settings, remove_settings),
    ]
