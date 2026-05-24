from django.db import migrations

# (field_name, label, value, category, field_type, options, description, sort_order)
DEFAULT_SETTINGS = [
    # ── Financial ──────────────────────────────────────────────────────────────
    ('default_gst_percent',    'Default GST Rate (%)',       '18',    'financial', 'percent', '',
     'Default GST percentage pre-filled on every new job card. Can still be changed per job card.', 1),
    ('default_payment_method', 'Default Payment Method',     'cash',  'financial', 'select',
     'cash,upi,card,netbanking,cheque,other',
     'Default method pre-selected when recording a payment.', 2),

    # ── Business Info ──────────────────────────────────────────────────────────
    ('business_name',       'Business Name',       'Detailing Workshop', 'business', 'text',     '', '', 1),
    ('business_phone',      'Business Phone',      '',                   'business', 'tel',      '', '', 2),
    ('business_email',      'Business Email',      '',                   'business', 'email',    '', '', 3),
    ('business_address',    'Business Address',    '',                   'business', 'textarea', '', '', 4),
    ('business_gst_number', 'Business GST Number', '',                   'business', 'text',     '',
     'Your GSTIN printed on receipts and invoices.', 5),

    # ── Staff & Incentive ──────────────────────────────────────────────────────
    ('staff_roles',              'Staff Roles',                   'Manager,Technician,Receptionist,Driver',
     'incentive', 'text', '',
     'Comma-separated list of roles available when creating staff members.', 1),
    ('incentive_type',           'Incentive Calculation',         'percent',
     'incentive', 'select', 'fixed,percent',
     'How staff incentives are calculated — a flat fixed amount or a percentage of their salary.', 2),
    ('incentive_fixed_amount',   'Fixed Incentive Amount (₹)',    '0',
     'incentive', 'number', '',
     'Monthly flat incentive paid to each staff member (active when Incentive Calculation = fixed).', 3),
    ('incentive_salary_percent', 'Incentive % of Salary',        '10',
     'incentive', 'percent', '',
     'Percentage of base salary given as incentive (active when Incentive Calculation = percent).', 4),
    ('overtime_rate_per_hour',   'Overtime Rate / Hour (₹)',      '0',
     'incentive', 'number', '',
     'Amount paid for each hour of overtime work.', 5),
    ('monthly_revenue_target',   'Monthly Revenue Target (₹)',    '0',
     'incentive', 'number', '',
     'Business revenue target per month — used for performance tracking.', 6),

    # ── Operations ─────────────────────────────────────────────────────────────
    ('low_stock_threshold',       'Default Low-Stock Threshold (qty)', '5',
     'operations', 'number', '',
     'Default minimum quantity used when creating new inventory items.', 1),
    ('invoice_due_days',          'Invoice Payment Due Days',          '30',
     'operations', 'number', '',
     'Number of days after invoice date before it is considered overdue.', 2),
    ('outstanding_reminder_days', 'Outstanding Reminder Days',         '7',
     'operations', 'number', '',
     'Days past the due date before a payment reminder is flagged.', 3),
]


def create_settings(apps, schema_editor):
    Setting = apps.get_model('site_settings', 'Setting')
    for row in DEFAULT_SETTINGS:
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
    Setting.objects.filter(field_name__in=[r[0] for r in DEFAULT_SETTINGS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('site_settings', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(create_settings, remove_settings),
    ]
