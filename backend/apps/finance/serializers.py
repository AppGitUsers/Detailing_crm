from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
    
    def create(self, validated_data):
        return Expense.objects.create(**validated_data)
    
    