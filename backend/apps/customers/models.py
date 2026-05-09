from django.db import models

# Create your models here.
class Customer(models.Model):
    customer_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique = True)

    def __str__(self):
        return self.customer_name
    
class CustomerAsset(models.Model):
    customer = models.ForeignKey(Customer, related_name='vehicles', on_delete=models.CASCADE)
    vehicle_number = models.CharField(max_length=50, unique=True)
    vehicle_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.customer.customer_name} - {self.vehicle_name}"
    
