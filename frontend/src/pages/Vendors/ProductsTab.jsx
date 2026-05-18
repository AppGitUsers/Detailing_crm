import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Package, Pencil, Trash2, Search, Settings2, X, Tag } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select, Textarea } from '../../components/Field';
import { useToast } from '../../components/Toast';
import {
  listProducts, createProduct, updateProduct, deleteProduct,
  listProductTypes, createProductType, updateProductType, deleteProductType,
} from '../../api/products';
import { extractError } from '../../api/axios';

const UNITS = [
  { value: 'l',   label: 'Litres' },
  { value: 'ml',  label: 'Millilitres' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg',  label: 'Kilograms' },
  { value: 'g',   label: 'Grams' },
  { value: 'box', label: 'Box / Pack' },
  { value: 'set', label: 'Set' },
];

const CATEGORIES = [
  { value: 'consumption',  label: 'Consumption',  cls: 'bg-blue-900/40 text-blue-400 border border-blue-800' },
  { value: 'sales',        label: 'Sales',         cls: 'bg-purple-900/40 text-purple-400 border border-purple-800' },
  { value: 'fixed_assets', label: 'Fixed Assets',  cls: 'bg-teal-900/40 text-teal-400 border border-teal-800' },
  { value: 'other',        label: 'Other',         cls: 'bg-gray-700/40 text-gray-400 border border-gray-700' },
];

const catCfg = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

function CategoryBadge({ value }) {
  const c = catCfg[value] || catCfg.other;
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>{c.label}</span>;
}

// ─── Main Tab ─────────────────────────────────────────

export default function ProductsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [types, setTypes] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([listProducts(), listProductTypes()]);
      setProducts(Array.isArray(p) ? p : (p.results || []));
      setTypes(Array.isArray(t) ? t : (t.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const reloadTypes = async () => {
    try {
      const t = await listProductTypes();
      setTypes(Array.isArray(t) ? t : (t.results || []));
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    let r = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(p =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.hsn_code?.toLowerCase().includes(q)
      );
    }
    if (catFilter !== 'all') r = r.filter(p => p.category === catFilter);
    if (typeFilter !== 'all') r = r.filter(p => String(p.product_type) === typeFilter);
    return r;
  }, [products, search, catFilter, typeFilter]);

  const hasFilters = search.trim() || catFilter !== 'all' || typeFilter !== 'all';

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
    {
      key: 'product_name', header: 'Product',
      render: (r) => <div className="font-medium text-gray-100">{r.product_name}</div>,
    },
    {
      key: 'product_code', header: 'Code',
      render: (r) => (
        <div className="text-xs">
          {r.product_code && <div className="text-gray-300 font-mono">{r.product_code}</div>}
          {r.hsn_code && <div className="text-gray-500 mt-0.5">HSN: {r.hsn_code}</div>}
          {!r.product_code && !r.hsn_code && <span className="text-gray-600">—</span>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <CategoryBadge value={r.category} /> },
    {
      key: 'product_type', header: 'Type',
      render: (r) => r.type_name
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent border border-accent/30"><Tag size={10} />{r.type_name}</span>
        : <span className="text-gray-600 text-xs">—</span>,
    },
    { key: 'product_unit', header: 'Unit', render: (r) => <span className="text-gray-300">{r.product_unit}</span> },
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
        title="Products"
        subtitle="Catalog of products used or sold in your detailing business"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setTypesOpen(true)}>
              <Settings2 size={15} /> Manage Types
            </Button>
            <Button onClick={() => setModal({ mode: 'create' })}>
              <Plus size={16} /> Add Product
            </Button>
          </div>
        }
      />

      {/* ── Filters ── */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input placeholder="Search name, brand, code, HSN…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setCatFilter('all'); setTypeFilter('all'); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
              <X size={12} /> Clear
            </button>
          )}
          {!loading && (
            <span className="text-xs text-gray-500 ml-auto">
              {filtered.length === products.length ? `${products.length} products` : `${filtered.length} of ${products.length}`}
            </span>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Category:</span>
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(({ value, label, cls }) => (
            <button key={value} onClick={() => setCatFilter(value)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                catFilter === value
                  ? cls || 'bg-accent/20 text-accent border-accent/50'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Type filter */}
        {types.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Type:</span>
            <button onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                typeFilter === 'all' ? 'bg-accent/20 text-accent border-accent/50' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
              }`}>All</button>
            {types.map((t) => (
              <button key={t.id} onClick={() => setTypeFilter(String(t.id))}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  typeFilter === String(t.id)
                    ? 'bg-accent/20 text-accent border-accent/50'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
                }`}>{t.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? <Loading /> : products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" message="Add your first product to the catalog."
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Product</Button>} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No products match the current filters.</div>
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      <ProductFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} types={types} />
      <ManageTypesModal open={typesOpen} onClose={() => setTypesOpen(false)} onChanged={reloadTypes} />
      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={onDelete} loading={delLoading}
        title={`Delete ${confirmDel?.product_name}?`}
        message="This action cannot be undone."
      />
    </div>
  );
}

// ─── Product Form Modal ───────────────────────────────

function ProductFormModal({ modal, onClose, onSaved, types }) {
  const toast = useToast();
  const empty = {
    product_name: '', hsn_code: '',
    product_description: '',
    product_unit: 'l', category: 'consumption',
  };
  const [form, setForm] = useState(empty);
  const [typeInput, setTypeInput] = useState('');
  const [typeId, setTypeId] = useState('');
  const [localTypes, setLocalTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    setLocalTypes(types);
    if (modal.mode === 'edit') {
      const d = modal.data;
      const matched = types.find((t) => t.id === d.product_type);
      setForm({
        product_name:        d.product_name || '',
        hsn_code:            d.hsn_code || '',
        product_description: d.product_description || '',
        product_unit:        d.product_unit || 'l',
        category:            d.category || 'consumption',
      });
      setTypeInput(matched?.name || '');
      setTypeId(d.product_type ? String(d.product_type) : '');
    } else {
      setForm(empty);
      setTypeInput(''); setTypeId('');
    }
    setErrors({});
    // eslint-disable-next-line
  }, [modal]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSelectType = (type) => {
    setTypeInput(type.name);
    setTypeId(String(type.id));
  };

  const handleNewType = async (name) => {
    const newType = await createProductType({ name, description: '' });
    setLocalTypes((prev) => [...prev, newType]);
    return newType;
  };

  const submit = async (e) => {
    e.preventDefault();
    const eMap = {};
    if (!form.product_name.trim()) eMap.product_name = 'Required';
    if (!form.product_unit)        eMap.product_unit = 'Required';
    if (!form.category)            eMap.category = 'Required';
    setErrors(eMap);
    if (Object.keys(eMap).length) return;

    const payload = {
      product_name:        form.product_name.trim(),
      hsn_code:            form.hsn_code.trim(),
      product_description: form.product_description.trim(),
      product_unit:        form.product_unit,
      product_type:        typeId ? Number(typeId) : null,
      category:            form.category,
    };

    setSubmitting(true);
    try {
      if (modal.mode === 'edit') { await updateProduct(modal.data.id, payload); toast.success('Product updated'); }
      else                       { await createProduct(payload);                toast.success('Product created'); }
      onSaved(); onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!modal} onClose={onClose} size="xl"
      title={modal?.mode === 'edit' ? 'Edit Product' : 'Add Product'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Product Name" required error={errors.product_name}>
            <Input value={form.product_name} onChange={set('product_name')} placeholder="e.g. Koch Chemie Nano Magic" />
          </Field>
          <Field label="HSN Code" hint="For GST / taxation">
            <Input value={form.hsn_code} onChange={set('hsn_code')} placeholder="e.g. 34051000" />
          </Field>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Category" required error={errors.category}>
            <Select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Type" hint="Type to search or create a new type">
            <TypeCombobox
              value={typeInput}
              onChange={(v) => { setTypeInput(v); if (!v) setTypeId(''); }}
              selectedId={typeId}
              onSelect={handleSelectType}
              types={localTypes}
              onCreateType={handleNewType}
            />
          </Field>
          <Field label="Unit" required error={errors.product_unit}>
            <Select value={form.product_unit} onChange={set('product_unit')}>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
        </div>

        {/* Row 3 */}
        <Field label="Description">
          <Textarea value={form.product_description} onChange={set('product_description')} placeholder="Optional notes about this product…" />
        </Field>
      </form>
    </Modal>
  );
}

// ─── Manage Types Modal ───────────────────────────────

function ManageTypesModal({ open, onClose, onChanged }) {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState(null); // null | { mode, data? }
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const t = await listProductTypes();
      setTypes(Array.isArray(t) ? t : (t.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

  const onSaved = () => { load(); onChanged(); };

  const onDelete = async () => {
    if (!confirmDel) return;
    setDelLoading(true);
    try {
      await deleteProductType(confirmDel.id);
      toast.success('Type deleted');
      setConfirmDel(null);
      onSaved();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={open} onClose={onClose} title="Manage Product Types" size="lg"
        footer={
          <div className="flex justify-between w-full">
            <Button onClick={() => setFormModal({ mode: 'create' })}><Plus size={15} /> New Type</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        }
      >
        {loading ? <Loading /> : types.length === 0 ? (
          <EmptyState icon={Tag} title="No types yet"
            message="Create types to categorise your products (e.g. Wax, Foam, Polish)."
            action={<Button onClick={() => setFormModal({ mode: 'create' })}><Plus size={15} /> New Type</Button>} />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elev">
                <tr>
                  <th className="text-left px-4 py-2.5 text-gray-300 font-medium">Type Name</th>
                  <th className="text-left px-4 py-2.5 text-gray-300 font-medium">Description</th>
                  <th className="text-right px-4 py-2.5 text-gray-300 font-medium">Products</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-bg-elev/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-100">{t.name}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{t.description || <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{t.product_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setFormModal({ mode: 'edit', data: t })}
                          className="p-1.5 text-gray-400 hover:text-accent"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDel(t)}
                          className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <TypeFormModal modal={formModal} onClose={() => setFormModal(null)} onSaved={onSaved} />
      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={onDelete} loading={delLoading}
        title={`Delete type "${confirmDel?.name}"?`}
        message={confirmDel?.product_count > 0
          ? `${confirmDel.product_count} product(s) use this type — they will be unlinked.`
          : 'This action cannot be undone.'}
      />
    </>
  );
}

// ─── Type Combobox ────────────────────────────────────
// Portal-based dropdown: filters existing types, offers "Create '...'" when no exact match.

function TypeCombobox({ value, onChange, selectedId, onSelect, types, onCreateType }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef(null);
  const toast = useToast();

  const reposition = () => {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom, left: r.left, width: r.width });
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  const trimmed = value.trim();

  const suggestions = useMemo(() => {
    if (!trimmed) return types;
    const q = trimmed.toLowerCase();
    return types.filter((t) => t.name.toLowerCase().includes(q));
  }, [value, types]);

  const exactMatch = types.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed && !exactMatch;
  const showDropdown = open && (suggestions.length > 0 || showCreate);

  const handleCreate = async () => {
    setOpen(false);
    setCreating(true);
    try {
      const newType = await onCreateType(trimmed);
      onSelect(newType);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setCreating(false);
    }
  };

  const dropdown = showDropdown && createPortal(
    <ul
      style={{ position: 'fixed', top: pos.top + 4, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-bg-card border border-border rounded-lg shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
    >
      {suggestions.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(t); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-elev ${
              selectedId === String(t.id) ? 'text-accent bg-accent/10' : 'text-gray-200'
            }`}
          >
            {t.name}
          </button>
        </li>
      ))}
      {showCreate && (
        <li>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
            className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-accent/10 flex items-center gap-1.5 border-t border-border"
          >
            <Plus size={12} /> Create &ldquo;{trimmed}&rdquo;
          </button>
        </li>
      )}
    </ul>,
    document.body,
  );

  return (
    <div ref={wrapRef}>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); reposition(); }}
        onFocus={() => { setOpen(true); reposition(); }}
        placeholder="Type or pick a type…"
        disabled={creating}
      />
      {dropdown}
    </div>
  );
}

function TypeFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    setForm(modal.mode === 'edit'
      ? { name: modal.data.name || '', description: modal.data.description || '' }
      : { name: '', description: '' });
    setErrors({});
  }, [modal]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Required' }); return; }
    setSubmitting(true);
    try {
      if (modal.mode === 'edit') { await updateProductType(modal.data.id, form); toast.success('Type updated'); }
      else                       { await createProductType(form);                toast.success('Type created'); }
      onSaved(); onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!modal} onClose={onClose}
      title={modal?.mode === 'edit' ? 'Edit Type' : 'New Product Type'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Type Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Wax, Foam, Polish, Shampoo, Tool…" autoFocus />
        </Field>
        <Field label="Description" hint="Optional">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of this product type…" />
        </Field>
      </form>
    </Modal>
  );
}
