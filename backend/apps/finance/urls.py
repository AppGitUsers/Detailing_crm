from django.urls import path
from .views import FinanceDashboardView, FinanceIncomeView, FinanceExpenseView, DailyReportView

urlpatterns = [
    path('dashboard/',    FinanceDashboardView.as_view(), name='finance-dashboard'),
    path('income/',       FinanceIncomeView.as_view(),    name='finance-income'),
    path('expense/',      FinanceExpenseView.as_view(),   name='finance-expense'),
    path('daily-report/', DailyReportView.as_view(),      name='finance-daily-report'),
]
