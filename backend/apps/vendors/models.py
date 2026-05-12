from decimal import Decimal
from django.db import models

# Create your models here.
class Vendor(models.Model):
    vendor_name = models.CharField(max_length=255)
    vendor_phone_number = models.CharField(max_length=20, unique=True)
    vendor_email = models.EmailField(unique = True)
    vendor_address = models.CharField(max_length=255)
    vendor_gst_number = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.vendor_name
class ProductType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    UNIT_CHOICES = [
        ('l',   'Litres'),
        ('ml',  'Millilitres'),
        ('pcs', 'Pieces'),
        ('kg',  'Kilograms'),
        ('g',   'Grams'),
        ('box', 'Box / Pack'),
        ('set', 'Set'),
    ]
    CATEGORY_CHOICES = [
        ('consumption',  'Consumption'),
        ('sales',        'Sales'),
        ('fixed_assets', 'Fixed Assets'),
        ('other',        'Other'),
    ]

    product_name        = models.CharField(max_length=255)
    product_code        = models.CharField(max_length=100, blank=True, null=True, unique=True)
    hsn_code            = models.CharField(max_length=20, blank=True)
    brand               = models.CharField(max_length=255, blank=True)
    product_description = models.TextField(blank=True, null=True)
    product_price       = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    product_unit        = models.CharField(max_length=10, choices=UNIT_CHOICES)
    product_type        = models.ForeignKey(
                            ProductType, on_delete=models.SET_NULL,
                            null=True, blank=True, related_name='products')
    category            = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='consumption')

    def save(self, *args, **kwargs):
        if not self.product_code:
            existing = Product.objects.filter(
                product_code__startswith='PRD-'
            ).values_list('product_code', flat=True)
            nums = []
            for code in existing:
                try:
                    nums.append(int(code[4:]))
                except (ValueError, IndexError):
                    pass
            self.product_code = f'PRD-{(max(nums) + 1 if nums else 1):04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.product_name

class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    quantity_available = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_threshold = models.DecimalField(max_digits=10, decimal_places=2)    
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.product_name} - {self.quantity_available}"
    
    @property
    def is_low_stock(self):
        return self.quantity_available <= self.minimum_threshold
    
class Invoice(models.Model):
    invoice_number = models.CharField(max_length=255, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    invoice_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.invoice_number

    @property
    def total_paid(self):
        return sum((p.amount for p in self.payments.all()), Decimal('0'))

    @property
    def outstanding_amount(self):
        return self.total_amount - self.total_paid

    @property
    def payment_status(self):
        paid = self.total_paid
        if paid >= self.total_amount:
            return 'paid'
        elif paid > 0:
            return 'partial'
        return 'unpaid'

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_brand = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        unique_together = ('invoice', 'product')

    def __str__(self):
        return f"{self.product.product_name} - {self.quantity} {self.product.product_unit}"


class InvoicePayment(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='payments', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    payment_reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment ₹{self.amount} for {self.invoice.invoice_number}"