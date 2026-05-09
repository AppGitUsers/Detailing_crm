from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Vendor, Product, Inventory, Invoice
from .serializers import (
    VendorSerializer, ProductSerializer,
    InventorySerializer, InvoiceSerializer,
    InvoiceCreateSerializer
)


# ─── Vendor ───────────────────────────────────────────

class VendorListCreateView(APIView):
    def get(self, request):
        name = request.query_params.get('name', None)
        if name:
            vendors = Vendor.objects.filter(vendor_name__icontains=name)
        else:
            vendors = Vendor.objects.all()
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = VendorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VendorDetailView(APIView):
    def get_object(self, pk):
        try:
            return Vendor.objects.get(pk=pk)
        except Vendor.DoesNotExist:
            return None

    def get(self, request, pk):
        vendor = self.get_object(pk)
        if not vendor:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = VendorSerializer(vendor)
        return Response(serializer.data)

    def put(self, request, pk):
        vendor = self.get_object(pk)
        if not vendor:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = VendorSerializer(vendor, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        vendor = self.get_object(pk)
        if not vendor:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Product ──────────────────────────────────────────

class ProductListCreateView(APIView):
    def get(self, request):
        name = request.query_params.get('name', None)
        if name:
            products = Product.objects.filter(product_name__icontains=name)
        else:
            products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    def get_object(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProductSerializer(product)
        return Response(serializer.data)

    def put(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Inventory ────────────────────────────────────────

class InventoryListView(APIView):
    def get(self, request):
        low_stock = request.query_params.get('low_stock', None)
        inventory = Inventory.objects.select_related('product').all()
        if low_stock:
            inventory = [i for i in inventory if i.is_low_stock]
        serializer = InventorySerializer(inventory, many=True)
        return Response(serializer.data)


class InventoryDetailView(APIView):
    def get_object(self, pk):
        try:
            return Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return None

    def get(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {'error': 'Inventory not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InventorySerializer(inventory)
        return Response(serializer.data)

    def put(self, request, pk):
        inventory = self.get_object(pk)
        if not inventory:
            return Response(
                {'error': 'Inventory not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InventorySerializer(inventory, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Invoice ──────────────────────────────────────────

class InvoiceListCreateView(APIView):
    def get(self, request):
        invoices = Invoice.objects.select_related('vendor').all()
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = InvoiceCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InvoiceDetailView(APIView):
    def get_object(self, pk):
        try:
            return Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return None

    def get(self, request, pk):
        invoice = self.get_object(pk)
        if not invoice:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)

    def put(self, request, pk):
        invoice = self.get_object(pk)
        if not invoice:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = InvoiceCreateSerializer(invoice, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class InvoiceItemDeleteView(APIView):
    def delete(self, request, pk):
        try:
            item = InvoiceItem.objects.get(pk=pk)
        except InvoiceItem.DoesNotExist:
            return Response(
                {'error': 'Invoice item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            inventory = Inventory.objects.get(product=item.product)
            inventory.quantity_available -= item.quantity
            inventory.save()
        except Inventory.DoesNotExist:
            pass
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)