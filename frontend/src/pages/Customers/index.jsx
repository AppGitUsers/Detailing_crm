import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Car, Search, Pencil, Trash2, Filter } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Field, Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import {
  listCustomers, createCustomer, updateCustomer, deleteCustomer,
  listAllVehicles, listVehicleCompanies,
} from '../../api/customers';
import { extractError } from '../../api/axios';

/* ── Helpers ── */
const addMonths = (dateStr, n) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (s) => {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const VTYPE_LABEL = {
  two_wheeler: 'Two Wheeler',
  three_wheeler: 'Three Wheeler',
  four_wheeler: 'Four Wheeler',
  other: 'Other',
};

/* ═══ Main page ═════════════════════════════════════════════════════════════ */
export default function CustomersVehicles() {
  const [tab, setTab] = useState('customers'); // 'customers' | 'vehicles'

  return (
    <div>
      <PageHeader
        title="Customers / Vehicles"
        subtitle="Manage your customers and their vehicles"
        actions={tab === 'customers'
          ? <CustomerActions />
          : null
        }
      />

      {/* Tab switch */}
      <div className="flex gap-0 mb-4 border-b border-border">
        <TabBtn active={tab === 'customers'} onClick={() => setTab('customers')} icon={<Users size={14} />}>
          Customers
        </TabBtn>
        <TabBtn active={tab === 'vehicles'} onClick={() => setTab('vehicles')} icon={<Car size={14} />}>
          Vehicles
        </TabBtn>
      </div>

      {tab === 'customers' ? <CustomersTab /> : <VehiclesTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-gray-400 hover:text-gray-200'
      }`}
    >
      {icon}{children}
    </button>
  );
}

/* ── Customer actions button (passed to header) ── */
function CustomerActions() {
  // We can't easily pass setModal from here, so use a custom event / context trick.
  // Instead, the create button is rendered inside CustomersTab itself.
  return null;
}

/* ═══ Customers tab ══════════════════════════════════════════════════════════ */
function CustomersTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCustomers(search ? { name: search } : undefined);
      setCustomers(Array.isArray(data) ? data : (data.results || []));
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
      await deleteCustomer(confirmDel.id);
      toast.success('Customer deleted');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDelLoading(false);
    }
  };

  const columns = [
    { key: 'customer_name', header: 'Name', render: (r) => <span className="font-medium text-gray-100">{r.customer_name}</span> },
    { key: 'phone_number', header: 'Phone' },
    { key: 'email', header: 'Email', render: (r) => r.email || <span className="text-gray-500">—</span> },
    { key: 'vehicles', header: 'Vehicles', render: (r) => <span className="text-gray-300">{(r.vehicles || []).length}</span> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="px-2 py-1 text-xs text-white bg-accent rounded hover:bg-accent-hover" onClick={() => navigate(`/customers/${r.id}`)}>
            View
          </button>
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
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search customers by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Customer</Button>
      </div>

      {loading ? (
        <Loading />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          message={search ? 'Try a different search.' : 'Add your first customer to get started.'}
          action={<Button onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Add Customer</Button>}
        />
      ) : (
        <Table columns={columns} rows={customers} onRowClick={(r) => navigate(`/customers/${r.id}`)} />
      )}

      <CustomerFormModal modal={modal} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={onDelete}
        loading={delLoading}
        title={`Delete ${confirmDel?.customer_name}?`}
        message="This customer and their vehicles will be removed."
      />
    </>
  );
}

/* ═══ Vehicles tab ═══════════════════════════════════════════════════════════ */
function VehiclesTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading]         = useState(true);
  const [vehicles, setVehicles]       = useState([]);
  const [companies, setCompanies]     = useState([]);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => {
    listVehicleCompanies({}).then(d => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)        params.search       = search;
      if (typeFilter)    params.vehicle_type = typeFilter;
      if (companyFilter) params.company      = companyFilter;
      const data = await listAllVehicles(Object.keys(params).length ? params : undefined);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search, typeFilter, companyFilter]);

  const hasFilter = !!(search || typeFilter || companyFilter);

  const columns = [
    {
      key: 'vehicle_number',
      header: 'Vehicle Number',
      render: (r) => <span className="font-medium text-gray-100">{r.vehicle_number}</span>,
    },
    {
      key: 'vehicle_info',
      header: 'Make / Model / Colour',
      render: (r) => {
        const parts = [r.vehicle_company, r.vehicle_model, r.vehicle_colour].filter(Boolean);
        return parts.length
          ? <span className="text-gray-300">{parts.join(' · ')}</span>
          : <span className="text-gray-500">—</span>;
      },
    },
    {
      key: 'vehicle_type',
      header: 'Type',
      render: (r) => <span className="text-gray-400 text-xs">{VTYPE_LABEL[r.vehicle_type] || r.vehicle_type}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (r) => <span className="text-gray-200">{r.customer_name}</span>,
    },
    {
      key: 'last_service_date',
      header: 'Last Service',
      render: (r) => <span className="text-gray-400 text-xs">{fmtDate(r.last_service_date)}</span>,
    },
    {
      key: 'next_service_date',
      header: 'Next Service',
      render: (r) => {
        const next = r.next_service_date || addMonths(r.last_service_date, 6);
        if (!next) return <span className="text-gray-500 text-xs">—</span>;
        const isOverdue = new Date(next) < new Date();
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmtDate(next)}
          </span>
        );
      },
    },
  ];

  return (
    <>
      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by vehicle #, customer, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-44">
            <option value="">All Types</option>
            <option value="two_wheeler">Two Wheeler</option>
            <option value="three_wheeler">Three Wheeler</option>
            <option value="four_wheeler">Four Wheeler</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-48">
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </Select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => { setSearch(''); setTypeFilter(''); setCompanyFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-200 underline self-center shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <Loading />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          message={hasFilter ? 'Try adjusting your filters.' : 'No vehicles registered yet.'}
        />
      ) : (
        <Table
          columns={columns}
          rows={vehicles}
          onRowClick={(r) => navigate(`/customers/vehicles/${r.id}`)}
        />
      )}
    </>
  );
}

/* ═══ Customer form modal ════════════════════════════════════════════════════ */
function CustomerFormModal({ modal, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ customer_name: '', phone_number: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!modal) return;
    setForm(modal.mode === 'edit'
      ? { customer_name: modal.data.customer_name || '', phone_number: modal.data.phone_number || '', email: modal.data.email || '' }
      : { customer_name: '', phone_number: '', email: '' }
    );
    setErrors({});
  }, [modal]);

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Required';
    if (!form.phone_number.trim()) e.phone_number = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (modal.mode === 'edit') {
        await updateCustomer(modal.data.id, form);
        toast.success('Customer updated');
      } else {
        await createCustomer(form);
        toast.success('Customer created');
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
      title={modal?.mode === 'edit' ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>{modal?.mode === 'edit' ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" required error={errors.customer_name}>
          <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        </Field>
        <Field label="Phone Number" required error={errors.phone_number}>
          <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
