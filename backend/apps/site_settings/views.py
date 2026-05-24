from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Setting
from .serializers import SettingSerializer


class SettingListView(APIView):
    def get(self, request):
        return Response(SettingSerializer(Setting.objects.all(), many=True).data)

    def patch(self, request):
        """PATCH {field_name: new_value, ...} — update one or many settings."""
        updated = []
        errors  = {}
        for field_name, value in request.data.items():
            try:
                s = Setting.objects.get(field_name=field_name)
                s.value = str(value)
                s.save()
                updated.append(SettingSerializer(s).data)
            except Setting.DoesNotExist:
                errors[field_name] = 'Unknown setting key'
        if errors:
            return Response({'updated': updated, 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(updated)


class ChangePasswordView(APIView):
    def post(self, request):
        old = request.data.get('old_password', '').strip()
        new = request.data.get('new_password', '').strip()

        if not old or not new:
            return Response(
                {'error': 'Both current and new passwords are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(old):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new)
        request.user.save()
        return Response({'message': 'Password updated successfully.'})
