from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Employee, Shift, Attendance, SalaryAdvance, SalaryTransaction
from .serializers import (
    EmployeeSerializer, ShiftSerializer, AttendanceSerializer,
    SalaryAdvanceSerializer, SalaryTransactionSerializer,
)



# ── Shared helper ─────────────────────────────────────────────────────────────

def get_or_404(model, pk):
    try:
        return model.objects.get(pk=pk)
    except model.DoesNotExist:
        return None


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeListView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request):
        qs = Employee.objects.select_related('shift').all()
        if request.query_params.get('name'):
            qs = qs.filter(employee_name__icontains=request.query_params['name'])
        serializer = EmployeeSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDetailView(APIView):
    #permission_classes = [AllowAny]
    def get_object(self, pk):
        try:
            return Employee.objects.select_related('shift').get(pk=pk)
        except Employee.DoesNotExist:
            return None

    def get(self, request, pk):
        employee = self.get_object(pk)
        if not employee:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmployeeSerializer(employee).data)

    def put(self, request, pk):
        employee = self.get_object(pk)
        if not employee:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmployeeSerializer(employee, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        employee = self.get_object(pk)
        if not employee:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftListView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request):
        shifts = Shift.objects.all()
        return Response(ShiftSerializer(shifts, many=True).data)

    def post(self, request):
        serializer = ShiftSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ShiftDetailView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request, pk):
        obj = get_or_404(Shift, pk)
        if not obj:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShiftSerializer(obj).data)

    def put(self, request, pk):
        obj = get_or_404(Shift, pk)
        if not obj:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ShiftSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = get_or_404(Shift, pk)
        if not obj:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceListView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request):
        qs = Attendance.objects.select_related('employee').all()
        p = request.query_params
        # Filter by employee, month, year, or specific date
        if p.get('employee'):
            qs = qs.filter(employee_id=p['employee'])
        if p.get('month') and p.get('year'):
            qs = qs.filter(date__month=p['month'], date__year=p['year'])
        if p.get('date'):
            qs = qs.filter(date=p['date'])
        return Response(AttendanceSerializer(qs, many=True).data)

    def post(self, request):
        serializer = AttendanceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AttendanceDetailView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request, pk):
        obj = get_or_404(Attendance, pk)
        if not obj:
            return Response({'error': 'Attendance not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AttendanceSerializer(obj).data)

    def put(self, request, pk):
        obj = get_or_404(Attendance, pk)
        if not obj:
            return Response({'error': 'Attendance not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AttendanceSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = get_or_404(Attendance, pk)
        if not obj:
            return Response({'error': 'Attendance not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Salary Advance ────────────────────────────────────────────────────────────

class SalaryAdvanceListView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request):
        qs = SalaryAdvance.objects.select_related('employee').all()
        p = request.query_params
        if p.get('employee'):
            qs = qs.filter(employee_id=p['employee'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        return Response(SalaryAdvanceSerializer(qs, many=True).data)

    def post(self, request):
        serializer = SalaryAdvanceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalaryAdvanceDetailView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request, pk):
        obj = get_or_404(SalaryAdvance, pk)
        if not obj:
            return Response({'error': 'Advance not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SalaryAdvanceSerializer(obj).data)

    def put(self, request, pk):
        obj = get_or_404(SalaryAdvance, pk)
        if not obj:
            return Response({'error': 'Advance not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SalaryAdvanceSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = get_or_404(SalaryAdvance, pk)
        if not obj:
            return Response({'error': 'Advance not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Salary Transaction ────────────────────────────────────────────────────────

class SalaryTransactionListView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request):
        qs = SalaryTransaction.objects.select_related('employee').all()
        p = request.query_params
        if p.get('employee'):
            qs = qs.filter(employee_id=p['employee'])
        if p.get('month'):
            qs = qs.filter(month__month=p['month'])
        if p.get('year'):
            qs = qs.filter(month__year=p['year'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        return Response(SalaryTransactionSerializer(qs, many=True).data)

    def post(self, request):
        serializer = SalaryTransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalaryTransactionDetailView(APIView):
    #permission_classes = [AllowAny]
    def get(self, request, pk):
        obj = get_or_404(SalaryTransaction, pk)
        if not obj:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SalaryTransactionSerializer(obj).data)

    def put(self, request, pk):
        obj = get_or_404(SalaryTransaction, pk)
        if not obj:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SalaryTransactionSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = get_or_404(SalaryTransaction, pk)
        if not obj:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)