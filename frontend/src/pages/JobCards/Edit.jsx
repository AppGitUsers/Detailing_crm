import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import VehicleAutocomplete from '../../components/VehicleAutocomplete';
import { getJobCard, updateJobCard } from '../../api/jobcards';
import { patchAsset, listVehicleCompanies, createVehicleCompany, listVehicleModels, createVehicleModel, listVehicleColours, createVehicleColour } from '../../api/customers';
import { listEmployees } from '../../api/employees';
import { extractError } from '../../api/axios';

const toLocalDT = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function JobCardEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees]   = useState([]);
  const [job, setJob]               = useState(null);

  const [form, setForm] = useState({
    job_card_date: '',
    vehicle_kilometers: '',
    vehicle_entry_time: '',
    vehicle_expected_exit_time: '',
    complaints: '',
    employee: '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_company: '',
    vehicle_model: '',
    vehicle_colour: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [j, emps] = await Promise.all([getJobCard(id), listEmployees()]);
        setJob(j);
        setEmployees(Array.isArray(emps) ? emps : (emps.results || []));
        setForm({
          job_card_date: j.job_card_date || '',
          vehicle_kilometers: j.vehicle_kilometers || '',
          vehicle_entry_time: toLocalDT(j.vehicle_entry_time),
          vehicle_expected_exit_time: toLocalDT(j.vehicle_expected_exit_time),
          complaints: j.complaints || '',
          employee: j.employee ? String(j.employee) : '',
        });
        setVehicleForm({
          vehicle_company: j.vehicle_company || '',
          vehicle_model: j.vehicle_model || '',
          vehicle_colour: j.vehicle_colour || '',
        });
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]); // eslint-disable-line

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updV = (k, v) => setVehicleForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.job_card_date) e.job_card_date = 'Required';
    if (form.vehicle_kilometers === '' || isNaN(Number(form.vehicle_kilometers))) e.vehicle_kilometers = 'Required';
    if (!form.vehicle_entry_time) e.vehicle_entry_time = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Update job card core fields
      await updateJobCard(id, {
        job_card_date: form.job_card_date,
        vehicle_kilometers: Number(form.vehicle_kilometers),
        vehicle_entry_time: new Date(form.vehicle_entry_time).toISOString(),
        ...(form.vehicle_expected_exit_time
          ? { vehicle_expected_exit_time: new Date(form.vehicle_expected_exit_time).toISOString() }
          : {}),
        complaints: form.complaints,
        employee: form.employee ? Number(form.employee) : null,
      });

      // Update vehicle details on the CustomerAsset (partial update)
      if (job?.customer_asset) {
        await patchAsset(job.customer_asset, {
          vehicle_company: vehicleForm.vehicle_company,
          vehicle_model: vehicleForm.vehicle_model,
          vehicle_colour: vehicleForm.vehicle_colour,
        });
      }

      toast.success('Job card updated');
      navigate(`/jobcards/${id}`);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (!job) return <div className="text-gray-400 p-4">Job card not found</div>;

  const vehicleType = job.vehicle_type || '';

  return (
    <div>
      <PageHeader
        title={`Edit Job Card — ${job.job_card_number}`}
        subtitle={`${job.customer_name} · ${job.vehicle_number}`}
        breadcrumbs={
          <Link to={`/jobcards/${id}`} className="hover:text-gray-300 inline-flex items-center gap-1">
            <ChevronLeft size={12} /> Back to Job Card
          </Link>
        }
      />

      <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-6 max-w-3xl mt-4 space-y-6">

        {/* ── Core details ── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Job Card Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" required error={errors.job_card_date}>
              <Input
                type="date"
                value={form.job_card_date}
                onChange={(e) => upd('job_card_date', e.target.value)}
              />
            </Field>
            <Field label="Vehicle KM" required error={errors.vehicle_kilometers}>
              <Input
                type="number"
                step="0.01"
                value={form.vehicle_kilometers}
                onChange={(e) => upd('vehicle_kilometers', e.target.value)}
              />
            </Field>
            <Field label="Entry Time" required error={errors.vehicle_entry_time}>
              <Input
                type="datetime-local"
                value={form.vehicle_entry_time}
                onChange={(e) => upd('vehicle_entry_time', e.target.value)}
              />
            </Field>
            <Field label="Expected Exit Time">
              <Input
                type="datetime-local"
                value={form.vehicle_expected_exit_time}
                onChange={(e) => upd('vehicle_expected_exit_time', e.target.value)}
              />
            </Field>
            <Field label="Employee">
              <Select value={form.employee} onChange={(e) => upd('employee', e.target.value)}>
                <option value="">None (unassigned)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Complaints / Notes">
                <Textarea
                  rows={3}
                  value={form.complaints}
                  onChange={(e) => upd('complaints', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Vehicle details ── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Vehicle Details</h3>
          <p className="text-xs text-gray-500 mb-4">
            Vehicle number: <span className="text-gray-300 font-medium">{job.vehicle_number}</span>
            {vehicleType && <> · Type: <span className="text-gray-300">{vehicleType.replace('_', ' ')}</span></>}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VehicleAutocomplete
              label="Company / Make"
              value={vehicleForm.vehicle_company}
              onChange={(v) => updV('vehicle_company', v)}
              onSelect={(name, isNew) => {
                updV('vehicle_company', name);
                updV('vehicle_model', '');
                if (isNew) createVehicleCompany({ name, vehicle_type: vehicleType });
              }}
              fetchOptions={(q) => listVehicleCompanies({ q, vehicle_type: vehicleType })}
              onCreate={(name) => createVehicleCompany({ name, vehicle_type: vehicleType })}
              placeholder="e.g. Honda"
            />
            <VehicleAutocomplete
              label="Model"
              value={vehicleForm.vehicle_model}
              onChange={(v) => updV('vehicle_model', v)}
              onSelect={(name, isNew) => {
                updV('vehicle_model', name);
                if (isNew) createVehicleModel({ name, company_name: vehicleForm.vehicle_company });
              }}
              fetchOptions={(q) => listVehicleModels({ q, company: vehicleForm.vehicle_company })}
              onCreate={(name) => createVehicleModel({ name, company_name: vehicleForm.vehicle_company })}
              placeholder="e.g. City"
            />
            <VehicleAutocomplete
              label="Colour"
              value={vehicleForm.vehicle_colour}
              onChange={(v) => updV('vehicle_colour', v)}
              onSelect={(name, isNew) => {
                updV('vehicle_colour', name);
                if (isNew) createVehicleColour({ name });
              }}
              fetchOptions={(q) => listVehicleColours({ q })}
              onCreate={(name) => createVehicleColour({ name })}
              placeholder="e.g. White"
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Link to={`/jobcards/${id}`}>
            <Button variant="ghost"><ChevronLeft size={14} /> Cancel</Button>
          </Link>
          <Button variant="success" loading={submitting} onClick={submit}>
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
