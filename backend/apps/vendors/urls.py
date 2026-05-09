from django.urls import path
from .views import (ProductDetailView, VendorListCreateView, VendorDetailView, ProductListCreateView, InvoiceListCreateView, InventoryListView, InvoiceDetailView, InventoryDetailView, InvoiceItemDeleteView)

urlpatterns = [
    path('', VendorListCreateView.as_view(), name='vendor-list-create'),
    path('<int:pk>/', VendorDetailView.as_view(), name='vendor-detail'),
    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('inventory/', InventoryListView.as_view(), name='inventory-list-create'),
    path('inventory/<int:pk>/', InventoryDetailView.as_view(), name='inventory-detail'),
    path('invoices/', InvoiceListCreateView.as_view(), name='invoice-list-create'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/items/<int:pk>/', InvoiceItemDeleteView.as_view(), name='invoice-item-delete'),
]


