import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Filter, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import { Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listJobCards, listJobCardsByType } from '../../api/jobcards';
import { extractError } from '../../api/axios';
import { jobCardTotal } from '../../utils/jobcard';
import { AddPaymentModal } from './Detail';
export default function JobCardsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ active: 0, completed: 0, twoWheeler: 0, fourWheeler: 0, threeWheeler: 0 });
  const [paymentModal, setPaymentModal] = useState(false);
  const [payJobCard, setPayJobCard] = useState(null);


  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const params = statusFilter ? { status: statusFilter } : undefined;
        const [jobsData, twoWheeler, fourWheeler, threeWheeler, active, completed] =
          await Promise.all([
            listJobCards(params),
            listJobCardsByType('two_wheeler'),
            listJobCardsByType('four_wheeler'),
            listJobCardsByType('three_wheeler'),
            listJobCards({ status: 'IN_PROGRESS' }),
            listJobCards({ status: 'COMPLETED' }),
          ]);
        setJobs(Array.isArray(jobsData) ? jobsData : (jobsData.results || []));
        setStats({
          twoWheeler: twoWheeler.count,
          fourWheeler: fourWheeler.count,
          threeWheeler: threeWheeler.count,
          active: Array.isArray(active) ? active.length : (active.count || 0),
          completed: Array.isArray(completed) ? completed.length : (completed.count || 0),
        });
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [statusFilter]);


  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const s = search.toLowerCase();
    return jobs.filter((j) =>
      (j.job_card_number || '').toLowerCase().includes(s) ||
      (j.customer_name || '').toLowerCase().includes(s) ||
      (j.vehicle_number || '').toLowerCase().includes(s)
    );
  }, [jobs, search]);

  const columns = [
    { key: 'job_card_number', header: 'Job Card #', render: (r) => <span className="font-medium text-gray-100">{r.job_card_number}</span> },
    { key: 'customer_name', header: 'Customer' },
    { key: 'vehicle_number', header: 'Vehicle' },
    { key: 'job_card_date', header: 'Date' },
    {
      key: 'total_price',
      header: 'Total',
      render: (r) => `₹${jobCardTotal(r).toLocaleString('en-IN')}`,
    },
    {
      key: 'job_card_status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.job_card_status === 'COMPLETED' ? 'green' : 'yellow'}>
          {r.job_card_status === 'COMPLETED' ? 'Completed' : 'In Progress'}
        </Badge>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (r) => (
        <Button onClick={(e) => { e.stopPropagation(); setPayJobCard(r); }}>Pay Now </Button>
      ),
    }
  ];

  return (
    <div>
      <PageHeader
        title="Job Cards"
        subtitle="Track every vehicle that comes through your workshop"
        actions={
          <Link to="/jobcards/new">
            <Button><Plus size={16} /> New Job Card</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <StatCard label="Two Wheelers" value={stats.twoWheeler} onClick={() => navigate('/jobcards/by-vehicle/two_wheeler')} />
        <StatCard label="Three Wheelers" value={stats.threeWheeler} onClick={() => navigate('/jobcards/by-vehicle/three_wheeler')} />
        <StatCard label="Four Wheelers" value={stats.fourWheeler} onClick={() => navigate('/jobcards/by-vehicle/four_wheeler')} />
        <StatCard label="In Progress" value={stats.active} />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by job card #, customer, or vehicle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-56">
          <Filter size={14} className="text-gray-500 shrink-0" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>
        <AddPaymentModal
          open={!!payJobCard}
          onClose={() => setPayJobCard(null)}
          jobCardId={payJobCard?.id}
          outstanding={payJobCard?.outstanding}
          onAdded={() => { /* reload your jobs list */ }}
        />

      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No job cards found"
          message={search || statusFilter ? 'Try adjusting your filters.' : 'Get started by creating your first job card.'}
          action={
            <Link to="/jobcards/new"><Button><Plus size={16} /> New Job Card</Button></Link>
          }
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          onRowClick={(r) => navigate(`/jobcards/${r.id}`)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, onClick }) {
  return (
    <div className={`bg-bg-card border border-border rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-gray-500' : ''}`} onClick={onClick}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-100 mt-1">{value}</div>
    </div>
  );
}
