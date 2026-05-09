from django.contrib import admin
from .models import Service, ServiceProduct, ServiceEmployee
# Register your models here.
admin.site.register(Service)
admin.site.register(ServiceProduct)
admin.site.register(ServiceEmployee)

