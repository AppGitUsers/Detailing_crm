from rest_framework import serializers
from .models import JobCard, JobCardService, JobCardEmployee


class JobCardEmployeeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source='employee.employee_name',
        read_only=True
    )

    class Meta:
        model = JobCardEmployee
        fields = '__all__'


class JobCardServiceSerializer(serializers.ModelSerializer):
    employees = JobCardEmployeeSerializer(many=True, read_only=True)
    service_name = serializers.CharField(
        source='service.service_name',
        read_only=True
    )

    class Meta:
        model = JobCardService
        fields = '__all__'


class JobCardSerializer(serializers.ModelSerializer):
    job_card_services = JobCardServiceSerializer(many=True, read_only=True)
    vehicle_number = serializers.CharField(
        source='customer_asset.vehicle_number',
        read_only=True
    )
    customer_name = serializers.CharField(
        source='customer_asset.customer.customer_name',
        read_only=True
    )

    class Meta:
        model = JobCard
        fields = '__all__'