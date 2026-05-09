from rest_framework import serializers
from .models import Customer, CustomerAsset
class CustomerAssetSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.customer_name', read_only=True)
    class Meta:
        model = CustomerAsset
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    vehicles = CustomerAssetSerializer(many=True, read_only=True)
    class Meta:
        model = Customer
        fields = '__all__'