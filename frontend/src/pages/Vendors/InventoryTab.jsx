import { useEffect, useMemo, useState } from 'react';
import { Boxes, Pencil, AlertTriangle, Search, X, Tag } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listInventory, updateInventory } from '../../api/inventory';
import { extractError } from '../../api/axios';

const CATEGORIES = [
  { value: 'consumption',  label: 'Consumption',  cls: 'bg-blue-900/40 text-blue-400 border border-blue-800' },
  { value: 'sales',        label: 'Sales',         cls: 'bg-purple-900/40 text-purple-400 border border-purple-800' },
  { value: 'fixed_assets', label: 'Fixed Assets',  cls: 'bg-teal-900/40 text-teal-400 border border-teal-800' },
  { value: 'other',        label: 'Other',         cls: 'bg-gray-700/40 text-gray-400 border border-gray-700' },
];
const catCfg = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

function CategoryBadge({ value }) {
  const c = catCfg[value] || catCfg.other;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Main Tab ─────────────────────────────────────────

export default function InventoryTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [qtyMax, setQtyMax] = useState('');
  const [updatedAfter, setUpdatedAfter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listInventory();
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // derive available type names from loaded items
  const allTypes = useMemo(() => {
    const seen = new Set();
    for (const item of items) {
      if (item.type_name) seen.add(item.type_name);
    }
    return [...seen].sort();
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(i =>
        i.product_name?.toLowerCase().includes(q) ||
        i.product_code?.toLowerCase().includes(q)
      );
    }
    if (lowOnly) r = r.filter(i => i.is_low_stock);
    if (catFilter !== 'all') r = r.filter(i => i.category === catFilter);
    if (typeFilter !== 'all') r = r.filter(i => i.type_name === typeFilter);
    if (qtyMax !== '') {
      const max = Number(qtyMax);
      if (!isNaN(max)) r = r.filter(i => Number(i.quantity_available) < max);
    }
    if (updatedAfter) r = r.filter(i => i.last_updated?.slice(0, 10) >= updatedAfter);
    return r;
  }, [items, search, lowOnly, catFilter, typeFilter, qtyMax, updatedAfter]);

  // group filtered results by category
  const grouped = useMemo(() => {
    const map = {};
    for (const cat of CATEGORIES) {
      const group = filtered.filter(i => i.category === cat.value);
      if (group.length > 0) map[cat.value] = group;
    }
    return map;
  }, [filtered]);

  const hasFilters = search.trim() || lowOnly || catFilter !== 'all' || typeFilter !== 'all' || qtyMax !== '' || updatedAfter;
  const lowCount = items.filter(i => i.is_low_stock).length;

  const clearFilters = () => {
    setSearch(''); setLowOnly(false); setCatFilter('all');
    setTypeFilter('all'); setQtyMax(''); setUpdatedAfter('');
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items · ${lowCount} below threshold`}
      />

      {/* ── Filter Bar ── */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 space-y-3">

        {/* Row 1: search + low stock toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name or product code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <button
            onClick={() => setLowOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
              lowOnly
                ? 'bg-red-900/50 text-red-400 border-red-700'
                : 'border-border text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            <AlertTriangle size={12} /> Low stock
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
              <X size={12} /> Clear
            </button>
          )}
          {!loading && (
            <span className="text-xs text-gray-500 ml-auto">
              {filtered.length === items.length
                ? `${items.length} items`
                : `${filtered.length} of ${items.length}`}
            </span>
          )}
        </div>

        {/* Row 2: Category */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1 shrink-0">Category:</span>
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(({ value, label, cls }) => (
            <button
              key={value}
              onClick={() => setCatFilter(value)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                catFilter === value
                  ? cls || 'bg-accent/20 text-accent border-accent/50'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Row 3: Type (only shown when types exist) */}
        {allTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1 shrink-0">Type:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                typeFilter === 'all'
                  ? 'bg-accent/20 text-accent border-accent/50'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
              }`}
            >All</button>
            {allTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
                  typeFilter === t
                    ? 'bg-accent/20 text-accent border-accent/50'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-border'
                }`}
              >
                <Tag size={10} />{t}
              </button>
            ))}
          </div>
        )}

        {/* Row 4: Advanced quantity + date filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Qty less than:</span>
            <Input
              type="number" step="0.01" value={qtyMax}
              onChange={(e) => setQtyMax(e.target.value)}
              placeholder="e.g. 5" className="h-7 text-xs w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Updated after:</span>
            <input
              type="date" value={updatedAfter}
              onChange={(e) => setUpdatedAfter(e.target.value)}
              className="bg-bg-elev border border-border rounded px-2 py-1 text-xs text-gray-200 h-7 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory items"
          message="Inventory is created automatically when you create invoices."
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No items match the current filters.</div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.filter(cat => grouped[cat.value]).map(cat => (
            <div key={cat.value}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <CategoryBadge value={cat.value} />
                <span className="text-xs text-gray-500">
                  {grouped[cat.value].length} item{grouped[cat.value].length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[cat.value].map(item => (
                  <InventoryCard key={item.id} item={item} onEdit={() => setEditItem(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdjustStockModal item={editItem} onClose={() => setEditItem(null)} onSaved={load} />
    </div>
  );
}

// ─── Inventory Card ───────────────────────────────────

function InventoryCard({ item, onEdit }) {
  const pct = Number(item.minimum_threshold) > 0
    ? Math.min(100, (Number(item.quantity_available) / Number(item.minimum_threshold)) * 100)
    : null;

  return (
    <div className={`bg-bg-card border rounded-xl p-4 ${item.is_low_stock ? 'border-red-700/60' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-100 truncate">{item.product_name}</h3>
            {item.is_low_stock && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 bg-red-900/40 px-1.5 py-0.5 rounded">
                Low
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.product_code && (
              <span className="text-[10px] font-mono text-gray-500 bg-bg-elev px-1.5 py-0.5 rounded">
                {item.product_code}
              </span>
            )}
            {item.type_name && (
              <span className="flex items-center gap-0.5 text-[10px] text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
                <Tag size={8} />{item.type_name}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            Updated {item.last_updated?.slice(0, 10)}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-accent p-1 shrink-0"
          title="Adjust stock"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className={`text-2xl font-semibold ${item.is_low_stock ? 'text-red-300' : 'text-gray-100'}`}>
            {item.quantity_available}
            <span className="text-sm font-normal text-gray-500 ml-1">{item.unit}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Threshold: {item.minimum_threshold} {item.unit}
          </div>
        </div>

        {pct !== null && (
          <div className="w-16 shrink-0">
            <div className="text-[10px] text-gray-600 text-right mb-1">{Math.round(pct)}%</div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.is_low_stock ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Adjust Stock Modal ───────────────────────────────

function AdjustStockModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [qty, setQty] = useState('');
  const [threshold, setThreshold] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQty(item.quantity_available ?? '');
    setThreshold(item.minimum_threshold ?? '');
  }, [item]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateInventory(item.id, {
        quantity_available: Number(qty),
        minimum_threshold: Number(threshold),
      });
      toast.success('Inventory updated');
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
      open={!!item}
      onClose={onClose}
      title={item ? `Adjust: ${item.product_name}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>Save</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={`Quantity Available (${item?.unit || ''})`}>
          <Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label={`Minimum Threshold (${item?.unit || ''})`}>
          <Input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
