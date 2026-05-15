from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import date, datetime
from decimal import Decimal
import calendar

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


# ── Salary Compute (attendance-based) ─────────────────────────────────────────

class SalaryComputeView(APIView):
    def get(self, request):
        emp_id = request.query_params.get('employee')
        month  = request.query_params.get('month')
        year   = request.query_params.get('year')
        if not emp_id or not month or not year:
            return Response({'error': 'employee, month, year required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emp = Employee.objects.select_related('shift').get(pk=emp_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

        month_int = int(month)
        year_int  = int(year)
        shift     = emp.shift

        if not shift:
            return Response({
                'no_shift': True,
                'employee_name': emp.employee_name,
                'base_salary': str(emp.salary),
                'computed_salary': str(emp.salary),
                'expected_hours': 0,
                'actual_hours': 0,
                'overtime_hours': 0,
                'working_days_in_month': 0,
                'shift_hours_per_day': 0,
            })

        # Shift duration in hours
        start_dt = datetime.combine(date.today(), shift.start_time)
        end_dt   = datetime.combine(date.today(), shift.end_time)
        shift_hours_per_day = (end_dt - start_dt).total_seconds() / 3600
        shift_hrs_dec       = Decimal(str(shift_hours_per_day))

        # Count working days in the month based on the shift's working_days config
        days_in_month      = calendar.monthrange(year_int, month_int)[1]
        working_days_count = sum(
            1 for d in range(1, days_in_month + 1)
            if date(year_int, month_int, d).weekday() in shift.working_days_list
        )
        expected_hours = shift_hrs_dec * working_days_count

        records        = Attendance.objects.filter(employee=emp, date__month=month_int, date__year=year_int)
        actual_hours   = Decimal('0')
        overtime_hours = Decimal('0')

        for r in records:
            if r.check_in and r.check_out:
                ci  = datetime.combine(date.today(), r.check_in)
                co  = datetime.combine(date.today(), r.check_out)
                hrs = Decimal(str((co - ci).total_seconds() / 3600))
                actual_hours += hrs
                if hrs > shift_hrs_dec:
                    overtime_hours += hrs - shift_hrs_dec
            elif r.status in ('present', 'late'):
                actual_hours += shift_hrs_dec
            elif r.status == 'half_day':
                actual_hours += shift_hrs_dec / 2
            # absent / leave → 0 hours

        if expected_hours > 0:
            computed_salary = (actual_hours / expected_hours * emp.salary).quantize(Decimal('0.01'))
        else:
            computed_salary = emp.salary

        return Response({
            'no_shift': False,
            'employee_name': emp.employee_name,
            'base_salary': str(emp.salary),
            'computed_salary': str(computed_salary),
            'expected_hours': round(float(expected_hours), 2),
            'actual_hours': round(float(actual_hours), 2),
            'overtime_hours': round(float(overtime_hours), 2),
            'working_days_in_month': working_days_count,
            'shift_hours_per_day': round(shift_hours_per_day, 2),
        })


# ── Kiosk Lookup (confirm step before marking attendance) ─────────────────────

class AttendanceKioskLookupView(APIView):
    def post(self, request):
        emp_code = request.data.get('employee_code', '').strip().upper()
        if not emp_code:
            return Response({'error': 'Employee code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emp = Employee.objects.select_related('shift').get(employee_code=emp_code)
        except Employee.DoesNotExist:
            return Response({'error': f'No employee found with code "{emp_code}"'}, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        try:
            record = Attendance.objects.get(employee=emp, date=today)
        except Attendance.DoesNotExist:
            record = None

        if record is None:
            next_action = 'check_in'
        elif record.check_out is None:
            next_action = 'check_out'
        else:
            next_action = 'update_checkout'

        return Response({
            'employee_id':   emp.id,
            'employee_name': emp.employee_name,
            'employee_code': emp.employee_code,
            'employee_type': emp.employee_type,
            'emp_status':    emp.status,
            'shift_name':    emp.shift.shift_name if emp.shift else None,
            'next_action':   next_action,
            'check_in_time':  record.check_in.strftime('%H:%M')  if record and record.check_in  else None,
            'check_out_time': record.check_out.strftime('%H:%M') if record and record.check_out else None,
        })


# ── Kiosk (employee self check-in / check-out) ────────────────────────────────

class AttendanceKioskView(APIView):
    def post(self, request):
        emp_code = request.data.get('employee_code', '').strip().upper()
        if not emp_code:
            return Response({'error': 'Employee code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            emp = Employee.objects.select_related('shift').get(employee_code=emp_code)
        except Employee.DoesNotExist:
            return Response({'error': f'No employee found with code "{emp_code}"'}, status=status.HTTP_404_NOT_FOUND)

        today    = date.today()
        now_time = datetime.now().time().replace(second=0, microsecond=0)

        is_late = False
        if emp.shift and emp.shift.start_time:
            is_late = now_time > emp.shift.start_time

        try:
            record = Attendance.objects.get(employee=emp, date=today)
        except Attendance.DoesNotExist:
            record = None

        if record is None:
            att_status = 'late' if is_late else 'present'
            Attendance.objects.create(
                employee=emp, date=today, status=att_status,
                check_in=now_time, check_out=None,
            )
            return Response({
                'action': 'checked_in',
                'employee_name': emp.employee_name,
                'employee_code': emp.employee_code,
                'time': now_time.strftime('%H:%M'),
                'status': att_status,
                'message': f'{"Late check-in" if is_late else "Checked in"} at {now_time.strftime("%H:%M")}',
            })

        if record.check_out is None:
            record.check_out = now_time
            record.save()
            return Response({
                'action': 'checked_out',
                'employee_name': emp.employee_name,
                'employee_code': emp.employee_code,
                'time': now_time.strftime('%H:%M'),
                'status': record.status,
                'message': f'Checked out at {now_time.strftime("%H:%M")}',
            })

        # Third+ scan: update check-out time
        record.check_out = now_time
        record.save()
        return Response({
            'action': 'checkout_updated',
            'employee_name': emp.employee_name,
            'employee_code': emp.employee_code,
            'time': now_time.strftime('%H:%M'),
            'status': record.status,
            'message': f'Check-out updated to {now_time.strftime("%H:%M")}',
        })