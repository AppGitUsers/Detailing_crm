from django.contrib import admin
from .models import JobCard, JobCardService, JobCardEmployee
# Register your models here.
admin.site.register(JobCard)
admin.site.register(JobCardService)
admin.site.register(JobCardEmployee)
