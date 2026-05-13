import { useEffect, useState } from 'react';
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listShifts, createShift, updateShift, deleteShift } from '../../api/employees';
import { extractError } from '../../api/axios';

const PRESET_OPTIONS = [
  { value: 'mon_sun', label: 'Mon – Sun (All week)' },
  { value: 'mon_fri', label: 'Mon – Fri (Weekdays)' },
  { value: 'mon_sat', label: 'Mon – Sat' },
  { value: 'sat_sun', label: 'Sat – Sun (Weekends)' },
  { value: 'custom',  label: 'Custom days' },
];

export default function Shifts() {
  const toast = useToast();
  const [loading, setLoading]     = useState(true);
  const [shifts, setShifts]       = useState([]);
  const [modal, setModal]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listShifts();
      setShifts(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async () => {
    setDelLoading(true);
    try {
      await deleteShift(confirmDel.id);
      toast.success('Shift deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'shift_name', header: 'Shift Name', render: (r) => <span className="font-medium text-gray-100">{r.shift_name}</span> },
    { key: 'start_time', header: 'Start' },
    { key: 'end_time',   header: 'End' },
    {
      key: 'working_day_names', header: 'Working Days',
      render: (r) => (
        <span className="text-gray-300 text-xs">
          {Array.isArray(r.working_day_names) ? r.working_day_names.join(', ') : '—'}
        </span>
      ),
    },
    { key: 'description', header: 'Notes', render: (r) => r.description || <span className="text-gray-500">—</span> },
    {
      key: 'actions', header: '',
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
        title="Shifts"
        subtitle="Manage work shifts"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Shift</Button>}
      />
      {loading ? <Loading /> : shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shifts yet"
          message="Create your first shift."
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Shift</Button>}
        />
      ) : (
        <Table columns={columns} rows={shifts} />
      )}
      <ShiftFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete shift "${confirmDel?.shift_name}"?`}
        message="This action cannot be undone."
      />
    </div>
  );
}

function ShiftFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const empty = { shift_name: '', start_time: '', end_time: '', working_days_preset: 'mon_sun', working_days: '', description: '' };
  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        shift_name:          modal.data.shift_name          || '',
        start_time:          modal.data.start_time          || '',
        end_time:            modal.data.end_time            || '',
        working_days_preset: modal.data.working_days_preset || 'mon_sun',
        working_days:        modal.data.working_days        || '',
        description:         modal.data.description         || '',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.shift_name.trim()) eMap.shift_name  = 'Required';
    if (!form.start_time)        eMap.start_time  = 'Required';
    if (!form.end_time)          eMap.end_time    = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      if (modal.mode === 'edit') {
        await updateShift(modal.data.id, form);
        toast.success('Shift updated');
      } else {
        await createShift(form);
        toast.success('Shift created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isCustom = form.working_days_preset === 'custom';

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      size="md"
      title={modal?.mode === 'edit' ? 'Edit Shift' : 'Add Shift'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Shift Name" required error={errors.shift_name}>
            <Input value={form.shift_name} onChange={(e) => setForm({ ...form, shift_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Start Time" required error={errors.start_time}>
          <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        </Field>
        <Field label="End Time" required error={errors.end_time}>
          <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Working Days">
            <Select value={form.working_days_preset} onChange={(e) => setForm({ ...form, working_days_preset: e.target.value })}>
              {PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        {/* Show custom days input only when "custom" is selected */}
        {isCustom && (
          <div className="md:col-span-2">
            <Field label="Custom Days" hint="Comma-separated numbers: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun">
              <Input
                placeholder="e.g. 0,2,4"
                value={form.working_days}
                onChange={(e) => setForm({ ...form, working_days: e.target.value })}
              />
            </Field>
          </div>
        )}
        <div className="md:col-span-2">
          <Field label="Notes">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}