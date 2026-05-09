import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench, Search, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listServices, createService, updateService, deleteService } from '../../api/services';
import { extractError } from '../../api/axios';

export default function ServicesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listServices(search ? { name: search } : undefined);
      setServices(Array.isArray(data) ? data : (data.results || []));
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
      await deleteService(confirmDel.id);
      toast.success('Service deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'service_name', header: 'Service', render: (r) => <span className="font-medium text-gray-100">{r.service_name}</span> },
    { key: 'service_code', header: 'Code', render: (r) => <code className="text-xs bg-bg-elev px-1.5 py-0.5 rounded">{r.service_code}</code> },
    { key: 'service_price', header: 'Price', render: (r) => `₹${Number(r.service_price).toLocaleString('en-IN')}` },
    { key: 'products_count', header: 'Products', render: (r) => (r.products || []).length },
    { key: 'employees_count', header: 'Employees', render: (r) => (r.employees || []).length },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
        title="Services"
        subtitle="Service catalog with products and assigned employees"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Service</Button>}
      />

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search services by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No services yet"
          message={search ? 'Try a different search.' : 'Create your first service.'}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Service</Button>}
        />
      ) : (
        <Table columns={columns} rows={services} onRowClick={(r) => navigate(`/services/${r.id}`)} />
      )}

      <ServiceFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete ${confirmDel?.service_name}?`}
        message="This service and its product/employee links will be removed."
      />
    </div>
  );
}

function ServiceFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ service_name: '', service_code: '', service_price: '', service_description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        service_name: modal.data.service_name || '',
        service_code: modal.data.service_code || '',
        service_price: modal.data.service_price || '',
        service_description: modal.data.service_description || '',
      });
    } else {
      setForm({ service_name: '', service_code: '', service_price: '', service_description: '' });
    }
    setErrors({});
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.service_name.trim()) eMap.service_name = 'Required';
    if (!form.service_code.trim()) eMap.service_code = 'Required';
    if (form.service_price === '' || isNaN(Number(form.service_price))) eMap.service_price = 'Valid price required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = { ...form, service_price: Number(form.service_price) };
      if (modal.mode === 'edit') {
        await updateService(modal.data.id, payload);
        toast.success('Service updated');
      } else {
        await createService(payload);
        toast.success('Service created');
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
      title={modal?.mode === 'edit' ? 'Edit Service' : 'Add Service'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Service Name" required error={errors.service_name}>
          <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
        </Field>
        <Field label="Service Code" required error={errors.service_code}>
          <Input value={form.service_code} onChange={(e) => setForm({ ...form, service_code: e.target.value })} />
        </Field>
        <Field label="Price (₹)" required error={errors.service_price}>
          <Input type="number" step="0.01" value={form.service_price} onChange={(e) => setForm({ ...form, service_price: e.target.value })} />
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea value={form.service_description} onChange={(e) => setForm({ ...form, service_description: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
