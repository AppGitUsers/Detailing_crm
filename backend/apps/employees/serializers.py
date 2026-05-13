from rest_framework import serializers
from .models import Employee, Shift, Attendance, SalaryAdvance, SalaryTransaction


# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftSerializer(serializers.ModelSerializer):
    # Read-only helper so the frontend can show "Mon, Tue, Wed" without parsing
    working_day_names = serializers.ListField(read_only=True)

    class Meta:
        model = Shift
        fields = '__all__'


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeSerializer(serializers.ModelSerializer):
    # Show shift name alongside the shift id in responses
    shift_name = serializers.CharField(source='shift.shift_name', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'


# ── Salary Advance ────────────────────────────────────────────────────────────

class SalaryAdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = SalaryAdvance
        fields = '__all__'


# ── Salary Transaction ────────────────────────────────────────────────────────

class SalaryTransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)
    # Return "May 2026" string for display
    month_display = serializers.SerializerMethodField()

    class Meta:
        model = SalaryTransaction
        # net_paid is auto-computed in model.save() — make it read-only here
        fields = '__all__'
        read_only_fields = ['net_paid']

    def get_month_display(self, obj):
        return obj.month.strftime('%B %Y') if obj.month else ''