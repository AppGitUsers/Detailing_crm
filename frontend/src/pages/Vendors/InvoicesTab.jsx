import { useEffect, useState } from 'react';
import { Plus, Receipt, Trash2, Eye } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { Field, Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listInvoices, createInvoice, getInvoice } from '../../api/invoices';
import { listVendors } from '../../api/vendors';
import { listProducts } from '../../api/products';
import { extractError } from '../../api/axios';

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoicesTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, vs, ps] = await Promise.all([listInvoices(), listVendors(), listProducts()]);
      setInvoices(Array.isArray(inv) ? inv : (inv.results || []));
      setVendors(Array.isArray(vs) ? vs : (vs.results || []));
      setProducts(Array.isArray(ps) ? ps : (ps.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openInvoice = async (id) => {
    try {
      const data = await getInvoice(id);
      setViewInvoice(data);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const columns = [
    { key: 'invoice_number', header: 'Invoice #', render: (r) => <span className="font-medium text-gray-100">{r.invoice_number}</span> },
    { key: 'vendor_name', header: 'Vendor' },
    { key: 'invoice_date', header: 'Date' },
    {
      key: 'total_amount',
      header: 'Total',
      render: (r) => formatCurrency(r.total_amount),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end">
          <button onClick={() => openInvoice(r.id)} className="p-1.5 text-gray-400 hover:text-accent" title="View">
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Purchase invoices from your vendors"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Invoice</Button>}
      />
      {loading ? (
        <Loading />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          message="Create an invoice to add stock to your inventory."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Invoice</Button>}
        />
      ) : (
        <Table columns={columns} rows={invoices} />
      )}

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
        vendors={vendors}
        products={products}
      />

      <ViewInvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
    </div>
  );
}

function CreateInvoiceModal({ open, onClose, onSaved, vendors, products }) {
  const toast = useToast();
  const emptyItem = { product: '', quantity: '', unit_price: '', product_brand: '' };
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setVendorId('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setItems([{ ...emptyItem }]);
    setErrors({});
    // eslint-disable-next-line
  }, [open]);

  const updateItem = (i, k, v) => {
    setItems((arr) => arr.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  };

  const addRow = () => setItems((arr) => [...arr, { ...emptyItem }]);
  const removeRow = (i) => setItems((arr) => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);

  const total = items.reduce((s, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    return s + q * p;
  }, 0);

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!vendorId) eMap.vendor = 'Select vendor';
    if (!invoiceNumber.trim()) eMap.invoice_number = 'Required';
    if (!invoiceDate) eMap.invoice_date = 'Required';
    const validItems = items.filter((it) => it.product && it.quantity && it.unit_price);
    if (validItems.length === 0) eMap.items = 'Add at least one item';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;

    setSubmitting(true);
    try {
      const payload = {
        vendor: Number(vendorId),
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        total_amount: total,
        items: validItems.map((it) => ({
          product: Number(it.product),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          product_brand: it.product_brand,
        })),
      };
      await createInvoice(payload);
      toast.success('Invoice created. Inventory updated.');
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
      open={open}
      onClose={onClose}
      title="New Invoice"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>Create Invoice</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Vendor" required error={errors.vendor}>
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select vendor...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </Select>
          </Field>
          <Field label="Invoice Number" required error={errors.invoice_number}>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </Field>
          <Field label="Invoice Date" required error={errors.invoice_date}>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-bg-elev px-4 py-2.5 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-100">Items</h3>
            <Button size="sm" variant="secondary" onClick={addRow}>
              <Plus size={12} /> Add Row
            </Button>
          </div>
          <div className="divide-y divide-border">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-end">
                <div className="col-span-12 md:col-span-4">
                  <Field label={idx === 0 ? 'Product' : null}>
                    <Select value={it.product} onChange={(e) => updateItem(idx, 'product', e.target.value)}>
                      <option value="">Select...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.product_name} ({p.product_unit})</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Field label={idx === 0 ? 'Qty' : null}>
                    <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Field label={idx === 0 ? 'Unit Price (₹)' : null}>
                    <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <Field label={idx === 0 ? 'Brand' : null}>
                    <Input value={it.product_brand} onChange={(e) => updateItem(idx, 'product_brand', e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={items.length === 1}
                    className="text-gray-400 hover:text-red-400 disabled:opacity-30 p-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {errors.items && <div className="px-4 py-2 text-xs text-red-400">{errors.items}</div>}
        </div>

        <div className="flex justify-end items-center gap-3 pt-2">
          <span className="text-sm text-gray-400">Total:</span>
          <span className="text-xl font-semibold text-gray-100">{formatCurrency(total)}</span>
        </div>
      </div>
    </Modal>
  );
}

function ViewInvoiceModal({ invoice, onClose }) {
  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      size="lg"
      title={invoice ? `Invoice ${invoice.invoice_number}` : ''}
    >
      {invoice && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-gray-500">Vendor</div><div className="text-gray-200">{invoice.vendor_name}</div></div>
            <div><div className="text-xs text-gray-500">Invoice Date</div><div className="text-gray-200">{invoice.invoice_date}</div></div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elev">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-300 font-medium">Product</th>
                  <th className="text-right px-3 py-2 text-gray-300 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-gray-300 font-medium">Unit Price</th>
                  <th className="text-left px-3 py-2 text-gray-300 font-medium">Brand</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-3 py-2 text-gray-200">{it.product_name}</td>
                    <td className="px-3 py-2 text-right text-gray-200">{it.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-200">{formatCurrency(it.unit_price)}</td>
                    <td className="px-3 py-2 text-gray-200">{it.product_brand || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <span className="text-sm text-gray-400">Total:</span>
            <span className="text-lg font-semibold text-gray-100">{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
