import { useEffect, useState } from 'react';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../../api/products';
import { extractError } from '../../api/axios';

const UNITS = ['l', 'g', 'kg', 'pcs'];

export default function ProductsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onDelete = async () => {
    if (!confirmDel) return;
    setDelLoading(true);
    try {
      await deleteProduct(confirmDel.id);
      toast.success('Product deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'product_name', header: 'Name', render: (r) => <span className="font-medium text-gray-100">{r.product_name}</span> },
    { key: 'product_type', header: 'Type' },
    { key: 'product_unit', header: 'Unit' },
    { key: 'product_price', header: 'Price', render: (r) => r.product_price ? `₹${Number(r.product_price).toLocaleString('en-IN')}` : '—' },
    { key: 'product_unit_price', header: 'Unit Price', render: (r) => r.product_unit_price ? `₹${Number(r.product_unit_price).toLocaleString('en-IN')}` : '—' },
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
        title="Products"
        subtitle="Catalog of consumables used in services"
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Product</Button>}
      />
      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          message="Add products to track inventory."
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Product</Button>}
        />
      ) : (
        <Table columns={columns} rows={products} />
      )}
      <ProductFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete ${confirmDel?.product_name}?`}
        message="This action cannot be undone."
      />
    </div>
  );
}

function ProductFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const empty = { product_name: '', product_type: '', product_unit: 'l', product_price: '', product_unit_price: '', product_description: '' };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === 'edit') {
      setForm({
        product_name: modal.data.product_name || '',
        product_type: modal.data.product_type || '',
        product_unit: modal.data.product_unit || 'l',
        product_price: modal.data.product_price || '',
        product_unit_price: modal.data.product_unit_price || '',
        product_description: modal.data.product_description || '',
      });
    } else { setForm(empty); }
    setErrors({});
    // eslint-disable-next-line
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.product_name.trim()) eMap.product_name = 'Required';
    if (!form.product_type.trim()) eMap.product_type = 'Required';
    if (!form.product_unit) eMap.product_unit = 'Required';
    if (form.product_price === '' || isNaN(Number(form.product_price))) eMap.product_price = 'Required';
    if (form.product_unit_price === '' || isNaN(Number(form.product_unit_price))) eMap.product_unit_price = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        product_price: Number(form.product_price),
        product_unit_price: Number(form.product_unit_price),
      };
      if (modal.mode === 'edit') {
        await updateProduct(modal.data.id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
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
      title={modal?.mode === 'edit' ? 'Edit Product' : 'Add Product'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Product Name" required error={errors.product_name}>
          <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
        </Field>
        <Field label="Type" required error={errors.product_type}>
          <Input placeholder="e.g. Wax, Polish, Shampoo" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} />
        </Field>
        <Field label="Unit" required error={errors.product_unit}>
          <Select value={form.product_unit} onChange={(e) => setForm({ ...form, product_unit: e.target.value })}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Price (₹)" required error={errors.product_price} hint="Selling price per pack/bottle">
          <Input type="number" step="0.01" value={form.product_price} onChange={(e) => setForm({ ...form, product_price: e.target.value })} />
        </Field>
        <Field label="Unit Price (₹)" required error={errors.product_unit_price} hint="Cost per single unit">
          <Input type="number" step="0.01" value={form.product_unit_price} onChange={(e) => setForm({ ...form, product_unit_price: e.target.value })} />
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
