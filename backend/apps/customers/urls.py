from django.urls import path
from .views import CustomerAssetDetailView, CustomerListView, CustomerDetailView, CustomerAssetListView
urlpatterns = [
    path('',CustomerListView.as_view(), name='customer-list'),
    path('<int:pk>/',CustomerDetailView.as_view(), name='customer-detail'),
    path('<int:customer_pk>/assets/', CustomerAssetListView.as_view(), name='customer-asset-list'),
    path('assets/<int:pk>/', CustomerAssetDetailView.as_view(), name='customer-asset-detail'),
]