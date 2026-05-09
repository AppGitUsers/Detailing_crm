import { useEffect, useState } from 'react';
import { Plus, UserCog, Search, Pencil, Trash2 } from 'lucide-react';
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
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employees';
import { extractError } from '../../api/axios';

const TYPE_LABEL = {
  full_time: { label: 'Full-time', variant: 'green' },
  part_time: { label: 'Part-time', variant: 'blue' },
  contractor: { label: 'Contractor', variant: 'purple' },
};

export default function EmployeesList() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listEmployees(search ? { name: search } : undefined);
      setEmployees(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const onDelete = async () => {
    if (!confirmDel) return;
    setDelLoading(true);
    try {
      await deleteEmployee(confirmDel.id);
      toast.success('Employee deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'employee_name', header: 'Name', render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span> },
    {
      key: 'employee_type',
      header: 'Type',
      render: (r) => {
        const t = TYPE_LABEL[r.employee_type] || { label: r.employee_type, variant: 'default' };
        return <Badge variant={t.variant}>{t.label}</Badge>;
      },
    },
    { key: 'employee_phone_number', header: 'Phone' },
    { key: 'employee_email', header: 'Email', render: (r) => r.employee_email || <span className="text-gray-500">—</span> },
    { key: 'joining_date', header: 'Joined' },
    { key: 'salary', header: 'Salary', render: (r) => r.salary ? `₹${Number(r.salary).toLocaleString('en-IN')}` : '—' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setModal({ mode: 'edit', data: r })} className="p-1.5 text-gray-400 hover:text-accent">
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmDel(r)} className="p-1.5 text-gray-400 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage your team"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Employee</Button>}
      />

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search employees by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No employees yet"
          message={search ? 'Try a different search.' : 'Add your first employee.'}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Employee</Button>}
        />
      ) : (
        <Table columns={columns} rows={employees} />
      )}

      <EmployeeFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete ${confirmDel?.employee_name}?`}
        message="This action cannot be undone."
      />
    </div>
  );
}

function EmployeeFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const empty = {
    employee_name: '', employee_phone_number: '', employee_email: '',
    employee_address: '', employee_type: 'full_time', dob: '', joining_date: '', salary: '',
  };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee_name: modal.data.employee_name || '',
        employee_phone_number: modal.data.employee_phone_number || '',
        employee_email: modal.data.employee_email || '',
        employee_address: modal.data.employee_address || '',
        employee_type: modal.data.employee_type || 'full_time',
        dob: modal.data.dob || '',
        joining_date: modal.data.joining_date || '',
        salary: modal.data.salary || '',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
    // eslint-disable-next-line
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee_name.trim()) eMap.employee_name = 'Required';
    if (!form.employee_phone_number.trim()) eMap.employee_phone_number = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        salary: form.salary === '' ? null : Number(form.salary),
        dob: form.dob || null,
        joining_date: form.joining_date || null,
      };
      if (modal.mode === 'edit') {
        await updateEmployee(modal.data.id, payload);
        toast.success('Employee updated');
      } else {
        await createEmployee(payload);
        toast.success('Employee created');
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
      title={modal?.mode === 'edit' ? 'Edit Employee' : 'Add Employee'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name" required error={errors.employee_name}>
          <Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} />
        </Field>
        <Field label="Phone" required error={errors.employee_phone_number}>
          <Input value={form.employee_phone_number} onChange={(e) => setForm({ ...form, employee_phone_number: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.employee_email} onChange={(e) => setForm({ ...form, employee_email: e.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={form.employee_type} onChange={(e) => setForm({ ...form, employee_type: e.target.value })}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contractor">Contractor</option>
          </Select>
        </Field>
        <Field label="Date of Birth">
          <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
        </Field>
        <Field label="Joining Date">
          <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
        </Field>
        <Field label="Salary (₹)">
          <Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="Address">
            <Input value={form.employee_address} onChange={(e) => setForm({ ...form, employee_address: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
