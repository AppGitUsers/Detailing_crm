import { useEffect, useState } from 'react';
import { Plus, CalendarCheck, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  listAttendance, createAttendance, updateAttendance, deleteAttendance,
  listEmployees,
} from '../../api/employees';
import { extractError } from '../../api/axios';

const STATUS_LABEL = {
  present:  { label: 'Present',  variant: 'green'  },
  absent:   { label: 'Absent',   variant: 'red'    },
  half_day: { label: 'Half Day', variant: 'blue'   },
  leave:    { label: 'Leave',    variant: 'purple' },
  late:     { label: 'Late',     variant: 'yellow' },
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

export default function Attendance() {
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
      const [att, emps] = await Promise.all([
        listAttendance({ month, year }),
        listEmployees(),
      ]);
      setRecords(Array.isArray(att) ? att : (att.results || []));
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
      await deleteAttendance(confirmDel.id);
      toast.success('Record deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  // Summary count per status
  const summary = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span> },
    { key: 'date', header: 'Date' },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const s = STATUS_LABEL[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    { key: 'check_in',  header: 'In',    render: (r) => r.check_in  || <span className="text-gray-500">—</span> },
    { key: 'check_out', header: 'Out',   render: (r) => r.check_out || <span className="text-gray-500">—</span> },
    { key: 'notes',     header: 'Notes', render: (r) => r.notes     || <span className="text-gray-500">—</span> },
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
      <PageHeader
        title="Attendance"
        subtitle="Track daily employee attendance"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Mark Attendance</Button>}
      />

      {/* Month navigator */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-100"><ChevronLeft size={18} /></button>
        <span className="text-gray-100 font-medium">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-100"><ChevronRight size={18} /></button>
      </div>

      {/* Summary chips */}
      {records.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {Object.entries(STATUS_LABEL).map(([key, { label, variant }]) =>
            summary[key] ? (
              <div key={key} className="bg-bg-card border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="text-gray-300 text-sm font-medium">{summary[key]}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {loading ? <Loading /> : records.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance records"
          message={`No records for ${MONTHS[month - 1]} ${year}.`}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Mark Attendance</Button>}
        />
      ) : (
        <Table columns={columns} rows={records} />
      )}

      <AttendanceFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} employees={employees} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title="Delete attendance record?"
        message="This action cannot be undone."
      />
    </div>
  );
}

function AttendanceFormModal({ modal, onClose, onSaved, employees }) {
  const toast = useToast();
  const empty = { employee: '', date: '', status: 'present', check_in: '', check_out: '', notes: '' };
  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee:  modal.data.employee  || '',
        date:      modal.data.date      || '',
        status:    modal.data.status    || 'present',
        check_in:  modal.data.check_in  || '',
        check_out: modal.data.check_out || '',
        notes:     modal.data.notes     || '',
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
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        check_in:  form.check_in  || null,
        check_out: form.check_out || null,
        notes:     form.notes     || null,
      };
      if (modal.mode === 'edit') {
        await updateAttendance(modal.data.id, payload);
        toast.success('Attendance updated');
      } else {
        await createAttendance(payload);
        toast.success('Attendance marked');
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
      title={modal?.mode === 'edit' ? 'Edit Attendance' : 'Mark Attendance'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Mark'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Employee" required error={errors.employee}>
          <Select value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date" required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="leave">Leave</option>
            <option value="late">Late</option>
          </Select>
        </Field>
        <div />
        <Field label="Check In">
          <Input type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
        </Field>
        <Field label="Check Out">
          <Input type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
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