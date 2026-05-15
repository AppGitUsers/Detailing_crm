import { useEffect, useState } from 'react';
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
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

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_VALS = [
  { label: 'Mon', val: '0' }, { label: 'Tue', val: '1' }, { label: 'Wed', val: '2' },
  { label: 'Thu', val: '3' }, { label: 'Fri', val: '4' }, { label: 'Sat', val: '5' },
  { label: 'Sun', val: '6' },
];

function parseTime(val) {
  if (!val) return { h12: 9, min: 0, ampm: 'AM' };
  const [h24, m] = val.split(':').map(Number);
  return {
    h12:  h24 % 12 || 12,
    min:  m,
    ampm: h24 >= 12 ? 'PM' : 'AM',
  };
}

function buildTime(h12, min, ampm) {
  let h = h12 % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function fmt12(val) {
  if (!val) return '—';
  const [h24, m] = val.split(':').map(Number);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12  = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function shiftDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TimePicker({ value, onChange, error }) {
  const { h12, min, ampm } = parseTime(value);

  const change = (newH12, newMin, newAmpm) => {
    onChange(buildTime(newH12, newMin, newAmpm));
  };

  const hours   = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const baseInput = 'bg-bg border border-border rounded-md px-2 py-2 text-sm text-gray-100 focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

  return (
    <div>
      <div className={`flex items-center gap-1 ${error ? 'ring-1 ring-red-500 rounded-md' : ''}`}>
        <select
          value={h12}
          onChange={(e) => change(Number(e.target.value), min, ampm)}
          className={`${baseInput} w-16 text-center`}
        >
          {hours.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-500 font-bold">:</span>
        <select
          value={min}
          onChange={(e) => change(h12, Number(e.target.value), ampm)}
          className={`${baseInput} w-16 text-center`}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
        <select
          value={ampm}
          onChange={(e) => change(h12, min, e.target.value)}
          className={`${baseInput} w-16 text-center font-medium`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </div>
  );
}

function DayPicker({ value, onChange }) {
  const selected = value ? value.split(',').filter(Boolean) : [];

  const toggle = (dayVal) => {
    const next = selected.includes(dayVal)
      ? selected.filter((d) => d !== dayVal)
      : [...selected, dayVal].sort((a, b) => Number(a) - Number(b));
    onChange(next.join(','));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DAY_VALS.map((d) => {
        const active = selected.includes(d.val);
        return (
          <button
            key={d.val}
            type="button"
            onClick={() => toggle(d.val)}
            className={`w-12 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              active
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-elev text-gray-400 border-border hover:text-gray-100 hover:border-gray-400'
            }`}
          >
            {d.label}
          </button>
        );
      })}
      {selected.length === 0 && (
        <span className="text-xs text-red-400 self-center">Select at least one day</span>
      )}
    </div>
  );
}

export default function ShiftsTab() {
  const toast = useToast();
  const [loading, setLoading]       = useState(true);
  const [shifts, setShifts]         = useState([]);
  const [modal, setModal]           = useState(null);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        subtitle="Manage work shift timings and schedules"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Shift</Button>}
      />

      {loading ? (
        <Loading />
      ) : shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shifts created yet"
          message="Create shifts to assign working hours to your employees."
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Shift</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((s) => {
            const activeDays = Array.isArray(s.working_day_names) ? s.working_day_names : [];
            const duration   = shiftDuration(s.start_time, s.end_time);
            return (
              <div
                key={s.id}
                className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-black/20 hover:border-accent/30"
              >
                {/* Header */}
                <div className="p-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-100 truncate">{s.shift_name}</div>
                    {duration && (
                      <div className="text-xs text-gray-500 mt-0.5">{duration} shift</div>
                    )}
                  </div>
                </div>

                {/* Time range */}
                <div className="mx-4 mb-3 bg-bg-elev rounded-lg px-4 py-3 flex items-center justify-between border border-border">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-0.5">Start</div>
                    <div className="text-lg font-semibold text-accent">{fmt12(s.start_time)}</div>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-0.5">End</div>
                    <div className="text-lg font-semibold text-gray-100">{fmt12(s.end_time)}</div>
                  </div>
                </div>

                {/* Grace / OT badges */}
                <div className="px-4 pb-2 flex gap-3 text-xs text-gray-500">
                  <span>Grace: <span className="text-gray-300 font-medium">{s.late_grace_minutes ?? 15}m</span></span>
                  <span>OT after: <span className="text-gray-300 font-medium">{s.overtime_threshold_minutes ?? 30}m</span></span>
                </div>

                {/* Day pills */}
                <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-b border-border">
                  {ALL_DAYS.map((day) => {
                    const active = activeDays.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          active
                            ? 'bg-accent/15 text-accent border-accent/30'
                            : 'bg-bg-elev text-gray-600 border-border'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>

                {s.description && (
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs text-gray-500 truncate">{s.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-end gap-1 mt-auto">
                  <button
                    onClick={() => setModal({ mode: 'edit', data: s })}
                    className="p-1.5 text-gray-400 hover:text-accent rounded-lg hover:bg-accent/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDel(s)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShiftFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete shift "${confirmDel?.shift_name}"?`}
        message="Employees assigned to this shift will have their shift cleared."
      />
    </div>
  );
}

function ShiftFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const empty = {
    shift_name: '', start_time: '09:00', end_time: '18:00',
    working_days_preset: 'mon_fri', working_days: '0,1,2,3,4',
    late_grace_minutes: '15', overtime_threshold_minutes: '30', description: '',
  };
  const [form, setForm]         = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        shift_name:                  modal.data.shift_name                  || '',
        start_time:                  modal.data.start_time                  || '09:00',
        end_time:                    modal.data.end_time                    || '18:00',
        working_days_preset:         modal.data.working_days_preset         || 'mon_fri',
        working_days:                modal.data.working_days                || '0,1,2,3,4',
        late_grace_minutes:          String(modal.data.late_grace_minutes         ?? 15),
        overtime_threshold_minutes:  String(modal.data.overtime_threshold_minutes ?? 30),
        description:                 modal.data.description                 || '',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [modal]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.shift_name.trim()) eMap.shift_name = 'Required';
    if (!form.start_time)        eMap.start_time = 'Select a start time';
    if (!form.end_time)          eMap.end_time   = 'Select an end time';
    if (form.start_time && form.end_time && form.start_time >= form.end_time)
      eMap.end_time = 'End time must be after start time.';
    if (form.working_days_preset === 'custom' && !form.working_days)
      eMap.working_days = 'Select at least one day';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        late_grace_minutes:         parseInt(form.late_grace_minutes)         || 15,
        overtime_threshold_minutes: parseInt(form.overtime_threshold_minutes) || 30,
        working_days: form.working_days_preset === 'custom' ? form.working_days : undefined,
      };
      if (modal.mode === 'edit') {
        await updateShift(modal.data.id, payload);
        toast.success('Shift updated');
      } else {
        await createShift(payload);
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
  const duration = !errors.end_time ? shiftDuration(form.start_time, form.end_time) : null;

  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      size="md"
      title={modal?.mode === 'edit' ? 'Edit Shift' : 'Add New Shift'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>
            {modal?.mode === 'edit' ? 'Save Changes' : 'Create Shift'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Shift Name" required error={errors.shift_name}>
          <Input placeholder="e.g. Morning Shift" value={form.shift_name} onChange={set('shift_name')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Start Time <span className="text-red-400">*</span>
            </label>
            <TimePicker
              value={form.start_time}
              onChange={(val) => setForm((f) => ({ ...f, start_time: val }))}
              error={errors.start_time}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              End Time <span className="text-red-400">*</span>
            </label>
            <TimePicker
              value={form.end_time}
              onChange={(val) => setForm((f) => ({ ...f, end_time: val }))}
              error={errors.end_time}
            />
          </div>
        </div>

        {form.start_time && form.end_time && duration && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-400">Shift duration</span>
            <span className="text-sm font-semibold text-accent">
              {fmt12(form.start_time)} → {fmt12(form.end_time)}
              <span className="ml-2 text-xs font-normal text-gray-400">({duration})</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Late Grace (minutes)" hint="Check-in within this window of shift start is not late">
            <Input type="number" min="0" max="120" value={form.late_grace_minutes} onChange={set('late_grace_minutes')} />
          </Field>
          <Field label="OT Threshold (minutes)" hint="Check-out beyond this window of shift end counts as overtime">
            <Input type="number" min="0" max="240" value={form.overtime_threshold_minutes} onChange={set('overtime_threshold_minutes')} />
          </Field>
        </div>

        <Field label="Working Days">
          <Select value={form.working_days_preset} onChange={(e) => {
            const preset = e.target.value;
            const presetMap = {
              mon_sun: '0,1,2,3,4,5,6',
              mon_fri: '0,1,2,3,4',
              mon_sat: '0,1,2,3,4,5',
              sat_sun: '5,6',
            };
            setForm((f) => ({
              ...f,
              working_days_preset: preset,
              working_days: presetMap[preset] || f.working_days,
            }));
          }}>
            {PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>

        {isCustom && (
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Select Working Days</label>
            <DayPicker
              value={form.working_days}
              onChange={(val) => setForm((f) => ({ ...f, working_days: val }))}
            />
            {errors.working_days && (
              <span className="block text-xs text-red-400 mt-1">{errors.working_days}</span>
            )}
          </div>
        )}

        <Field label="Notes (optional)">
          <Input placeholder="Any additional info about this shift" value={form.description} onChange={set('description')} />
        </Field>
      </form>
    </Modal>
  );
}
