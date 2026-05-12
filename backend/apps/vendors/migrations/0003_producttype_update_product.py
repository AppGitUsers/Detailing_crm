import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0002_invoicepayment'),
    ]

    operations = [
        # 1. Create ProductType table
        migrations.CreateModel(
            name='ProductType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['name']},
        ),

        # 2. Remove old free-text product_type CharField
        migrations.RemoveField(model_name='product', name='product_type'),

        # 3. Remove cost price field
        migrations.RemoveField(model_name='product', name='product_unit_price'),

        # 4. Make product_price optional (selling price only, not all products need it)
        migrations.AlterField(
            model_name='product',
            name='product_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),

        # 5. Extend unit choices
        migrations.AlterField(
            model_name='product',
            name='product_unit',
            field=models.CharField(
                choices=[('l','Litres'),('ml','Millilitres'),('pcs','Pieces'),
                         ('kg','Kilograms'),('g','Grams'),('box','Box / Pack'),('set','Set')],
                max_length=10,
            ),
        ),

        # 6. New fields
        migrations.AddField(
            model_name='product', name='product_code',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='product', name='hsn_code',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='product', name='brand',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='product', name='category',
            field=models.CharField(
                choices=[('consumption','Consumption'),('sales','Sales'),
                         ('fixed_assets','Fixed Assets'),('other','Other')],
                default='consumption', max_length=50,
            ),
        ),

        # 7. Add FK product_type (nullable — existing products get NULL)
        migrations.AddField(
            model_name='product', name='product_type',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='products', to='vendors.producttype',
            ),
        ),
    ]
