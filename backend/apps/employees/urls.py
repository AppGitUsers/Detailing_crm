from django.urls import path
from .views import (
    EmployeeListView, EmployeeDetailView,
    ShiftListView, ShiftDetailView,
    AttendanceListView, AttendanceDetailView,
    SalaryAdvanceListView, SalaryAdvanceDetailView,
    SalaryTransactionListView, SalaryTransactionDetailView,
)

urlpatterns = [
    # Employees — existing, unchanged
    path('', EmployeeListView.as_view(), name='employee-list'),
    path('<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),

    # Shifts
    path('shifts/', ShiftListView.as_view(), name='shift-list'),
    path('shifts/<int:pk>/', ShiftDetailView.as_view(), name='shift-detail'),

    # Attendance
    path('attendance/', AttendanceListView.as_view(), name='attendance-list'),
    path('attendance/<int:pk>/', AttendanceDetailView.as_view(), name='attendance-detail'),

    # Salary Advances
    path('salary/advances/', SalaryAdvanceListView.as_view(), name='salary-advance-list'),
    path('salary/advances/<int:pk>/', SalaryAdvanceDetailView.as_view(), name='salary-advance-detail'),

    # Salary Transactions
    path('salary/transactions/', SalaryTransactionListView.as_view(), name='salary-transaction-list'),
    path('salary/transactions/<int:pk>/', SalaryTransactionDetailView.as_view(), name='salary-transaction-detail'),
]