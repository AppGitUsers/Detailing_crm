from rest_framework import serializers
from .models import Setting


class SettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setting
        fields = ['id', 'field_name', 'label', 'value', 'category',
                  'field_type', 'options', 'description']
        read_only_fields = ['id', 'field_name', 'label', 'category',
                            'field_type', 'options', 'description']
