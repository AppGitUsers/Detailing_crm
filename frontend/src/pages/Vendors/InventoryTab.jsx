import { useEffect, useState } from 'react';
import { Boxes, Pencil, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { Field, Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listInventory, updateInventory } from '../../api/inventory';
import { extractError } from '../../api/axios';

export default function InventoryTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = showLowOnly ? { low_stock: 'true' } : undefined;
      const data = await listInventory(params);
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showLowOnly]);

  const lowCount = items.filter((i) => i.is_low_stock).length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items · ${lowCount} below threshold`}
        actions={
          <Button
            variant={showLowOnly ? 'danger' : 'secondary'}
            onClick={() => setShowLowOnly((v) => !v)}
          >
            <AlertTriangle size={14} /> {showLowOnly ? 'Showing low stock' : 'Show low stock only'}
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory items"
          message="Inventory is created automatically when you create invoices."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-bg-card border rounded-xl p-4 ${item.is_low_stock ? 'border-red-700/60' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-100 truncate">{item.product_name}</h3>
                    {item.is_low_stock && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 bg-red-900/40 px-1.5 py-0.5 rounded">
                        Low
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Last updated {item.last_updated?.slice(0, 10)}</div>
                </div>
                <button
                  onClick={() => setEditItem(item)}
                  className="text-gray-400 hover:text-accent p-1"
                  title="Adjust stock"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-semibold ${item.is_low_stock ? 'text-red-300' : 'text-gray-100'}`}>
                    {item.quantity_available}
                    <span className="text-sm font-normal text-gray-500 ml-1">{item.unit}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Threshold: {item.minimum_threshold} {item.unit}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdjustStockModal item={editItem} onClose={() => setEditItem(null)} onSaved={load} />
    </div>
  );
}

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
