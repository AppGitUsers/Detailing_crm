from django.contrib import admin
from .models import Vendor, Product, Inventory, Invoice, InvoiceItem
# Register your models here.
admin.site.register(Vendor)
admin.site.register(Product)
admin.site.register(Inventory)
admin.site.register(Invoice)
admin.site.register(InvoiceItem)
