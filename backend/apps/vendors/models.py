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
class Product(models.Model):
    UNIT_CHOICES = [
        ('l','Litres'),
        ('pcs','Pieces'),
        ('kg','Kilograms'),
        ('g','Grams'),
    ]
    product_name = models.CharField(max_length=255)
    product_description = models.TextField(blank=True, null=True)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    product_unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_type = models.CharField(max_length=255)

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