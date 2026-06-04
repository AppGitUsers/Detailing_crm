from django.db import models

class Service(models.Model):
    service_name = models.CharField(max_length=255)
    service_description = models.TextField(blank=True, null=True)
    service_price = models.DecimalField(max_digits=10, decimal_places=2)
    service_code    = models.CharField(max_length=50, unique=True, blank=True)
    reduces_stock   = models.BooleanField(default=True)
    has_warranty    = models.BooleanField(default=False)
    warranty_months = models.PositiveIntegerField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.service_code:
            prefix = 'SVC-'
            existing = Service.objects.filter(
                service_code__startswith=prefix
            ).values_list('service_code', flat=True)
            nums = []
            for code in existing:
                try:
                    nums.append(int(code[len(prefix):]))
                except (ValueError, IndexError):
                    pass
            next_num = (max(nums) + 1) if nums else 1
            self.service_code = f'{prefix}{next_num:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.service_name


VEHICLE_PRICING_TYPES = [
    ('two_wheeler',         'Two Wheeler'),
    ('sedan',               'Sedan'),
    ('compact_suv',         'Compact SUV'),
    ('suv',                 'SUV'),
    ('hatchback',           'Hatchback'),
    ('four_wheeler_others', '4-Wheeler Others'),
    ('others',              'Others'),
]


class ServiceVehiclePrice(models.Model):
    service = models.ForeignKey(Service, related_name='vehicle_prices', on_delete=models.CASCADE)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_PRICING_TYPES)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('service', 'vehicle_type')

    def __str__(self):
        return f"{self.service.service_name} - {self.vehicle_type} - ₹{self.price}"
    
class ServiceProduct(models.Model):
    service = models.ForeignKey(Service, related_name='products', on_delete=models.CASCADE)
    product = models.ForeignKey('vendors.Product', on_delete=models.PROTECT)
    class Meta:
        unique_together = ('service', 'product')
    def __str__(self):
        return f"{self.service.service_name} - {self.product.product_name}"
    
class ServiceEmployee(models.Model):
    service = models.ForeignKey(Service, related_name='employees', on_delete=models.CASCADE)
    employee = models.ForeignKey('employees.Employee', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('service', 'employee')
    def __str__(self):
        return f"{self.service.service_name} - {self.employee.employee_name}"

