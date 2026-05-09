import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listCustomers, getCustomer } from '../../api/customers';
import { createJobCard } from '../../api/jobcards';
import { extractError } from '../../api/axios';

export default function JobCardCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [errors, setErrors] = useState({});

  const nowLocal = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [form, setForm] = useState({
    job_card_number: '',
    customer: '',
    customer_asset: '',
    job_card_date: new Date().toISOString().slice(0, 10),
    vehicle_kilometers: '',
    vehicle_entry_time: nowLocal(),
    vehicle_exit_time: '',
    complaints: '',
  });

  useEffect(() => {
    listCustomers()
      .then((d) => setCustomers(Array.isArray(d) ? d : (d.results || [])))
      .catch((err) => toast.error(extractError(err)))
      .finally(() => setLoadingCustomers(false));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!form.customer) {
      setVehicles([]);
      return;
    }
    setLoadingVehicles(true);
    getCustomer(form.customer)
      .then((c) => setVehicles(c.vehicles || []))
      .catch((err) => toast.error(extractError(err)))
      .finally(() => setLoadingVehicles(false));
    // eslint-disable-next-line
  }, [form.customer]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.job_card_number.trim()) e.job_card_number = 'Required';
    if (!form.customer) e.customer = 'Select a customer';
    if (!form.customer_asset) e.customer_asset = 'Select a vehicle';
    if (!form.job_card_date) e.job_card_date = 'Required';
    if (form.vehicle_kilometers === '' || isNaN(Number(form.vehicle_kilometers))) e.vehicle_kilometers = 'Required';
    if (!form.vehicle_entry_time) e.vehicle_entry_time = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        job_card_number: form.job_card_number.trim(),
        customer_asset: Number(form.customer_asset),
        job_card_date: form.job_card_date,
        vehicle_kilometers: Number(form.vehicle_kilometers),
        vehicle_entry_time: new Date(form.vehicle_entry_time).toISOString(),
        vehicle_exit_time: form.vehicle_exit_time ? new Date(form.vehicle_exit_time).toISOString() : null,
        complaints: form.complaints,
      };
      const created = await createJobCard(payload);
      toast.success('Job card created');
      navigate(`/jobcards/${created.id}`);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Job Card"
        breadcrumbs={
          <Link to="/jobcards" className="hover:text-gray-300 inline-flex items-center gap-1">
            <ChevronLeft size={12} /> Back to Job Cards
          </Link>
        }
      />

      {loadingCustomers ? (
        <Loading />
      ) : (
        <form onSubmit={submit} className="bg-bg-card border border-border rounded-xl p-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Job Card Number" required error={errors.job_card_number}>
              <Input
                placeholder="JC-2025-001"
                value={form.job_card_number}
                onChange={(e) => update('job_card_number', e.target.value)}
              />
            </Field>
            <Field label="Date" required error={errors.job_card_date}>
              <Input
                type="date"
                value={form.job_card_date}
                onChange={(e) => update('job_card_date', e.target.value)}
              />
            </Field>
            <Field label="Customer" required error={errors.customer}>
              <Select
                value={form.customer}
                onChange={(e) => { update('customer', e.target.value); update('customer_asset', ''); }}
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.customer_name} — {c.phone_number}</option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle" required error={errors.customer_asset}
              hint={form.customer && vehicles.length === 0 && !loadingVehicles ? 'No vehicles registered. Add one from Customers.' : undefined}
            >
              <Select
                value={form.customer_asset}
                onChange={(e) => update('customer_asset', e.target.value)}
                disabled={!form.customer || loadingVehicles}
              >
                <option value="">{loadingVehicles ? 'Loading...' : 'Select vehicle...'}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.vehicle_number} — {v.vehicle_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Vehicle KM" required error={errors.vehicle_kilometers}>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 45000"
                value={form.vehicle_kilometers}
                onChange={(e) => update('vehicle_kilometers', e.target.value)}
              />
            </Field>
            <div />
            <Field label="Entry Time" required error={errors.vehicle_entry_time}>
              <Input
                type="datetime-local"
                value={form.vehicle_entry_time}
                onChange={(e) => update('vehicle_entry_time', e.target.value)}
              />
            </Field>
            <Field label="Exit Time">
              <Input
                type="datetime-local"
                value={form.vehicle_exit_time}
                onChange={(e) => update('vehicle_exit_time', e.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Complaints / Notes">
                <Textarea
                  rows={3}
                  placeholder="Customer complaints, requested work, etc."
                  value={form.complaints}
                  onChange={(e) => update('complaints', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-border">
            <Link to="/jobcards"><Button variant="secondary" type="button">Cancel</Button></Link>
            <Button type="submit" loading={submitting}>
              <Save size={16} /> Create Job Card
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
