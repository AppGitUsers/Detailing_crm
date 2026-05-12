from django.urls import path
from .views import (
    VendorListCreateView, VendorDetailView, VendorStatementView,
    ProductTypeListCreateView, ProductTypeDetailView,
    ProductListCreateView, ProductDetailView,
    InventoryListView, InventoryDetailView,
    InvoiceListCreateView, InvoiceDetailView, InvoiceItemDeleteView,
    InvoicePaymentListCreateView,
)

urlpatterns = [
    path('', VendorListCreateView.as_view(), name='vendor-list-create'),
    path('<int:pk>/', VendorDetailView.as_view(), name='vendor-detail'),
    path('<int:pk>/statement/', VendorStatementView.as_view(), name='vendor-statement'),

    path('product-types/', ProductTypeListCreateView.as_view(), name='product-type-list-create'),
    path('product-types/<int:pk>/', ProductTypeDetailView.as_view(), name='product-type-detail'),

    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),

    path('inventory/', InventoryListView.as_view(), name='inventory-list'),
    path('inventory/<int:pk>/', InventoryDetailView.as_view(), name='inventory-detail'),

    path('invoices/', InvoiceListCreateView.as_view(), name='invoice-list-create'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/items/<int:pk>/', InvoiceItemDeleteView.as_view(), name='invoice-item-delete'),
    path('invoices/<int:invoice_pk>/payments/', InvoicePaymentListCreateView.as_view(), name='invoice-payment-list-create'),
]
