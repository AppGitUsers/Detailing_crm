import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0003_producttype_update_product'),
    ]

    operations = [
        # ── Product: remove brand and selling price ──────────────────────────
        migrations.RemoveField(model_name='product', name='brand'),
        migrations.RemoveField(model_name='product', name='product_price'),

        # ── Inventory: OneToOne → ForeignKey ─────────────────────────────────
        migrations.AlterField(
            model_name='inventory',
            name='product',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inventory_records',
                to='vendors.product',
            ),
        ),

        # ── Inventory: new fields ─────────────────────────────────────────────
        migrations.AddField(
            model_name='inventory',
            name='brand',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='inventory',
            name='cost_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='inventory',
            name='selling_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),

        # ── Inventory: unique_together ────────────────────────────────────────
        migrations.AlterUniqueTogether(
            name='inventory',
            unique_together={('product', 'brand', 'cost_price')},
        ),

        # ── InvoiceItem: add selling_price ────────────────────────────────────
        migrations.AddField(
            model_name='invoiceitem',
            name='selling_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),

        # ── InvoiceItem: update unique_together to include brand ──────────────
        migrations.AlterUniqueTogether(
            name='invoiceitem',
            unique_together={('invoice', 'product', 'product_brand')},
        ),
    ]
