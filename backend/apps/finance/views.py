from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date

from django.db.models import Q, Sum, Count, Max
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.jobcards.models import JobCard, JobCardPayment, JobCardProductUsage
from apps.employees.models import SalaryTransaction, SalaryAdvance
from apps.vendors.models import InvoicePayment


MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def _parse_month(param):
    if param:
        try:
            dt = datetime.strptime(param, '%Y-%m')
            return dt.year, dt.month
        except ValueError:
            return None, None
    today = date.today()
    return today.year, today.month


def _jc_financials(jc):
    # Service prices are GST-inclusive; back-calculate base and GST portion
    total = sum(s.price_at_time for s in jc.job_card_services.all())
    if jc.gst_percent > 0:
        divisor = Decimal('1') + jc.gst_percent / Decimal('100')
        base = (total / divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        gst  = total - base
    else:
        base = total
        gst  = Decimal('0')
    paid = sum(p.amount for p in jc.payments.all())
    return base, gst, total, paid


def _expense_for_period(year, month):
    salary = SalaryTransaction.objects.filter(
        status='paid',
        payment_date__year=year,
        payment_date__month=month,
    ).aggregate(t=Sum('net_paid'))['t'] or Decimal('0')

    advance = SalaryAdvance.objects.filter(
        status__in=['approved', 'deducted'],
        date__year=year,
        date__month=month,
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

    invoice = InvoicePayment.objects.filter(
        payment_date__year=year,
        payment_date__month=month,
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

    return salary + advance + invoice


class FinanceDashboardView(APIView):
    def get(self, request):
        year, month = _parse_month(request.query_params.get('month'))
        if year is None:
            return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        current_year = date.today().year

        # ── Month job cards ──────────────────────────────
        month_jcs = JobCard.objects.filter(
            job_card_date__year=year,
            job_card_date__month=month,
        ).prefetch_related('job_card_services', 'payments')

        tbc_total = tbc_base = tbc_gst = Decimal('0')
        col_total = col_base = col_gst = Decimal('0')

        for jc in month_jcs:
            base, gst, total, paid = _jc_financials(jc)
            outstanding = total - paid

            if total > 0:
                base_r = base / total
                gst_r  = gst  / total
            else:
                base_r = gst_r = Decimal('0')

            if outstanding > 0:
                tbc_total += outstanding
                tbc_base  += (outstanding * base_r).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                tbc_gst   += (outstanding * gst_r ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            if paid > 0:
                col_total += paid
                col_base  += (paid * base_r).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                col_gst   += (paid * gst_r ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        expense_of_month   = _expense_for_period(year, month)
        net_savings        = col_total - expense_of_month
        outstanding_month  = tbc_total

        # ── Yearly income (billed, current year) ─────────
        year_jcs = JobCard.objects.filter(
            job_card_date__year=current_year,
        ).prefetch_related('job_card_services')
        yearly_income = Decimal('0')
        for jc in year_jcs:
            yearly_income += sum(s.price_at_time for s in jc.job_card_services.all())

        # ── Monthly chart (12 months of current year) ────
        monthly_chart = []
        for m in range(1, 13):
            m_jcs = JobCard.objects.filter(
                job_card_date__year=current_year,
                job_card_date__month=m,
            ).prefetch_related('job_card_services', 'payments')

            m_income = m_collected = Decimal('0')
            for jc in m_jcs:
                base, gst, total, paid = _jc_financials(jc)
                m_income    += total
                m_collected += paid

            m_expense = _expense_for_period(current_year, m)
            m_savings = m_collected - m_expense

            monthly_chart.append({
                'month':     MONTH_NAMES[m - 1],
                'month_key': f'{current_year}-{m:02d}',
                'income':    float(m_income),
                'expense':   float(m_expense),
                'savings':   float(m_savings),
            })

        return Response({
            'month': f'{year}-{month:02d}',
            'to_be_collected': {
                'total': str(tbc_total),
                'base':  str(tbc_base),
                'gst':   str(tbc_gst),
            },
            'collected': {
                'total': str(col_total),
                'base':  str(col_base),
                'gst':   str(col_gst),
            },
            'yearly_income':      str(yearly_income),
            'net_savings':        str(net_savings),
            'expense_of_month':   str(expense_of_month),
            'outstanding_of_month': str(outstanding_month),
            'monthly_chart':      monthly_chart,
        })


class FinanceIncomeView(APIView):
    def get(self, request):
        year, month = _parse_month(request.query_params.get('month'))
        if year is None:
            return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        search = request.query_params.get('search', '').strip()

        qs = JobCard.objects.filter(
            job_card_date__year=year,
            job_card_date__month=month,
        ).prefetch_related('job_card_services__service', 'payments').select_related(
            'customer_asset__customer'
        )

        if search:
            qs = qs.filter(
                Q(job_card_number__icontains=search) |
                Q(customer_asset__customer__customer_name__icontains=search) |
                Q(customer_asset__vehicle_number__icontains=search)
            )

        results = []
        for jc in qs.order_by('-job_card_date'):
            base, gst, total, paid = _jc_financials(jc)
            outstanding = total - paid

            if total <= 0:
                pstatus = 'unpaid'
            elif paid >= total:
                pstatus = 'paid'
            elif paid > 0:
                pstatus = 'partial'
            else:
                pstatus = 'unpaid'

            service_names = ', '.join(
                s.service.service_name for s in jc.job_card_services.all()
            )

            results.append({
                'id':             jc.id,
                'date':           jc.job_card_date.isoformat(),
                'job_card_number': jc.job_card_number,
                'customer_name':  jc.customer_asset.customer.customer_name if jc.customer_asset else '',
                'vehicle_number': jc.customer_asset.vehicle_number if jc.customer_asset else '',
                'services':       service_names,
                'base_amount':    str(base),
                'gst_percent':    str(jc.gst_percent),
                'gst_amount':     str(gst),
                'total_amount':   str(total),
                'paid_amount':    str(paid),
                'outstanding':    str(outstanding),
                'payment_status': pstatus,
                'category':       'Job Card',
            })

        return Response(results)


class FinanceExpenseView(APIView):
    def get(self, request):
        year, month = _parse_month(request.query_params.get('month'))
        if year is None:
            return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        category = request.query_params.get('category', '').strip().lower()
        search   = request.query_params.get('search', '').strip().lower()

        results = []

        if not category or category == 'salary':
            for s in SalaryTransaction.objects.filter(
                status='paid',
                payment_date__year=year,
                payment_date__month=month,
            ).select_related('employee').order_by('-payment_date'):
                desc = f"Salary – {s.employee.employee_name} ({s.month.strftime('%b %Y')})"
                if not search or search in desc.lower():
                    results.append({
                        'id':          f'sal-{s.id}',
                        'date':        s.payment_date.isoformat(),
                        'description': desc,
                        'amount':      str(s.net_paid),
                        'category':    'Salary',
                        'reference':   f'{s.employee.employee_code} · {s.month.strftime("%b %Y")}',
                    })

        if not category or category == 'advance':
            for a in SalaryAdvance.objects.filter(
                status__in=['approved', 'deducted'],
                date__year=year,
                date__month=month,
            ).select_related('employee').order_by('-date'):
                desc = f"Advance – {a.employee.employee_name}"
                if not search or search in desc.lower():
                    results.append({
                        'id':          f'adv-{a.id}',
                        'date':        a.date.isoformat(),
                        'description': desc,
                        'amount':      str(a.amount),
                        'category':    'Advance',
                        'reference':   f'{a.employee.employee_code} · {a.date}',
                    })

        if not category or category == 'vendor_invoice':
            for ip in InvoicePayment.objects.filter(
                payment_date__year=year,
                payment_date__month=month,
            ).select_related('invoice__vendor').order_by('-payment_date'):
                desc = f"Invoice – {ip.invoice.invoice_number} ({ip.invoice.vendor.vendor_name})"
                if not search or search in desc.lower():
                    results.append({
                        'id':          f'inv-{ip.id}',
                        'date':        ip.payment_date.isoformat(),
                        'description': desc,
                        'amount':      str(ip.amount),
                        'category':    'Vendor Invoice',
                        'reference':   ip.invoice.invoice_number,
                    })

        results.sort(key=lambda x: x['date'], reverse=True)
        return Response(results)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: cumulative cash expenses BEFORE a given date (for opening balance)
# ─────────────────────────────────────────────────────────────────────────────

def _expense_total_before_date(before_date):
    salary = SalaryTransaction.objects.filter(
        status='paid', payment_date__lt=before_date
    ).aggregate(t=Sum('net_paid'))['t'] or Decimal('0')
    advance = SalaryAdvance.objects.filter(
        status__in=['approved', 'deducted'], date__lt=before_date
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    invoice = InvoicePayment.objects.filter(
        payment_date__lt=before_date
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
    return salary + advance + invoice


# ─────────────────────────────────────────────────────────────────────────────
# Daily Closing Report
# ─────────────────────────────────────────────────────────────────────────────

class DailyReportView(APIView):
    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            report_date = date.today()

        # ── Job cards created on this date ──────────────────────────────
        day_jcs = JobCard.objects.filter(
            job_card_date=report_date,
        ).prefetch_related('job_card_services__service', 'payments').select_related(
            'customer_asset__customer'
        )

        total_billed    = Decimal('0')
        total_collected = Decimal('0')
        service_map     = {}   # service_name -> {jobs, billed, collected}
        pending_sales   = []

        for jc in day_jcs:
            base, gst, total, paid = _jc_financials(jc)
            outstanding = total - paid
            total_billed    += total
            total_collected += paid

            # Service-level revenue + collection split
            for svc in jc.job_card_services.all():
                sname = svc.service.service_name
                if sname not in service_map:
                    service_map[sname] = {
                        'jobs': 0,
                        'billed':    Decimal('0'),
                        'collected': Decimal('0'),
                    }
                service_map[sname]['jobs'] += 1
                service_map[sname]['billed'] += svc.price_at_time
                # Proportional collection
                if total > 0:
                    service_map[sname]['collected'] += (
                        (svc.price_at_time / total) * paid
                    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            if outstanding > 0:
                pending_sales.append({
                    'job_card_number': jc.job_card_number,
                    'customer':  jc.customer_asset.customer.customer_name if jc.customer_asset else '',
                    'vehicle':   jc.customer_asset.vehicle_number if jc.customer_asset else '',
                    'vehicle_type': jc.customer_asset.vehicle_type if jc.customer_asset else '',
                    'services':  ', '.join(
                        s.service.service_name for s in jc.job_card_services.all()
                    ),
                    'total':       str(total),
                    'paid':        str(paid),
                    'outstanding': str(outstanding),
                })

        # ── Payment mode breakdown (payments for job cards opened on report_date) ──
        # Using job_card__job_card_date so the breakdown is consistent with
        # total_collected in the summary (both are based on job cards opened today).
        mode_qs = JobCardPayment.objects.filter(
            job_card__job_card_date=report_date,
        ).values('payment_method').annotate(
            amount=Sum('amount'),
            count=Count('id'),
        ).order_by('-amount')

        payment_breakdown = [
            {
                'method': pm['payment_method'],
                'amount': str(pm['amount'] or Decimal('0')),
                'count':  pm['count'],
            }
            for pm in mode_qs
        ]

        # ── Expenses paid out today ──────────────────────────────────────
        expense_items = []

        for s in SalaryTransaction.objects.filter(
            status='paid', payment_date=report_date
        ).select_related('employee'):
            expense_items.append({
                'description': f'Salary – {s.employee.employee_name}',
                'amount':      str(s.net_paid),
                'category':    'Salary',
            })

        for a in SalaryAdvance.objects.filter(
            status__in=['approved', 'deducted'], date=report_date
        ).select_related('employee'):
            expense_items.append({
                'description': f'Advance – {a.employee.employee_name}',
                'amount':      str(a.amount),
                'category':    'Advance',
            })

        for ip in InvoicePayment.objects.filter(
            payment_date=report_date
        ).select_related('invoice__vendor'):
            expense_items.append({
                'description': f'{ip.invoice.vendor.vendor_name} · {ip.invoice.invoice_number}',
                'amount':      str(ip.amount),
                'category':    'Vendor',
            })

        total_expenses = sum((Decimal(e['amount']) for e in expense_items), Decimal('0'))

        # ── Flow statement (all payment modes) ──────────────────────────
        # Total collected for job cards opened on this date (all modes)
        collected_today = JobCardPayment.objects.filter(
            job_card__job_card_date=report_date,
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

        # Opening balance = all payments received for job cards before this date − all expenses before this date
        collected_before = JobCardPayment.objects.filter(
            job_card__job_card_date__lt=report_date,
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
        exp_before  = _expense_total_before_date(report_date)
        opening_bal = collected_before - exp_before
        closing_bal = opening_bal + collected_today - total_expenses

        # ── Inventory products consumed on this date (most used first) ─────
        usage_qs = (
            JobCardProductUsage.objects
            .filter(job_card_product__job_card_service__job_card__job_card_date=report_date)
            .values(
                'product__product__product_name',
                'product__brand',
                'product__product__product_unit',
            )
            .annotate(
                total_qty=Sum('quantity_used'),
                unit_amount=Max('product__unit_amount'),
            )
            .order_by('-total_qty')[:5]
        )
        product_usage = [
            {
                'product_name': row['product__product__product_name'],
                'brand':        row['product__brand'] or '',
                'unit':         row['product__product__product_unit'],
                'unit_amount':  str(row['unit_amount'] or 1),
                'total_qty':    str(row['total_qty']),
            }
            for row in usage_qs
        ]

        # ── Service revenue list (sorted by billed desc) ─────────────────
        service_revenue = sorted([
            {
                'service_name': k,
                'jobs':         v['jobs'],
                'billed':       str(v['billed'].quantize(Decimal('0.01'))),
                'collected':    str(v['collected'].quantize(Decimal('0.01'))),
                'outstanding':  str((v['billed'] - v['collected']).quantize(Decimal('0.01'))),
            }
            for k, v in service_map.items()
        ], key=lambda x: Decimal(x['billed']), reverse=True)

        return Response({
            'date': report_date.isoformat(),
            'summary': {
                'total_billed':      str(total_billed),
                'total_collected':   str(total_collected),
                'outstanding':       str(total_billed - total_collected),
                'vehicles_serviced': day_jcs.count(),
            },
            'payment_breakdown': payment_breakdown,
            'service_revenue':   service_revenue,
            'pending_sales':     pending_sales,
            'product_usage':  product_usage,
            'cash_expenses': {
                'total': str(total_expenses),
                'items': expense_items,
            },
            'cash_flow': {
                'opening_balance': str(opening_bal.quantize(Decimal('0.01'))),
                'cash_collected':  str(collected_today.quantize(Decimal('0.01'))),
                'cash_expenses':   str(total_expenses.quantize(Decimal('0.01'))),
                'closing_balance': str(closing_bal.quantize(Decimal('0.01'))),
            },
        })
