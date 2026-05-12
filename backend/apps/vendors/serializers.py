from decimal import Decimal
from rest_framework import serializers
from .models import Vendor, Product, Inventory, Invoice, InvoiceItem, InvoicePayment


class VendorSerializer(serializers.ModelSerializer):
    total_invoiced = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()
    invoice_stats = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'

    def _stats(self, obj):
        """Compute all financial + invoice-count stats in a single Python pass.
        Works from prefetch cache when the queryset includes
        prefetch_related('invoice_set__payments').
        """
        if hasattr(obj, '_vendor_stats_cache'):
            return obj._vendor_stats_cache

        total_invoiced = Decimal('0')
        total_paid_amt = Decimal('0')
        paid_count = partial_count = unpaid_count = 0

        for inv in obj.invoice_set.all():
            total_invoiced += inv.total_amount
            inv_paid = sum((p.amount for p in inv.payments.all()), Decimal('0'))
            total_paid_amt += inv_paid
            if inv_paid >= inv.total_amount:
                paid_count += 1
            elif inv_paid > 0:
                partial_count += 1
            else:
                unpaid_count += 1

        obj._vendor_stats_cache = {
            'total_invoiced': total_invoiced,
            'total_paid': total_paid_amt,
            'outstanding': total_invoiced - total_paid_amt,
            'total': paid_count + partial_count + unpaid_count,
            'paid': paid_count,
            'partial': partial_count,
            'unpaid': unpaid_count,
        }
        return obj._vendor_stats_cache

    def get_total_invoiced(self, obj):
        return str(self._stats(obj)['total_invoiced'])

    def get_total_paid(self, obj):
        return str(self._stats(obj)['total_paid'])

    def get_outstanding(self, obj):
        return str(self._stats(obj)['outstanding'])

    def get_invoice_stats(self, obj):
        s = self._stats(obj)
        return {'total': s['total'], 'paid': s['paid'], 'partial': s['partial'], 'unpaid': s['unpaid']}


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    unit = serializers.CharField(source='product.product_unit', read_only=True)

    class Meta:
        model = Inventory
        fields = '__all__'


class InvoicePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoicePayment
        fields = '__all__'
        read_only_fields = ('invoice', 'created_at')


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ('invoice',)


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class InvoiceCreateSerializer(serializers.ModelSerializer):
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
            inventory, _ = Inventory.objects.get_or_create(
                product=product,
                defaults={'quantity_available': 0, 'minimum_threshold': 0}
            )
            inventory.quantity_available += quantity
            inventory.save()

        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items')

        for old_item in instance.items.all():
            try:
                inv = Inventory.objects.get(product=old_item.product)
                inv.quantity_available -= old_item.quantity
                inv.save()
            except Inventory.DoesNotExist:
                pass
        instance.items.all().delete()

        instance.vendor = validated_data.get('vendor', instance.vendor)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.total_amount = validated_data.get('total_amount', instance.total_amount)
        instance.invoice_date = validated_data.get('invoice_date', instance.invoice_date)
        instance.save()

        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            InvoiceItem.objects.create(invoice=instance, **item_data)
            inventory, _ = Inventory.objects.get_or_create(
                product=product,
                defaults={'quantity_available': 0, 'minimum_threshold': 0}
            )
            inventory.quantity_available += quantity
            inventory.save()

        return instance
