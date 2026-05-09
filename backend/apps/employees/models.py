from django.db import models

# Create your models here.
class Employee(models.Model):
    EMPLOYEE_TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contractor', 'Contractor'),
    ]
    employee_name = models.CharField(max_length=255)
    employee_phone_number = models.CharField(max_length=20, unique=True)
    employee_email = models.EmailField(unique = True)
    employee_address = models.CharField(max_length=255)
    employee_type = models.CharField(max_length=20, choices=EMPLOYEE_TYPE_CHOICES)
    joining_date = models.DateField()
    dob= models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.employee_name