import { useEffect, useState } from 'react';
import { Plus, Wallet, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  pending: { label: 'Pending', variant: 'blue'  },
  paid:    { label: 'Paid',    variant: 'green' },
};

export default function Salary() {
  const [tab, setTab] = useState('transactions');

  return (
    <div>
      <PageHeader title="Salary" subtitle="Manage salary payments and advances" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[{ key: 'transactions', label: 'Payments' }, { key: 'advances', label: 'Advances' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <TransactionsTab /> : <AdvancesTab />}
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

function TransactionsTab() {
  const toast = useToast();
  const now   = new Date();
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [loading, setLoading]   = useState(true);
  const [records, setRecords]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [txns, emps] = await Promise.all([
        listTransactions({ month, year }),
        listEmployees(),
      ]);
      setRecords(Array.isArray(txns) ? txns : (txns.results || []));
      setEmployees(Array.isArray(emps) ? emps : (emps.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const onDelete = async () => {
    setDelLoading(true);
    try {
      await deleteTransaction(confirmDel.id);
      toast.success('Payment deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  // Total pending amount for this month
  const totalPending = records
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.net_paid), 0);

  const columns = [
    { key: 'employee_name',     header: 'Employee',   render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span> },
    { key: 'base_salary',       header: 'Base (₹)',   render: (r) => `₹${Number(r.base_salary).toLocaleString('en-IN')}` },
    { key: 'advance_deduction', header: 'Advance (-)', render: (r) => r.advance_deduction > 0 ? <span className="text-red-400">-₹{Number(r.advance_deduction).toLocaleString('en-IN')}</span> : '—' },
    { key: 'bonus',             header: 'Bonus (+)',  render: (r) => r.bonus > 0 ? <span className="text-green-400">+₹{Number(r.bonus).toLocaleString('en-IN')}</span> : '—' },
    { key: 'net_paid',          header: 'Net (₹)',    render: (r) => <span className="font-semibold text-gray-100">₹{Number(r.net_paid).toLocaleString('en-IN')}</span> },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const s = PAY_STATUS[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    { key: 'payment_date', header: 'Paid On', render: (r) => r.payment_date || <span className="text-gray-500">—</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setModal({ mode: 'edit', data: r })} className="p-1.5 text-gray-400 hover:text-accent"><Pencil size={14} /></button>
          <button onClick={() => setConfirmDel(r)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-100"><ChevronLeft size={16} /></button>
          <span className="text-gray-100 font-medium text-sm w-32 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-100"><ChevronRight size={16} /></button>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Payment</Button>
      </div>

      {/* Pending total banner */}
      {totalPending > 0 && (
        <div className="bg-bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total pending for {MONTHS[month - 1]}</span>
          <span className="text-yellow-400 font-semibold">₹{totalPending.toLocaleString('en-IN')}</span>
        </div>
      )}

      {loading ? <Loading /> : records.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments"
          message={`No salary records for ${MONTHS[month - 1]} ${year}.`}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Payment</Button>}
        />
      ) : (
        <Table columns={columns} rows={records} />
      )}

      <TransactionFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} employees={employees} currentMonth={month} currentYear={year} />
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

function TransactionFormModal({ modal, onClose, onSaved, employees, currentMonth, currentYear }) {
  const toast = useToast();
  const empty = {
    employee: '', month: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
    base_salary: '', bonus: '0', advance_deduction: '0',
    status: 'pending', payment_date: '', notes: '',
  };
  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee:          modal.data.employee          || '',
        month:             modal.data.month             || empty.month,
        base_salary:       modal.data.base_salary       || '',
        bonus:             modal.data.bonus             || '0',
        advance_deduction: modal.data.advance_deduction || '0',
        status:            modal.data.status            || 'pending',
        payment_date:      modal.data.payment_date      || '',
        notes:             modal.data.notes             || '',
      });
    } else {
      setForm({ ...empty, month: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01` });
    }
    setErrors({});
  }, [modal]);

  // Live net_paid preview
  const base = Number(form.base_salary) || 0;
  const adv  = Number(form.advance_deduction) || 0;
  const bon  = Number(form.bonus) || 0;
  const net  = base + bon - adv;

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee)    eMap.employee    = 'Required';
    if (!form.base_salary) eMap.base_salary = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        base_salary:       Number(form.base_salary),
        bonus:             Number(form.bonus) || 0,
        advance_deduction: Number(form.advance_deduction) || 0,
        net_paid:          net,
        payment_date:      form.payment_date || null,
        notes:             form.notes || null,
      };
      if (modal.mode === 'edit') {
        await updateTransaction(modal.data.id, payload);
        toast.success('Payment updated');
      } else {
        await createTransaction(payload);
        toast.success('Payment added');
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
      title={modal?.mode === 'edit' ? 'Edit Payment' : 'Add Salary Payment'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Employee" required error={errors.employee}>
            <Select value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Month">
            <Input type="month" value={form.month?.slice(0, 7)} onChange={(e) => setForm({ ...form, month: e.target.value + '-01' })} />
          </Field>
        </div>
        <Field label="Base Salary (₹)" required error={errors.base_salary}>
          <Input type="number" step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
        </Field>
        <Field label="Bonus (₹)">
          <Input type="number" step="0.01" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
        </Field>
        <Field label="Advance Deduction (₹)">
          <Input type="number" step="0.01" value={form.advance_deduction} onChange={(e) => setForm({ ...form, advance_deduction: e.target.value })} />
        </Field>
        <Field label="Net Payable (₹)">
          <div className={`px-3 py-2 rounded-lg border border-border text-sm font-semibold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ₹{net.toLocaleString('en-IN')}
          </div>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
        <Field label="Payment Date">
          <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

// ── Advances Tab ──────────────────────────────────────────────────────────────

function AdvancesTab() {
  const toast = useToast();
  const [loading, setLoading]   = useState(true);
  const [records, setRecords]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [advs, emps] = await Promise.all([
        listAdvances(filterStatus ? { status: filterStatus } : undefined),
        listEmployees(),
      ]);
      setRecords(Array.isArray(advs) ? advs : (advs.results || []));
      setEmployees(Array.isArray(emps) ? emps : (emps.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const onDelete = async () => {
    setDelLoading(true);
    try {
      await deleteAdvance(confirmDel.id);
      toast.success('Advance deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  // Total approved advances not yet deducted = pending balance
  const pendingBalance = records
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span> },
    { key: 'date',   header: 'Date' },
    { key: 'amount', header: 'Amount', render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}` },
    { key: 'reason', header: 'Reason', render: (r) => r.reason || <span className="text-gray-500">—</span> },
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
        <div className="flex justify-end gap-1">
          <button onClick={() => setModal({ mode: 'edit', data: r })} className="p-1.5 text-gray-400 hover:text-accent"><Pencil size={14} /></button>
          <button onClick={() => setConfirmDel(r)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="deducted">Deducted</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Advance</Button>
      </div>

      {/* Pending balance banner */}
      {pendingBalance > 0 && (
        <div className="bg-bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total approved advances (yet to be deducted)</span>
          <span className="text-yellow-400 font-semibold">₹{pendingBalance.toLocaleString('en-IN')}</span>
        </div>
      )}

      {loading ? <Loading /> : records.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No advances"
          message="No salary advance records found."
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Advance</Button>}
        />
      ) : (
        <Table columns={columns} rows={records} />
      )}

      <AdvanceFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} employees={employees} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title="Delete advance?"
        message="This action cannot be undone."
      />
    </div>
  );
}

function AdvanceFormModal({ modal, onClose, onSaved, employees }) {
  const toast = useToast();
  const empty = { employee: '', date: '', amount: '', reason: '', status: 'pending' };
  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee: modal.data.employee || '',
        date:     modal.data.date     || '',
        amount:   modal.data.amount   || '',
        reason:   modal.data.reason   || '',
        status:   modal.data.status   || 'pending',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee) eMap.employee = 'Required';
    if (!form.date)     eMap.date     = 'Required';
    if (!form.amount)   eMap.amount   = 'Required';
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
        toast.success('Advance added');
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
      size="md"
      title={modal?.mode === 'edit' ? 'Edit Advance' : 'Add Salary Advance'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Employee" required error={errors.employee}>
            <Select value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.employee_name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Date" required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Amount (₹)" required error={errors.amount}>
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="deducted">Deducted</option>
            <option value="rejected">Rejected</option>
          </Select>
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="Reason">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}