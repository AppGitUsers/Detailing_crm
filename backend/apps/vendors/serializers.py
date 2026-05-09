from rest_framework import serializers
from .models import Vendor, Product, Inventory, Invoice, InvoiceItem


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    unit = serializers.CharField(
        source='product.product_unit',
        read_only=True
    )

    class Meta:
        model = Inventory
        fields = '__all__'


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'

class InvoiceCreateSerializer(serializers.ModelSerializer):
    # For creating/updating — accepts items as input
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']

            InvoiceItem.objects.create(invoice=invoice, **item_data)

            inventory, created = Inventory.objects.get_or_create(
                product=product,
                defaults={
                    'quantity_available': 0,
                    'minimum_threshold': 0
                }
            )
            inventory.quantity_available += quantity
            inventory.save()

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items')

        # Step 1: Reverse old inventory effect
        old_items = instance.items.all()
        for old_item in old_items:
            try:
                inventory = Inventory.objects.get(product=old_item.product)
                inventory.quantity_available -= old_item.quantity
                inventory.save()
            except Inventory.DoesNotExist:
                pass

        # Step 2: Delete old items
        old_items.delete()

        # Step 3: Update invoice fields
        instance.vendor = validated_data.get('vendor', instance.vendor)
        instance.invoice_number = validated_data.get(
            'invoice_number', instance.invoice_number
        )
        instance.total_amount = validated_data.get(
            'total_amount', instance.total_amount
        )
        instance.invoice_date = validated_data.get(
            'invoice_date', instance.invoice_date
        )
        instance.save()

        # Step 4: Create new items and update inventory
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']

            InvoiceItem.objects.create(invoice=instance, **item_data)

            inventory, created = Inventory.objects.get_or_create(
                product=product,
                defaults={
                    'quantity_available': 0,
                    'minimum_threshold': 0
                }
            )
            inventory.quantity_available += quantity
            inventory.save()

        return instance