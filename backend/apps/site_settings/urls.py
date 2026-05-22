from django.urls import path
from .views import SettingListView, ChangePasswordView

urlpatterns = [
    path('', SettingListView.as_view(), name='setting-list'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
