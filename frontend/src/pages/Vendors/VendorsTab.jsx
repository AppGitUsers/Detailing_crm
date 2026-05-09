import { useEffect, useState } from 'react';
import { Plus, Truck, Pencil, Trash2, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listVendors, createVendor, updateVendor, deleteVendor } from '../../api/vendors';
import { extractError } from '../../api/axios';

export default function VendorsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listVendors(search ? { name: search } : undefined);
      setVendors(Array.isArray(data) ? data : (data.results || []));
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
      await deleteVendor(confirmDel.id);
      toast.success('Vendor deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'vendor_name', header: 'Name', render: (r) => <span className="font-medium text-gray-100">{r.vendor_name}</span> },
    { key: 'vendor_phone_number', header: 'Phone' },
    { key: 'vendor_email', header: 'Email', render: (r) => r.vendor_email || <span className="text-gray-500">—</span> },
    { key: 'vendor_gst_number', header: 'GST', render: (r) => r.vendor_gst_number || <span className="text-gray-500">—</span> },
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
        title="Vendors"
        subtitle="Suppliers you purchase products from"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Vendor</Button>}
      />

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search vendors by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors yet"
          message={search ? 'Try a different search.' : 'Add your first vendor.'}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Vendor</Button>}
        />
      ) : (
        <Table columns={columns} rows={vendors} />
      )}

      <VendorFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete ${confirmDel?.vendor_name}?`}
        message="This action cannot be undone."
      />
    </div>
  );
}

function VendorFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const empty = { vendor_name: '', vendor_phone_number: '', vendor_email: '', vendor_address: '', vendor_gst_number: '' };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        vendor_name: modal.data.vendor_name || '',
        vendor_phone_number: modal.data.vendor_phone_number || '',
        vendor_email: modal.data.vendor_email || '',
        vendor_address: modal.data.vendor_address || '',
        vendor_gst_number: modal.data.vendor_gst_number || '',
      });
    } else { setForm(empty); }
    setErrors({});
    // eslint-disable-next-line
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.vendor_name.trim()) eMap.vendor_name = 'Required';
    if (!form.vendor_phone_number.trim()) eMap.vendor_phone_number = 'Required';
    if (!form.vendor_email.trim()) eMap.vendor_email = 'Required';
    if (!form.vendor_address.trim()) eMap.vendor_address = 'Required';
    if (!form.vendor_gst_number.trim()) eMap.vendor_gst_number = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      if (modal.mode === 'edit') {
        await updateVendor(modal.data.id, form);
        toast.success('Vendor updated');
      } else {
        await createVendor(form);
        toast.success('Vendor created');
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
      title={modal?.mode === 'edit' ? 'Edit Vendor' : 'Add Vendor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Vendor Name" required error={errors.vendor_name}>
          <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
        </Field>
        <Field label="Phone" required error={errors.vendor_phone_number}>
          <Input value={form.vendor_phone_number} onChange={(e) => setForm({ ...form, vendor_phone_number: e.target.value })} />
        </Field>
        <Field label="Email" required error={errors.vendor_email}>
          <Input type="email" value={form.vendor_email} onChange={(e) => setForm({ ...form, vendor_email: e.target.value })} />
        </Field>
        <Field label="GST Number" required error={errors.vendor_gst_number}>
          <Input value={form.vendor_gst_number} onChange={(e) => setForm({ ...form, vendor_gst_number: e.target.value })} />
        </Field>
        <Field label="Address" required error={errors.vendor_address}>
          <Input value={form.vendor_address} onChange={(e) => setForm({ ...form, vendor_address: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
