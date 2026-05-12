from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
# SHIFT
# ─────────────────────────────────────────────────────────────────────────────

WORKING_DAYS_PRESET_CHOICES = [
    ('mon_sun', 'Mon – Sun (All week)'),
    ('mon_fri', 'Mon – Fri (Weekdays)'),
    ('mon_sat', 'Mon – Sat'),
    ('sat_sun', 'Sat – Sun (Weekends)'),
    ('custom',  'Custom days'),
]

PRESET_DAY_MAP = {
    'mon_sun': '0,1,2,3,4,5,6',
    'mon_fri': '0,1,2,3,4',
    'mon_sat': '0,1,2,3,4,5',
    'sat_sun': '5,6',
}


class Shift(models.Model):
    shift_name          = models.CharField(max_length=100, unique=True)
    start_time          = models.TimeField()
    end_time            = models.TimeField()
    working_days_preset = models.CharField(
        max_length=10, choices=WORKING_DAYS_PRESET_CHOICES, default='mon_sun'
    )
    # Comma-separated ints "0,1,2,3,4" — auto-filled from preset unless custom
    working_days        = models.CharField(max_length=20, default='0,1,2,3,4,5,6')
    description         = models.TextField(blank=True, null=True)

    # #1 — Timestamps
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['shift_name']

    def __str__(self):
        return f"{self.shift_name} ({self.start_time.strftime('%H:%M')} – {self.end_time.strftime('%H:%M')})"

    # #2 — Validate shift times (no accidental overnight unless intentional)
    def clean(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time. For overnight shifts, split into two shifts.'
                })

    @property
    def working_days_list(self):
        """Returns list of ints e.g. [0, 1, 2, 3, 4]"""
        if not self.working_days:
            return list(range(7))
        return [int(d) for d in self.working_days.split(',') if d.strip().isdigit()]

    @property
    def working_day_names(self):
        """Returns readable names e.g. ['Mon', 'Tue', 'Wed']"""
        day_map = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}
        return [day_map[d] for d in self.working_days_list]

    def is_working_day(self, date):
        return date.weekday() in self.working_days_list

    def save(self, *args, **kwargs):
        # Auto-populate working_days from preset (skip if custom)
        if self.working_days_preset in PRESET_DAY_MAP:
            self.working_days = PRESET_DAY_MAP[self.working_days_preset]
        self.full_clean()   # run clean() on every save
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE
# ─────────────────────────────────────────────────────────────────────────────

class Employee(models.Model):
    EMPLOYEE_TYPE_CHOICES = [
        ('full_time',  'Full Time'),
        ('part_time',  'Part Time'),
        ('contractor', 'Contractor'),
    ]

    # #4 — Employee code (EMP001, EMP002 etc.)
    employee_code         = models.CharField(max_length=20, unique=True)
    employee_name         = models.CharField(max_length=255)
    employee_phone_number = models.CharField(max_length=20, unique=True)
    employee_email        = models.EmailField(unique=True)
    employee_address      = models.CharField(max_length=255)
    employee_type         = models.CharField(max_length=20, choices=EMPLOYEE_TYPE_CHOICES)
    joining_date          = models.DateField()
    dob                   = models.DateField(null=True, blank=True)

    # #10 — Prevent negative salary
    salary                = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Employee's currently assigned shift (SET_NULL so deleting a shift doesn't delete employee)
    shift                 = models.ForeignKey(
        Shift, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )

    # #1 — Timestamps
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_name']

    def __str__(self):
        return f"{self.employee_code} – {self.employee_name}"


# ─────────────────────────────────────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────────────────────────────────────

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present',  'Present'),
        ('absent',   'Absent'),
        ('half_day', 'Half Day'),
        ('leave',    'Leave'),
        # #5 — Ready for auto-status later
        ('late',     'Late'),
    ]

    employee  = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    date      = models.DateField()
    status    = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    check_in  = models.TimeField(blank=True, null=True)
    check_out = models.TimeField(blank=True, null=True)
    notes     = models.TextField(blank=True, null=True)

    # #1 — Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

        # #3 — UniqueConstraint (modern Django preferred over unique_together)
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_employee_attendance_per_day'
            )
        ]

        # #9 — Index on date for fast monthly queries
        indexes = [
            models.Index(fields=['date'], name='attendance_date_idx'),
            models.Index(fields=['employee', 'date'], name='attendance_employee_date_idx'),
        ]

    def __str__(self):
        return f"{self.employee.employee_name} – {self.date} [{self.status}]"


# ─────────────────────────────────────────────────────────────────────────────
# SALARY ADVANCE
# ─────────────────────────────────────────────────────────────────────────────

class SalaryAdvance(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('deducted', 'Deducted'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_advances')
    date     = models.DateField()

    # #10 — Prevent negative amount
    amount   = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    reason   = models.TextField(blank=True, null=True)
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # #1 — Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

        # #9 — Index for fast employee advance lookups
        indexes = [
            models.Index(fields=['employee', 'status'], name='advance_employee_status_idx'),
        ]

    def __str__(self):
        return f"{self.employee.employee_name} – ₹{self.amount} ({self.status})"


# ─────────────────────────────────────────────────────────────────────────────
# SALARY TRANSACTION
# ─────────────────────────────────────────────────────────────────────────────
# One record per employee per month.
# month stored as first day of the month: 2026-05-01 = May 2026.
# net_paid is auto-computed on save(): base_salary + bonus - advance_deduction.

class SalaryTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid',    'Paid'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_transactions')

    # Store as 2026-05-01 for May 2026 — easy to sort and filter
    month    = models.DateField()

    # #10 — Prevent negative values on all money fields
    base_salary       = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    bonus             = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    advance_deduction = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Auto-computed — do not set manually
    net_paid     = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField(blank=True, null=True)
    notes        = models.TextField(blank=True, null=True)

    # #1 — Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-month']

        # #3 — UniqueConstraint (modern Django preferred over unique_together)
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'month'],
                name='unique_employee_salary_per_month'
            )
        ]

        # #9 — Index for fast monthly payroll queries
        indexes = [
            models.Index(fields=['month'], name='salary_month_idx'),
            models.Index(fields=['employee', 'month'], name='salary_employee_month_idx'),
        ]

    def __str__(self):
        return f"{self.employee.employee_name} – {self.month.strftime('%b %Y')} – {self.status}"

    def save(self, *args, **kwargs):
        # #6 — Safe Decimal arithmetic, always consistent
        self.net_paid = (
            Decimal(str(self.base_salary)) +
            Decimal(str(self.bonus)) -
            Decimal(str(self.advance_deduction))
        )
        super().save(*args, **kwargs)