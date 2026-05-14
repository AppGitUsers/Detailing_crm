import { useEffect, useState } from 'react';
import { Plus, CalendarCheck, Pencil, Trash2, ChevronLeft, ChevronRight, UserCheck, UserX, Clock, CalendarDays, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
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

const STATUS_ROW_CLASS = {
  present:  'hover:bg-emerald-900/10',
  absent:   'hover:bg-red-900/10',
  half_day: 'hover:bg-blue-900/10',
  leave:    'hover:bg-purple-900/10',
  late:     'hover:bg-yellow-900/10',
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AttendanceTab() {
  const toast = useToast();
  const now   = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [loading, setLoading]       = useState(true);
  const [records, setRecords]       = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [filterEmp, setFilterEmp]   = useState('');
  const [modal, setModal]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const today = todayStr();

  // Fetch employees once on mount — not re-fetched when month/filter changes
  useEffect(() => {
    listEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (filterEmp) params.employee = filterEmp;
      const att = await listAttendance(params);
      setRecords(Array.isArray(att) ? att : (att.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year, filterEmp]); // eslint-disable-line

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToToday = () => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); };

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

  // Employees who don't have any attendance record for today (only relevant on current month view)
  const markedTodayEmpIds = new Set(
    records.filter((r) => r.date === today).map((r) => String(r.employee))
  );
  const unmarkedToday = isCurrentMonth && !loading
    ? employees.filter((e) => !markedTodayEmpIds.has(String(e.id)))
    : [];

  const markAllPresent = async () => {
    setMarkingAll(true);
    try {
      await Promise.all(
        unmarkedToday.map((emp) =>
          createAttendance({ employee: emp.id, date: today, status: 'present', notes: null, check_in: null, check_out: null })
        )
      );
      toast.success(`Marked ${unmarkedToday.length} employee${unmarkedToday.length > 1 ? 's' : ''} as present`);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const counts       = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const presentCount = counts.present  || 0;
  const absentCount  = counts.absent   || 0;
  const lateCount    = counts.late     || 0;
  const leaveCount   = (counts.leave || 0) + (counts.half_day || 0);

  const columns = [
    {
      key: 'employee_name', header: 'Employee',
      render: (r) => <span className="font-medium text-gray-100">{r.employee_name}</span>,
    },
    {
      key: 'date', header: 'Date',
      render: (r) => <span className="text-gray-300 text-sm">{formatDate(r.date)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        const s = STATUS_LABEL[r.status] || { label: r.status, variant: 'default' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'notes', header: 'Notes',
      render: (r) => r.notes
        ? <span className="text-gray-400 text-xs">{r.notes}</span>
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
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Track daily employee attendance"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Mark Attendance</Button>}
      />

      {/* Month navigator + employee filter */}
      <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-100 font-semibold w-36 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-100 transition-colors">
            <ChevronRight size={18} />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors"
            >
              <CalendarDays size={11} /> Today
            </button>
          )}
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

      {/* Summary stat cards */}
      {!loading && records.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={UserCheck}     label="Present"       value={presentCount} accent="green"  />
          <StatCard icon={UserX}         label="Absent"        value={absentCount}  accent="red"    />
          <StatCard icon={Clock}         label="Late"          value={lateCount}    accent="yellow" />
          <StatCard icon={CalendarCheck} label="Leave / Half"  value={leaveCount}   accent="blue"   />
        </div>
      )}

      {/* Unmarked today banner — shows which employees haven't been marked yet */}
      {isCurrentMonth && !loading && unmarkedToday.length > 0 && (
        <div className="bg-yellow-900/15 border border-yellow-700/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-300 mb-1.5">
              {unmarkedToday.length} employee{unmarkedToday.length > 1 ? 's' : ''} not marked for today
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {unmarkedToday.map((emp) => (
                <span key={emp.id} className="px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 text-xs border border-yellow-700/30">
                  {emp.employee_name}
                </span>
              ))}
            </div>
            <button
              onClick={markAllPresent}
              disabled={markingAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              {markingAll ? 'Marking…' : `Mark All Present (${unmarkedToday.length})`}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance records"
          message={`No records for ${MONTHS[month - 1]} ${year}${filterEmp ? ' — try All employees' : ''}.`}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Mark Attendance</Button>}
        />
      ) : (
        <Table
          columns={columns}
          rows={records}
          rowClassName={(r) => STATUS_ROW_CLASS[r.status] || ''}
        />
      )}

      <AttendanceFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} employees={employees} records={records} />
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

function AttendanceFormModal({ modal, onClose, onSaved, employees, records }) {
  const toast  = useToast();
  const today  = todayStr();
  const empty  = { employee: '', date: today, status: 'present', notes: '' };

  const [form, setForm]             = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        employee: modal.data.employee || '',
        date:     modal.data.date     || today,
        status:   modal.data.status   || 'present',
        notes:    modal.data.notes    || '',
      });
    } else {
      setForm({ ...empty, date: today });
    }
    setErrors({});
  }, [modal]); // eslint-disable-line

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.employee) eMap.employee = 'Select an employee';
    if (!form.date)     eMap.date     = 'Required';
    // Duplicate guard — prevent marking same employee twice on the same date
    if (modal?.mode === 'create' && form.employee && form.date) {
      const dup = records.find((r) => String(r.employee) === String(form.employee) && r.date === form.date);
      if (dup) eMap.employee = `Already marked as ${STATUS_LABEL[dup.status]?.label || dup.status} on this date`;
    }
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        employee: form.employee,
        date:     form.date,
        status:   form.status,
        notes:    form.notes || null,
        check_in:  null,
        check_out: null,
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

  const statusMeta = {
    present:  { hint: 'Employee was present for the full day', color: 'text-emerald-400' },
    absent:   { hint: 'Employee did not come in',              color: 'text-red-400'     },
    half_day: { hint: 'Employee worked half the day',          color: 'text-blue-400'    },
    leave:    { hint: 'Employee is on approved leave',         color: 'text-purple-400'  },
    late:     { hint: 'Employee came in late',                 color: 'text-yellow-400'  },
  };

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      size="sm"
      title={modal?.mode === 'edit' ? 'Edit Attendance' : 'Mark Attendance'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>
            {modal?.mode === 'edit' ? 'Save Changes' : 'Mark'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Employee" required error={errors.employee}>
          <Select value={form.employee} onChange={set('employee')}>
            <option value="">Select an employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Date" required error={errors.date} hint="Defaults to today — change to correct if marking for a past day">
          <Input
            type="date"
            value={form.date}
            max={today}
            onChange={set('date')}
          />
        </Field>

        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="leave">Leave</option>
            <option value="late">Late</option>
          </Select>
          {form.status && statusMeta[form.status] && (
            <span className={`block text-xs mt-1 ${statusMeta[form.status].color}`}>
              {statusMeta[form.status].hint}
            </span>
          )}
        </Field>

        <Field label="Notes (optional)">
          <Input placeholder="Any remarks about this attendance…" value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
}
