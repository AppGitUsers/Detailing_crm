from django.db import models


class Setting(models.Model):
    CATEGORY_FINANCIAL   = 'financial'
    CATEGORY_BUSINESS    = 'business'
    CATEGORY_INCENTIVE   = 'incentive'
    CATEGORY_OPERATIONS  = 'operations'

    CATEGORY_CHOICES = [
        (CATEGORY_FINANCIAL,  'Financial'),
        (CATEGORY_BUSINESS,   'Business Info'),
        (CATEGORY_INCENTIVE,  'Staff & Incentive'),
        (CATEGORY_OPERATIONS, 'Operations'),
    ]

    FIELD_TYPE_CHOICES = [
        ('text',     'Text'),
        ('number',   'Number'),
        ('percent',  'Percent'),
        ('email',    'Email'),
        ('tel',      'Phone'),
        ('textarea', 'Textarea'),
        ('select',   'Select'),
    ]

    field_name  = models.CharField(max_length=100, unique=True)
    label       = models.CharField(max_length=255)
    value       = models.TextField(default='')
    category    = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default=CATEGORY_FINANCIAL)
    field_type  = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES, default='text')
    # comma-separated option list used when field_type == 'select'
    options     = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    sort_order  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category', 'sort_order', 'id']

    def __str__(self):
        return f'{self.field_name} = {self.value}'
