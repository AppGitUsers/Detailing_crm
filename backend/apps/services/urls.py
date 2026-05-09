from django.urls import path
from .views import (
    ServiceListCreateView, ServiceDetailView,
    ServiceProductListCreateView, ServiceProductDeleteView,
    ServiceEmployeeListCreateView, ServiceEmployeeDeleteView
)

urlpatterns = [
    # Service
    path('', ServiceListCreateView.as_view(), name='service-list'),
    path('<int:pk>/', ServiceDetailView.as_view(), name='service-detail'),

    # Service Products
    path('<int:service_pk>/products/', ServiceProductListCreateView.as_view(), name='service-product-list'),
    path('products/<int:pk>/', ServiceProductDeleteView.as_view(), name='service-product-delete'),

    # Service Employees
    path('<int:service_pk>/employees/', ServiceEmployeeListCreateView.as_view(), name='service-employee-list'),
    path('employees/<int:pk>/', ServiceEmployeeDeleteView.as_view(), name='service-employee-delete'),
]