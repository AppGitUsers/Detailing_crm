import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Car, Pencil, Trash2, ClipboardList } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { getCustomer, addCustomerAsset, updateAsset, deleteAsset } from '../../api/customers';
import { listJobCards } from '../../api/jobcards';
import { extractError } from '../../api/axios';

export default function CustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [vehicleModal, setVehicleModal] = useState(null); // null | { mode, data }
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, j] = await Promise.all([getCustomer(id), listJobCards()]);
      setCustomer(c);
      const arr = Array.isArray(j) ? j : (j.results || []);
      const customerVehicleIds = (c.vehicles || []).map((v) => v.id);
      setJobs(arr.filter((job) => customerVehicleIds.includes(job.customer_asset)));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onDeleteVehicle = async () => {
    if (!confirmDel) return;
    try {
      await deleteAsset(confirmDel.id);
      toast.success('Vehicle removed');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  if (loading) return <Loading />;
  if (!customer) return <div className="text-gray-400">Customer not found</div>;

  return (
    <div>
      <PageHeader
        title={customer.customer_name}
        subtitle={`${customer.phone_number}${customer.email ? ' · ' + customer.email : ''}`}
        breadcrumbs={
          <Link to="/customers" className="hover:text-gray-300 inline-flex items-center gap-1">
            <ChevronLeft size={12} /> Back to Customers
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
              <Car size={16} /> Vehicles
            </h2>
            <Button size="sm" onClick={() => setVehicleModal({ mode: 'create' })}>
              <Plus size={14} /> Add Vehicle
            </Button>
          </div>
          {(customer.vehicles || []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No vehicles registered</div>
          ) : (
            <div className="divide-y divide-border">
              {customer.vehicles.map((v) => (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-100">{v.vehicle_number}</div>
                    <div className="text-xs text-gray-400">{v.vehicle_name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setVehicleModal({ mode: 'edit', data: v })} className="p-1.5 text-gray-400 hover:text-accent">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDel(v)} className="p-1.5 text-gray-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
              <ClipboardList size={16} /> Job Card History
            </h2>
          </div>
          {jobs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No job cards for this customer</div>
          ) : (
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {jobs.map((j) => (
                <Link
                  to={`/jobcards/${j.id}`}
                  key={j.id}
                  className="block px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-100 text-sm truncate">{j.job_card_number}</div>
                      <div className="text-xs text-gray-400">{j.vehicle_number} · {j.job_card_date}</div>
                    </div>
                    <Badge variant={j.job_card_status === 'COMPLETED' ? 'green' : 'yellow'}>
                      {j.job_card_status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <VehicleModal
        modal={vehicleModal}
        onClose={() => setVehicleModal(null)}
        onSaved={load}
        customerId={id}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDeleteVehicle}
        title="Remove this vehicle?"
        message="The vehicle will be removed from this customer."
      />
    </div>
  );
}

function VehicleModal({ modal, onClose, onSaved, customerId }) {
  const toast = useToast();
  const [form, setForm] = useState({ vehicle_number: '', vehicle_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        vehicle_number: modal.data.vehicle_number || '',
        vehicle_name: modal.data.vehicle_name || '',
      });
    } else {
      setForm({ vehicle_number: '', vehicle_name: '' });
    }
    setErrors({});
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.vehicle_number.trim()) eMap.vehicle_number = 'Required';
    if (!form.vehicle_name.trim()) eMap.vehicle_name = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      if (modal.mode === 'edit') {
        await updateAsset(modal.data.id, form);
        toast.success('Vehicle updated');
      } else {
        await addCustomerAsset(customerId, form);
        toast.success('Vehicle added');
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
      title={modal?.mode === 'edit' ? 'Edit Vehicle' : 'Add Vehicle'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Vehicle Number" required error={errors.vehicle_number}>
          <Input
            placeholder="KA01AB1234"
            value={form.vehicle_number}
            onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
          />
        </Field>
        <Field label="Vehicle Name" required error={errors.vehicle_name}>
          <Input
            placeholder="Honda City / Hyundai Creta..."
            value={form.vehicle_name}
            onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
}
