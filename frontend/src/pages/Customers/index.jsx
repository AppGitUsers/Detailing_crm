import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Car, Search, Pencil, Trash2, Filter, BarChart2 } from 'lucide-react';
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
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import {
  listCustomers, createCustomer, updateCustomer, deleteCustomer,
  listAllVehicles, listVehicleCompanies,
} from '../../api/customers';
import { getCustomerAnalytics } from '../../api/jobcards';
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
  const [tab, setTab] = useState('customers'); // 'customers' | 'vehicles' | 'analytics'

  return (
    <div>
      <PageHeader
        title="Customers / Vehicles"
        subtitle="Manage your customers and their vehicles"
      />

      {/* Tab switch */}
      <div className="flex gap-0 mb-4 border-b border-border">
        <TabBtn active={tab === 'customers'} onClick={() => setTab('customers')} icon={<Users size={14} />}>
          Customers
        </TabBtn>
        <TabBtn active={tab === 'vehicles'} onClick={() => setTab('vehicles')} icon={<Car size={14} />}>
          Vehicles
        </TabBtn>
        <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={<BarChart2 size={14} />}>
          Analytics
        </TabBtn>
      </div>

      {tab === 'customers' ? <CustomersTab /> : tab === 'vehicles' ? <VehiclesTab /> : <AnalyticsTab />}
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
      <div className="bg-bg-card border border-border rounded-xl p-3 sm:p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by vehicle #, customer, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="two_wheeler">Two Wheeler</option>
            <option value="three_wheeler">Three Wheeler</option>
            <option value="four_wheeler">Four Wheeler</option>
            <option value="other">Other</option>
          </Select>
          <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => { setSearch(''); setTypeFilter(''); setCompanyFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Clear filters
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

/* ═══ Analytics tab ══════════════════════════════════════════════════════════ */
const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#34d399','#fb923c'];
const fmtRev = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n}`;

function ChartCard({ title, children, loading, action }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {action}
      </div>
      {loading ? <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div> : children}
    </div>
  );
}

function downloadAnalyticsReport(data) {
  const fmtN = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const revRows = (data.top_by_revenue || []).map((c, i) =>
    `<tr><td>${i + 1}</td><td>${c.name}</td><td style="text-align:right;color:#c4b5fd;font-weight:700">${fmtN(c.revenue)}</td><td style="text-align:center">${c.visits}</td></tr>`
  ).join('');
  const visRows = (data.top_by_visits || []).map((c, i) =>
    `<tr><td>${i + 1}</td><td>${c.name}</td><td style="text-align:center;color:#34d399;font-weight:700">${c.visits}</td><td style="text-align:right">${fmtN(c.revenue)}</td></tr>`
  ).join('');
  const monthRows = (data.monthly_trend || []).map(m =>
    `<tr><td>${m.month}</td><td style="text-align:center">${m.count}</td><td style="text-align:right">${fmtN(m.revenue)}</td></tr>`
  ).join('');
  const typeRows = (data.vehicle_type_dist || []).map(d =>
    `<tr><td>${d.label}</td><td style="text-align:center">${d.count}</td></tr>`
  ).join('');
  const payRows = (data.payment_dist || []).map(d =>
    `<tr><td>${d.status}</td><td style="text-align:center">${d.count}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Customer Analytics Report</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#0b0d12;color:#e5e7eb;padding:32px}.page{max-width:960px;margin:0 auto}h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:4px}h2{font-size:12px;font-weight:600;color:#c4b5fd;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px}.section{background:#13161d;border:1px solid #252a36;border-radius:12px;padding:20px 24px;margin-bottom:20px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:8px 10px;color:#9ca3af;font-weight:500;border-bottom:1px solid #252a36}td{padding:8px 10px;border-bottom:1px solid #1a1e27}tr:hover td{background:#1a1e27}.header{background:linear-gradient(135deg,#1a1e27,#13161d);border:1px solid #252a36;border-radius:12px;padding:24px 28px;margin-bottom:24px}</style>
</head><body><div class="page">
<div class="header"><h1>📊 Customer & Vehicle Analytics</h1><p style="color:#9ca3af;font-size:12px;margin-top:4px">Generated on ${new Date().toLocaleString('en-IN')}</p></div>
<div class="grid2">
<div class="section"><h2>🏆 Top 5 High-Value Customers</h2><table><thead><tr><th>#</th><th>Customer</th><th style="text-align:right">Revenue</th><th style="text-align:center">Visits</th></tr></thead><tbody>${revRows}</tbody></table></div>
<div class="section"><h2>🔁 Top 5 Frequent Visitors</h2><table><thead><tr><th>#</th><th>Customer</th><th style="text-align:center">Visits</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${visRows}</tbody></table></div>
</div>
<div class="section"><h2>📈 Monthly Trend (Last 6 Months)</h2><table><thead><tr><th>Month</th><th style="text-align:center">Job Cards</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${monthRows}</tbody></table></div>
<div class="grid2">
<div class="section"><h2>🚗 Vehicle Type Distribution</h2><table><thead><tr><th>Type</th><th style="text-align:center">Count</th></tr></thead><tbody>${typeRows}</tbody></table></div>
<div class="section"><h2>💳 Payment Status</h2><table><thead><tr><th>Status</th><th style="text-align:center">Count</th></tr></thead><tbody>${payRows}</tbody></table></div>
</div>
</div></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `analytics-${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function AnalyticsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerAnalytics()
      .then(setData)
      .catch(err => toast.error(extractError(err)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const noData = !loading && !data;

  return (
    <div className="space-y-5">
      {/* Download button */}
      {data && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => downloadAnalyticsReport(data)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            ⬇ Download Report
          </button>
        </div>
      )}

      {noData && <div className="text-center py-16 text-gray-500">No data available yet.</div>}

      {/* Row 1: Top by Revenue + Top by Visits */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <ChartCard title="🏆 Top 5 High-Value Customers" loading={loading}>
          {data?.top_by_revenue?.length > 0 ? (
            <>
              <p className="text-[11px] text-gray-500 mb-3">Click a bar to open the customer profile</p>
              <ResponsiveContainer width="100%" height={data.top_by_revenue.length * 44 + 20}>
                <BarChart
                  data={data.top_by_revenue}
                  layout="vertical"
                  margin={{ top: 0, right: 80, left: 8, bottom: 0 }}
                  onClick={(e) => { if (e?.activePayload?.[0]?.payload?.customer_id) navigate(`/customers/${e.activePayload[0].payload.customer_id}`); }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a36" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={fmtRev} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#1a1e27', border: '1px solid #252a36', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [fmtRev(v), 'Revenue']}
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                  />
                  <Bar dataKey="revenue" radius={[0,4,4,0]} maxBarSize={18}>
                    {data.top_by_revenue.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <LabelList dataKey="revenue" position="right" formatter={fmtRev} style={{ fill: '#c4b5fd', fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
        </ChartCard>

        <ChartCard title="🔁 Top 5 Frequent Visitors" loading={loading}>
          {data?.top_by_visits?.length > 0 ? (
            <>
              <p className="text-[11px] text-gray-500 mb-3">Click a bar to open the customer profile</p>
              <ResponsiveContainer width="100%" height={data.top_by_visits.length * 44 + 20}>
                <BarChart
                  data={data.top_by_visits}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
                  onClick={(e) => { if (e?.activePayload?.[0]?.payload?.customer_id) navigate(`/customers/${e.activePayload[0].payload.customer_id}`); }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a36" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#1a1e27', border: '1px solid #252a36', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [v + ' visits', 'Visits']}
                    cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                  />
                  <Bar dataKey="visits" radius={[0,4,4,0]} maxBarSize={18}>
                    {data.top_by_visits.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                    <LabelList dataKey="visits" position="right" style={{ fill: '#34d399', fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
        </ChartCard>
      </div>

      {/* Row 2: Monthly Trend */}
      <ChartCard title="📈 Monthly Job Card Trend (Last 6 Months)" loading={loading}>
        {data?.monthly_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.monthly_trend} margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252a36" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={fmtRev} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                contentStyle={{ background: '#1a1e27', border: '1px solid #252a36', borderRadius: 8, fontSize: 11 }}
                formatter={(v, n) => [n === 'revenue' ? fmtRev(v) : v, n === 'revenue' ? 'Revenue' : 'Job Cards']}
              />
              <Line yAxisId="left"  type="monotone" dataKey="count"   stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} name="count" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="revenue" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
      </ChartCard>

      {/* Row 3: Vehicle type + Payment dist */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard title="🚗 Vehicle Type Distribution" loading={loading}>
          {data?.vehicle_type_dist?.length > 0 ? (
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie data={data.vehicle_type_dist.map(d => ({ ...d, value: d.count }))} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="#13161d">
                  {data.vehicle_type_dist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1e27', border: '1px solid #252a36', borderRadius: 8, fontSize: 11 }} formatter={(v, _, p) => [v + ' job cards', p.payload.label]} />
              </PieChart>
              <div className="space-y-2">
                {data.vehicle_type_dist.map((d, i) => (
                  <div key={d.type} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-300">{d.label}</span>
                    <span className="text-gray-500 ml-1">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
        </ChartCard>

        <ChartCard title="💳 Payment Status Distribution" loading={loading}>
          {data?.payment_dist?.some(d => d.count > 0) ? (
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie data={data.payment_dist.filter(d => d.count > 0).map(d => ({ ...d, value: d.count }))} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="#13161d">
                  {data.payment_dist.filter(d => d.count > 0).map((d) => <Cell key={d.status} fill={d.status === 'Paid' ? '#10b981' : d.status === 'Partial' ? '#f59e0b' : '#f43f5e'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1e27', border: '1px solid #252a36', borderRadius: 8, fontSize: 11 }} formatter={(v, _, p) => [v + ' job cards', p.payload.status]} />
              </PieChart>
              <div className="space-y-2">
                {data.payment_dist.map((d) => (
                  <div key={d.status} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.status === 'Paid' ? '#10b981' : d.status === 'Partial' ? '#f59e0b' : '#f43f5e' }} />
                    <span className="text-gray-300">{d.status}</span>
                    <span className="text-gray-500 ml-1">{d.count} cards</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
        </ChartCard>
      </div>
    </div>
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
