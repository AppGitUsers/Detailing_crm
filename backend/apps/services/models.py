from django.db import models

# Create your models here.
class Service(models.Model):
    service_name = models.CharField(max_length=255)
    service_description = models.TextField(blank=True, null=True)
    service_price = models.DecimalField(max_digits=10, decimal_places=2)
    service_code = models.CharField(max_length=50, unique=True)
    def __str__(self):
        return self.service_name
    
class ServiceProduct(models.Model):
    service = models.ForeignKey(Service, related_name='products', on_delete=models.CASCADE)
    product = models.ForeignKey('vendors.Product', on_delete=models.PROTECT)
    quantity_required = models.DecimalField(max_digits=10, decimal_places=2)

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

