import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Wallet, Pencil, Trash2, ChevronLeft, ChevronRight,
  CheckCircle, Clock, AlertCircle, AlertTriangle, Info, TrendingDown, IndianRupee,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import {
  listEmployees,
  listAdvances, createAdvance, updateAdvance, deleteAdvance,
  listTransactions, createTransaction, updateTransaction, deleteTransaction,
  computeSalary,
} from '../../api/employees';
import { extractError } from '../../api/axios';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const ADVANCE_STATUS = {
  pending:  { label: 'Pending',  variant: 'blue'   },
  approved: { label: 'Approved', variant: 'green'  },
  deducted: { label: 'Deducted', variant: 'purple' },
  rejected: { label: 'Rejected', variant: 'red'    },
};

const PAY_STATUS = {
  pending: { label: 'Pending', variant: 'yellow' },
  paid:    { label: 'Paid',    variant: 'green'  },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Root Tab ──────────────────────────────────────────────────────────────────

export default function SalaryTab() {
  const now   = new Date();

  const [tab, setTab]       = useState('transactions');
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(now.getFullYear());
  const [summary, setSummary]         = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [pendingAdvCount, setPendingAdvCount] = useState(0);
  const [employees, setEmployees]     = useState([]);

  // Fetch employees once on mount — shared by both sub-tabs
  useEffect(() => {
    listEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {});
  }, []);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [txns, approved, pending] = await Promise.all([
        listTransactions({ month, year }),
        listAdvances({ status: 'approved' }),
        listAdvances({ status: 'pending' }),
      ]);
      const records  = Array.isArray(txns)      ? txns      : (txns.results      || []);
      const advApprv = Array.isArray(approved)  ? approved  : (approved.results  || []);
      const advPend  = Array.isArray(pending)   ? pending   : (pending.results   || []);

      setPendingAdvCount(advPend.length);
      setSummary({
        totalSalary:      records.reduce((s, r) => s + Number(r.base_salary || 0), 0),
        totalDeductions:  records.reduce((s, r) => s + Number(r.advance_deduction || 0), 0),
        netPayable:       records.reduce((s, r) => s + Number(r.net_paid || 0), 0),
        paidCount:        records.filter((r) => r.status === 'paid').length,
        totalCount:       records.length,
        approvedAdvTotal: advApprv.reduce((s, a) => s + Number(a.amount || 0), 0),
        approvedAdvCount: advApprv.length,
      });
    } catch {
      // summary failure is non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">
      <PageHeader title="Salary" subtitle="Manage payroll and advance payments" />

      {/* ── Month navigator ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-gray-100 font-semibold w-36 text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-100 transition-colors">
          <ChevronRight size={18} />
        </button>
        <span className="text-xs text-gray-600 ml-1">Showing payroll for this month</span>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────────── */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            {
              icon: IndianRupee,
              iconCls: 'text-blue-400 bg-blue-900/30',
              label: 'Total Salary',
              value: fmt(summary.totalSalary),
              sub: `${summary.totalCount} payment${summary.totalCount !== 1 ? 's' : ''} recorded`,
              highlight: 'text-blue-400',
            },
            {
              icon: TrendingDown,
              iconCls: 'text-red-400 bg-red-900/30',
              label: 'Advance Deductions',
              value: fmt(summary.totalDeductions),
              sub: summary.approvedAdvCount > 0
                ? `${summary.approvedAdvCount} advance${summary.approvedAdvCount > 1 ? 's' : ''} approved — ${fmt(summary.approvedAdvTotal)} to deduct`
                : 'No approved advances',
              highlight: summary.totalDeductions > 0 ? 'text-red-400' : 'text-gray-500',
            },
            {
              icon: Wallet,
              iconCls: 'text-emerald-400 bg-emerald-900/30',
              label: 'Net to Pay',
              value: fmt(summary.netPayable),
              sub: `salary − advances = net`,
              highlight: 'text-emerald-400',
            },
            {
              icon: CheckCircle,
              iconCls: 'text-purple-400 bg-purple-900/30',
              label: 'Paid',
              value: `${summary.paidCount} / ${summary.totalCount}`,
              sub: summary.paidCount === summary.totalCount && summary.totalCount > 0
                ? 'All paid for this month'
                : `${summary.totalCount - summary.paidCount} pending payment`,
              highlight: summary.paidCount === summary.totalCount && summary.totalCount > 0
                ? 'text-emerald-400' : 'text-purple-400',
            },
          ].map(({ icon: Icon, iconCls, label, value, sub, highlight }) => (
            <div key={label} className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`text-xl font-bold leading-none mb-1 ${highlight}`}>{value}</div>
                <div className="text-xs text-gray-500 truncate">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved advances banner */}
      {!summaryLoading && summary?.approvedAdvCount > 0 && (
        <div className="bg-amber-900/15 border border-amber-700/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-300 font-semibold mb-0.5">
              {summary.approvedAdvCount} approved advance{summary.approvedAdvCount > 1 ? 's' : ''} — {fmt(summary.approvedAdvTotal)} to deduct
            </p>
            <p className="text-xs text-amber-400/80">
              These advances are approved and will be <strong>auto-filled</strong> when you create a salary payment for that employee.
              They will be <strong>automatically marked as Deducted</strong> once the payment is saved.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'transactions', label: 'Salary Payments' },
          { key: 'advances',     label: 'Advances', badge: pendingAdvCount },
          { key: 'all',          label: 'All Transactions' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab === t.key ? 'bg-accent/30 text-accent' : 'bg-yellow-500/30 text-yellow-300'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      {tab === 'transactions'
        ? <TransactionsTab month={month} year={year} onDataChange={loadSummary} employees={employees} />
        : tab === 'advances'
          ? <AdvancesTab onDataChange={loadSummary} employees={employees} />
          : <AllTransactionsTab employees={employees} />}
    </div>
  );
}

// ── Salary Payments Tab ───────────────────────────────────────────────────────

function TransactionsTab({ month, year, onDataChange, employees }) {
  const toast = useToast();
  const [loading, setLoading]       = useState(true);
  const [records, setRecords]       = useState([]);
  const [modal, setModal]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const txns = await listTransactions({ month, year });
      setRecords(Array.isArray(txns) ? txns : (txns.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]); // eslint-disable-line

  const onDelete = async () => {
    setDelLoading(true);
    try {
      await deleteTransaction(confirmDel.id);
      toast.success('Payment deleted');
      setConfirmDel(null);
      load();
      onDataChange();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    {
      key: 'employee_name', header: 'Employee',
      render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span>,
    },
    {
      key: 'base_salary', header: 'Salary',
      render: (r) => <span className="text-gray-300">₹{Number(r.base_salary).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'advance_deduction', header: 'Advance (−)',
      render: (r) => Number(r.advance_deduction) > 0
        ? <span className="text-red-400 font-medium">−₹{Number(r.advance_deduction).toLocaleString('en-IN')}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'bonus', header: 'Bonus (+)',
      render: (r) => Number(r.bonus) > 0
        ? <span className="text-emerald-400 font-medium">+₹{Number(r.bonus).toLocaleString('en-IN')}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'net_paid', header: 'Net to Pay',
      render: (r) => {
        const net = Number(r.net_paid);
        return (
          <span className={`font-semibold ${net < 0 ? 'text-red-400' : 'text-gray-100'}`}>
            ₹{net.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const s = PAY_STATUS[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'payment_date', header: 'Paid On',
      render: (r) => r.payment_date
        ? <span className="text-gray-300 text-xs">{r.payment_date}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setModal({ mode: 'edit', data: r })} className="p-1.5 text-gray-400 hover:text-accent transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmDel(r)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Payment</Button>
      </div>

      {/* Salary formula explanation */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="text-blue-400 font-semibold">Salary</span></span>
        <span className="text-gray-600">−</span>
        <span className="flex items-center gap-1.5"><span className="text-red-400 font-semibold">Advance</span></span>
        <span className="text-gray-600">+</span>
        <span className="flex items-center gap-1.5"><span className="text-emerald-400 font-semibold">Bonus</span></span>
        <span className="text-gray-600">=</span>
        <span className="flex items-center gap-1.5 font-semibold text-gray-100">Net to Pay</span>
      </div>

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No salary payments"
          message={`No records for ${MONTHS[month - 1]} ${year}. Add a payment to get started.`}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Payment</Button>}
        />
      ) : (
        <Table columns={columns} rows={records} rowClassName={(r) => r.status === 'paid' ? 'opacity-75' : ''} />
      )}

      <TransactionFormModal
        modal={modal}
        onClose={() => setModal(null)}
        onSaved={() => { load(); onDataChange(); }}
        employees={employees}
        currentMonth={month}
        currentYear={year}
        records={records}
      />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title="Delete salary payment?"
        message="This action cannot be undone."
      />
    </div>
  );
}

// ── Transaction Form Modal ────────────────────────────────────────────────────

function TransactionFormModal({ modal, onClose, onSaved, employees, currentMonth, currentYear, records }) {
  const toast = useToast();

  const buildEmpty = () => ({
    employee: '',
    month: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
    base_salary: '', bonus: '0', advance_deduction: '0',
    status: 'pending', payment_date: '', notes: '',
  });

  const [form, setForm]                   = useState(buildEmpty);
  const [submitting, setSubmitting]       = useState(false);
  const [errors, setErrors]               = useState({});
  const [approvedAdvances, setApprovedAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances]   = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [computeLoading, setComputeLoading]       = useState(false);

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee:          String(modal.data.employee  || ''),
        month:             modal.data.month             || buildEmpty().month,
        base_salary:       modal.data.base_salary       || '',
        bonus:             modal.data.bonus             || '0',
        advance_deduction: modal.data.advance_deduction || '0',
        status:            modal.data.status            || 'pending',
        payment_date:      modal.data.payment_date      || '',
        notes:             modal.data.notes             || '',
      });
      setApprovedAdvances([]);
      setAttendanceSummary(null);
    } else {
      setForm(buildEmpty());
      setApprovedAdvances([]);
      setAttendanceSummary(null);
    }
    setErrors({});
  }, [modal]); // eslint-disable-line

  // Re-compute attendance-based salary whenever employee or month changes (create mode only)
  useEffect(() => {
    if (modal?.mode !== 'create' || !form.employee || !form.month) {
      setAttendanceSummary(null);
      return;
    }
    const parts = form.month.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    setComputeLoading(true);
    computeSalary({ employee: form.employee, month: m, year: y })
      .then((data) => {
        setAttendanceSummary(data);
        setForm((f) => ({ ...f, base_salary: data.computed_salary }));
      })
      .catch(() => {
        setAttendanceSummary(null);
        const emp = employees.find((e) => String(e.id) === String(form.employee));
        if (emp?.salary) setForm((f) => ({ ...f, base_salary: String(emp.salary) }));
      })
      .finally(() => setComputeLoading(false));
  }, [form.employee, form.month, modal?.mode]); // eslint-disable-line

  const handleEmployeeChange = (empId) => {
    if (modal?.mode === 'edit') { setForm((f) => ({ ...f, employee: empId })); return; }
    setForm((f) => ({ ...f, employee: empId, base_salary: '', advance_deduction: '0' }));
    setApprovedAdvances([]);
    setAttendanceSummary(null);
    if (!empId) return;
    setLoadingAdvances(true);
    listAdvances({ employee: empId, status: 'approved' })
      .then((data) => {
        const advs = Array.isArray(data) ? data : (data.results || []);
        setApprovedAdvances(advs);
        const total = advs.reduce((s, a) => s + Number(a.amount), 0);
        setForm((f) => ({ ...f, advance_deduction: String(total) }));
      })
      .catch(() => {})
      .finally(() => setLoadingAdvances(false));
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const base = Number(form.base_salary) || 0;
  const adv  = Number(form.advance_deduction) || 0;
  const bon  = Number(form.bonus) || 0;
  const net  = base + bon - adv;

  const selectedEmp = employees.find((e) => String(e.id) === String(form.employee));

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee)    eMap.employee    = 'Select an employee';
    if (!form.base_salary) eMap.base_salary = 'Required';
    // Duplicate guard — prevent two salary payments for the same employee in the same month
    if (modal?.mode === 'create' && form.employee) {
      const dup = records.find((r) => String(r.employee) === String(form.employee));
      if (dup) eMap.employee = `Salary already recorded for ${MONTHS[currentMonth - 1]} ${currentYear}`;
    }
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        base_salary:       Number(form.base_salary),
        bonus:             Number(form.bonus) || 0,
        advance_deduction: Number(form.advance_deduction) || 0,
        payment_date:      form.payment_date || null,
        notes:             form.notes || null,
      };
      if (modal.mode === 'edit') {
        await updateTransaction(modal.data.id, payload);
        toast.success('Payment updated');
      } else {
        await createTransaction(payload);
        // Auto-mark approved advances as deducted — the salary payment is the deduction record
        if (approvedAdvances.length > 0 && Number(form.advance_deduction) > 0) {
          await Promise.allSettled(
            approvedAdvances.map((a) =>
              updateAdvance(a.id, {
                employee: a.employee,
                date:     a.date,
                amount:   Number(a.amount),
                reason:   a.reason || null,
                status:   'deducted',
              })
            )
          );
        }
        toast.success('Payment added — advances marked as deducted');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      size="lg"
      title={modal?.mode === 'edit' ? 'Edit Salary Payment' : 'Add Salary Payment'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>
            {modal?.mode === 'edit' ? 'Save Changes' : 'Create Payment'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">

        <Field label="Employee" required error={errors.employee}>
          <Select value={form.employee} onChange={(e) => handleEmployeeChange(e.target.value)}>
            <option value="">Select an employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_name}
                {emp.salary ? ` — ₹${Number(emp.salary).toLocaleString('en-IN')}/mo` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Month">
          <Input
            type="month"
            value={form.month?.slice(0, 7)}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value + '-01' }))}
          />
        </Field>

        {/* Salary breakdown — the key formula */}
        <div className="bg-bg-elev rounded-xl p-4 space-y-3 border border-border">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Salary Calculation</p>

          {/* Attendance summary — shown in create mode when employee + month are selected */}
          {modal?.mode === 'create' && form.employee && (
            computeLoading ? (
              <div className="rounded-lg px-4 py-2.5 bg-bg-card border border-border text-xs text-gray-500">
                Computing from attendance…
              </div>
            ) : attendanceSummary ? (
              <div className={`rounded-lg px-4 py-3 border text-xs space-y-1.5 ${
                attendanceSummary.no_shift
                  ? 'bg-yellow-900/10 border-yellow-700/30'
                  : 'bg-blue-900/10 border-blue-700/30'
              }`}>
                {attendanceSummary.no_shift ? (
                  <p className="text-yellow-400 font-medium">No shift assigned — using profile salary as base</p>
                ) : (
                  <>
                    <p className="text-blue-300 font-semibold">Attendance-based calculation</p>
                    <div className="grid grid-cols-3 gap-x-4 text-gray-400">
                      <div><span className="text-gray-500">Expected</span><br /><span className="font-medium text-gray-200">{attendanceSummary.expected_hours}h</span></div>
                      <div><span className="text-gray-500">Worked</span><br /><span className="font-medium text-gray-200">{attendanceSummary.actual_hours}h</span></div>
                      <div><span className="text-gray-500">Overtime</span><br /><span className={`font-medium ${attendanceSummary.overtime_hours > 0 ? 'text-emerald-400' : 'text-gray-200'}`}>{attendanceSummary.overtime_hours}h</span></div>
                    </div>
                    <p className="text-gray-500">
                      ({attendanceSummary.actual_hours}h ÷ {attendanceSummary.expected_hours}h) × ₹{Number(attendanceSummary.base_salary).toLocaleString('en-IN')}
                      {' = '}
                      <span className="text-blue-300 font-semibold">₹{Number(attendanceSummary.computed_salary).toLocaleString('en-IN')}</span>
                      <span className="ml-1 text-gray-600">(editable below)</span>
                    </p>
                  </>
                )}
              </div>
            ) : null
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Base Salary (₹)"
              required
              error={errors.base_salary}
              hint={
                modal?.mode !== 'edit' && computeLoading ? 'Computing…'
                : modal?.mode !== 'edit' && attendanceSummary && !attendanceSummary.no_shift ? 'Auto-filled from attendance'
                : modal?.mode !== 'edit' && selectedEmp?.salary ? 'Auto-filled from profile'
                : undefined
              }
            >
              <Input type="number" step="0.01" min="0" placeholder="e.g. 15000" value={form.base_salary} onChange={set('base_salary')} />
            </Field>

            <Field
              label="Advance Deduction (−₹)"
              hint={
                loadingAdvances ? 'Loading advances…'
                : approvedAdvances.length > 0 ? 'Auto-filled from approved advances'
                : modal?.mode !== 'edit' && form.employee ? 'No approved advances'
                : undefined
              }
            >
              <Input
                type="number" step="0.01" min="0" placeholder="0"
                value={form.advance_deduction}
                onChange={set('advance_deduction')}
                disabled={loadingAdvances}
              />
            </Field>

            <Field label="Bonus (+₹)">
              <Input type="number" step="0.01" min="0" placeholder="0" value={form.bonus} onChange={set('bonus')} />
            </Field>
          </div>

          {/* Net payable box */}
          <div className={`rounded-lg px-4 py-3 flex items-center justify-between border ${
            net < 0  ? 'border-red-700/40 bg-red-900/20'
            : net === 0 ? 'border-yellow-700/40 bg-yellow-900/20'
            : 'border-emerald-700/40 bg-emerald-900/20'
          }`}>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Net to Pay</div>
              <div className={`text-xl font-bold ${net < 0 ? 'text-red-300' : net === 0 ? 'text-yellow-300' : 'text-emerald-300'}`}>
                ₹{net.toLocaleString('en-IN')}
              </div>
            </div>
            {base > 0 && (
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <div className="text-blue-400">Salary: ₹{base.toLocaleString('en-IN')}</div>
                {adv > 0 && <div className="text-red-400">Advance: −₹{adv.toLocaleString('en-IN')}</div>}
                {bon > 0 && <div className="text-emerald-400">Bonus: +₹{bon.toLocaleString('en-IN')}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Approved advances breakdown */}
        {approvedAdvances.length > 0 && (
          <div className="bg-amber-900/10 border border-amber-700/30 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Info size={12} /> Approved advances auto-filled — will be marked Deducted automatically when you save
            </p>
            {approvedAdvances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs text-gray-400">
                <span>{a.date}</span>
                <span className="font-medium text-amber-300">₹{Number(a.amount).toLocaleString('en-IN')}</span>
                {a.reason && <span className="text-gray-600 truncate max-w-[120px]">{a.reason}</span>}
              </div>
            ))}
          </div>
        )}

        {net < 0 && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-300 mb-0.5">Advance exceeds salary</p>
              <p className="text-xs text-red-400/80">
                Deducting ₹{adv.toLocaleString('en-IN')} from ₹{base.toLocaleString('en-IN')} is negative.
                Reduce deduction and carry ₹{Math.abs(net).toLocaleString('en-IN')} to next month.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Payment Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="pending">Pending — not yet paid</option>
              <option value="paid">Paid — salary disbursed</option>
            </Select>
          </Field>
          <Field label="Payment Date" hint={form.status === 'paid' ? 'Set when marking as Paid' : undefined}>
            <Input type="date" value={form.payment_date} onChange={set('payment_date')} />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <Input placeholder="Any remarks…" value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

// ── Advances Tab ──────────────────────────────────────────────────────────────

function AdvancesTab({ onDataChange, employees }) {
  const toast = useToast();
  const [loading, setLoading]           = useState(true);
  const [records, setRecords]           = useState([]);
  const [modal, setModal]               = useState(null);
  const [confirmDel, setConfirmDel]     = useState(null);
  const [delLoading, setDelLoading]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const advs = await listAdvances(filterStatus ? { status: filterStatus } : undefined);
      setRecords(Array.isArray(advs) ? advs : (advs.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus]); // eslint-disable-line

  const onDelete = async () => {
    setDelLoading(true);
    try {
      await deleteAdvance(confirmDel.id);
      toast.success('Advance deleted');
      setConfirmDel(null);
      load();
      onDataChange();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const quickUpdate = async (adv, newStatus) => {
    try {
      await updateAdvance(adv.id, {
        employee: adv.employee,
        date:     adv.date,
        amount:   Number(adv.amount),
        reason:   adv.reason || null,
        status:   newStatus,
      });
      const msgs = { approved: 'Advance approved', rejected: 'Advance rejected' };
      toast.success(msgs[newStatus] || 'Updated');
      load();
      onDataChange();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const pendingCount    = records.filter((r) => r.status === 'pending').length;
  const approvedBalance = records.filter((r) => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0);
  const pendingBalance  = records.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
  const totalDeducted   = records.filter((r) => r.status === 'deducted').reduce((s, r) => s + Number(r.amount), 0);

  const columns = [
    {
      key: 'employee_name', header: 'Employee',
      render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span>,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span className="font-semibold text-yellow-300">₹{Number(r.amount).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'reason', header: 'Reason',
      render: (r) => r.reason
        ? <span className="text-gray-400 text-xs">{r.reason}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const s = ADVANCE_STATUS[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {r.status === 'pending' && (
            <>
              <button
                onClick={() => quickUpdate(r, 'approved')}
                className="px-2 py-1 rounded text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 hover:bg-emerald-900/50 transition-colors"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => quickUpdate(r, 'rejected')}
                className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400 border border-red-700/40 hover:bg-red-900/50 transition-colors"
              >
                ✗ Reject
              </button>
            </>
          )}
          <button onClick={() => setModal({ mode: 'edit', data: r })} className="p-1.5 text-gray-400 hover:text-accent transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmDel(r)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Advance lifecycle explanation */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-xs text-gray-400">
        <span className="text-blue-400 font-semibold">Pending</span>
        <span className="text-gray-600">→ approve →</span>
        <span className="text-emerald-400 font-semibold">Approved</span>
        <span className="text-gray-500 italic">(money given to employee)</span>
        <span className="text-gray-600">→ create salary payment →</span>
        <span className="text-purple-400 font-semibold">Deducted</span>
        <span className="text-gray-500 italic">(auto, when salary is saved)</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          {['', 'pending', 'approved', 'deducted', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                filterStatus === s
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-elev text-gray-400 border-border hover:text-gray-100'
              }`}
            >
              {s === '' ? 'All' : ADVANCE_STATUS[s]?.label || s}
              {s === 'pending' && pendingCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filterStatus === 'pending' ? 'bg-white/20' : 'bg-yellow-500/30 text-yellow-300'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Advance</Button>
      </div>

      {!loading && pendingCount > 0 && !filterStatus && (
        <div className="bg-yellow-900/15 border border-yellow-700/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <AlertCircle size={15} className="text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-300">
            <span className="font-semibold">{pendingCount} advance{pendingCount > 1 ? 's' : ''}</span> waiting for approval.
          </p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <Clock size={16} className="text-blue-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-sm font-semibold text-blue-400">₹{pendingBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-bg-card border border-amber-700/30 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Approved — to deduct</div>
              <div className="text-sm font-semibold text-amber-400">₹{approvedBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <CheckCircle size={16} className="text-purple-400 shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Deducted from salary</div>
              <div className="text-sm font-semibold text-purple-400">₹{totalDeducted.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No advance records"
          message={filterStatus ? `No ${ADVANCE_STATUS[filterStatus]?.label.toLowerCase()} advances found.` : 'No salary advance records yet.'}
          action={!filterStatus && <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Advance</Button>}
        />
      ) : (
        <Table columns={columns} rows={records} />
      )}

      <AdvanceFormModal modal={modal} onClose={() => setModal(null)} onSaved={() => { load(); onDataChange(); }} employees={employees} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title="Delete advance record?"
        message="This action cannot be undone."
      />
    </div>
  );
}

// ── All Transactions Tab ──────────────────────────────────────────────────────

function AllTransactionsTab({ employees }) {
  const toast = useToast();
  const [loading, setLoading]     = useState(true);
  const [salaries, setSalaries]   = useState([]);
  const [advances, setAdvances]   = useState([]);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [txns, advs] = await Promise.all([listTransactions(), listAdvances()]);
      setSalaries(Array.isArray(txns) ? txns : (txns.results || []));
      setAdvances(Array.isArray(advs) ? advs : (advs.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const salaryRows = salaries.map((r) => ({
    id:                `salary-${r.id}`,
    _type:             'salary',
    employee_name:     r.employee_name,
    employee:          r.employee,
    date:              r.month || '',
    payment_date:      r.payment_date || '',
    base_salary:       Number(r.base_salary || 0),
    advance_deduction: Number(r.advance_deduction || 0),
    bonus:             Number(r.bonus || 0),
    net_paid:          Number(r.net_paid || 0),
    status:            r.status,
    notes:             r.notes || '',
    reason:            '',
    amount:            0,
  }));

  const advanceRows = advances.map((a) => ({
    id:                `advance-${a.id}`,
    _type:             'advance',
    employee_name:     a.employee_name,
    employee:          a.employee,
    date:              a.date || '',
    payment_date:      '',
    base_salary:       0,
    advance_deduction: 0,
    bonus:             0,
    net_paid:          0,
    status:            a.status,
    notes:             '',
    reason:            a.reason || '',
    amount:            Number(a.amount || 0),
  }));

  let merged = [...salaryRows, ...advanceRows];
  if (filterEmp)  merged = merged.filter((r) => String(r.employee) === String(filterEmp));
  if (filterType) merged = merged.filter((r) => r._type === filterType);
  merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const fmtMonth = (dateStr) => {
    if (!dateStr) return '—';
    const m = Number(dateStr.slice(5, 7));
    return `${MONTHS[m - 1] || ''} ${dateStr.slice(0, 4)}`;
  };

  const totalSalaryPaid   = salaryRows.reduce((s, r) => s + (r.status === 'paid' ? r.net_paid : 0), 0);
  const totalAdvanceGiven = advanceRows
    .filter((r) => r.status === 'approved' || r.status === 'deducted')
    .reduce((s, r) => s + r.amount, 0);

  const columns = [
    {
      key: '_type', header: 'Type',
      render: (r) => r._type === 'salary'
        ? <Badge variant="blue">Salary</Badge>
        : <Badge variant="yellow">Advance</Badge>,
    },
    {
      key: 'employee_name', header: 'Employee',
      render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span>,
    },
    {
      key: 'date', header: 'Date',
      render: (r) => r._type === 'salary'
        ? (
          <div>
            <div className="text-gray-300 text-sm">{fmtMonth(r.date)}</div>
            {r.payment_date && <div className="text-gray-500 text-xs">Paid: {r.payment_date}</div>}
          </div>
        )
        : <span className="text-gray-300 text-sm">{r.date || '—'}</span>,
    },
    {
      key: 'base_salary', header: 'Base Salary',
      render: (r) => r._type === 'salary'
        ? <span className="text-blue-400 font-medium">₹{r.base_salary.toLocaleString('en-IN')}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'advance_deduction', header: 'Advance (−)',
      render: (r) => {
        if (r._type === 'salary') {
          return r.advance_deduction > 0
            ? <span className="text-red-400 font-medium">−₹{r.advance_deduction.toLocaleString('en-IN')}</span>
            : <span className="text-gray-600">—</span>;
        }
        return <span className="font-semibold text-yellow-300">₹{r.amount.toLocaleString('en-IN')}</span>;
      },
    },
    {
      key: 'bonus', header: 'Bonus (+)',
      render: (r) => r._type === 'salary' && r.bonus > 0
        ? <span className="text-emerald-400 font-medium">+₹{r.bonus.toLocaleString('en-IN')}</span>
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'net_paid', header: 'Net Paid',
      render: (r) => r._type === 'salary'
        ? (
          <span className={`font-semibold ${r.net_paid < 0 ? 'text-red-400' : 'text-gray-100'}`}>
            ₹{r.net_paid.toLocaleString('en-IN')}
          </span>
        )
        : <span className="text-gray-600">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        if (r._type === 'salary') {
          const s = PAY_STATUS[r.status] || { label: r.status, variant: 'default' };
          return <Badge variant={s.variant}>{s.label}</Badge>;
        }
        const s = ADVANCE_STATUS[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'notes', header: 'Notes / Reason',
      render: (r) => {
        const text = r._type === 'salary' ? r.notes : r.reason;
        return text
          ? <span className="text-gray-400 text-xs">{text}</span>
          : <span className="text-gray-600">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {!loading && (salaries.length > 0 || advances.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Salary Payments</div>
            <div className="text-lg font-bold text-blue-400">{salaries.length}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Total Paid Out</div>
            <div className="text-lg font-bold text-emerald-400">₹{totalSalaryPaid.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Advance Records</div>
            <div className="text-lg font-bold text-yellow-400">{advances.length}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Total Advanced</div>
            <div className="text-lg font-bold text-amber-400">₹{totalAdvanceGiven.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '',        label: 'All Types' },
            { value: 'salary',  label: 'Salary Payments' },
            { value: 'advance', label: 'Advances' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterType === value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-elev text-gray-400 border-border hover:text-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-56">
          <Select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
            ))}
          </Select>
        </div>
      </div>

      {!loading && merged.length > 0 && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>{merged.length} record{merged.length !== 1 ? 's' : ''}</span>
          {!filterType && (
            <>
              <span>·</span>
              <span className="text-blue-400">{merged.filter((r) => r._type === 'salary').length} salary</span>
              <span>·</span>
              <span className="text-yellow-400">{merged.filter((r) => r._type === 'advance').length} advances</span>
            </>
          )}
          {(filterEmp || filterType) && (
            <button onClick={() => { setFilterEmp(''); setFilterType(''); }} className="ml-1 text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : merged.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No transactions"
          message={filterType || filterEmp ? 'No records match the selected filters.' : 'No salary payments or advance records yet.'}
        />
      ) : (
        <Table
          columns={columns}
          rows={merged}
          rowClassName={(r) => r._type === 'salary' ? 'bg-blue-900/5' : 'bg-yellow-900/5'}
        />
      )}
    </div>
  );
}

// ── Advance Form Modal ────────────────────────────────────────────────────────

function AdvanceFormModal({ modal, onClose, onSaved, employees }) {
  const toast  = useToast();
  const today  = todayStr();
  const empty  = { employee: '', date: today, amount: '', reason: '', status: 'pending' };

  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee: String(modal.data.employee || ''),
        date:     modal.data.date   || today,
        amount:   modal.data.amount || '',
        reason:   modal.data.reason || '',
        status:   modal.data.status || 'pending',
      });
    } else {
      setForm({ ...empty, date: today });
    }
    setErrors({});
  }, [modal]); // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectedEmp = employees.find((e) => String(e.id) === String(form.employee));

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee) eMap.employee = 'Select an employee';
    if (!form.date)     eMap.date     = 'Required';
    if (!form.amount)   eMap.amount   = 'Required';
    if (Number(form.amount) <= 0) eMap.amount = 'Amount must be greater than 0';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = { ...form, amount: Number(form.amount), reason: form.reason || null };
      if (modal.mode === 'edit') {
        await updateAdvance(modal.data.id, payload);
        toast.success('Advance updated');
      } else {
        await createAdvance(payload);
        toast.success('Advance request added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      size="sm"
      title={modal?.mode === 'edit' ? 'Edit Advance' : 'Add Salary Advance'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>
            {modal?.mode === 'edit' ? 'Save Changes' : 'Add Advance'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Employee" required error={errors.employee}>
          <Select value={form.employee} onChange={set('employee')}>
            <option value="">Select an employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_name}
                {emp.salary ? ` — ₹${Number(emp.salary).toLocaleString('en-IN')}/mo` : ''}
              </option>
            ))}
          </Select>
          {selectedEmp?.salary && (
            <span className="block text-xs text-gray-500 mt-1">
              Fixed salary: ₹{Number(selectedEmp.salary).toLocaleString('en-IN')}/month
            </span>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required error={errors.date} hint="Defaults to today">
            <Input type="date" value={form.date} max={today} onChange={set('date')} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount}>
            <Input type="number" step="0.01" min="0.01" placeholder="e.g. 2000" value={form.amount} onChange={set('amount')} />
          </Field>
        </div>

        {selectedEmp?.salary && Number(form.amount) > Number(selectedEmp.salary) && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300">
              Advance exceeds monthly salary of ₹{Number(selectedEmp.salary).toLocaleString('en-IN')}.
            </span>
          </div>
        )}

        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <option value="pending">Pending — awaiting approval</option>
            <option value="approved">Approved — amount given to employee</option>
            <option value="deducted">Deducted — already deducted from salary</option>
            <option value="rejected">Rejected — request denied</option>
          </Select>
        </Field>

        <Field label="Reason (optional)">
          <Input placeholder="Why is this advance needed?" value={form.reason} onChange={set('reason')} />
        </Field>
      </form>
    </Modal>
  );
}
