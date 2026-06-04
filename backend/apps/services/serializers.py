from rest_framework import serializers
from .models import Service, ServiceProduct, ServiceEmployee, ServiceVehiclePrice


class ServiceProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    unit = serializers.CharField(source='product.product_unit', read_only=True)

    class Meta:
        model = ServiceProduct
        fields = '__all__'


class ServiceEmployeeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = ServiceEmployee
        fields = '__all__'


class ServiceVehiclePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceVehiclePrice
        fields = '__all__'


class ServiceSerializer(serializers.ModelSerializer):
    products = ServiceProductSerializer(many=True, read_only=True)
    employees = ServiceEmployeeSerializer(many=True, read_only=True)
    vehicle_prices = ServiceVehiclePriceSerializer(many=True, read_only=True)
    service_code = serializers.CharField(read_only=True)

    class Meta:
        model = Service
        fields = '__all__'
