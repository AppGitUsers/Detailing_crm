import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ClipboardList, Plus, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import { Input } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listJobCardsByTypeList } from '../../api/jobcards';
import { extractError } from '../../api/axios';
import { jobCardTotal } from '../../utils/jobcard';

const VEHICLE_LABELS = {
  two_wheeler: 'Two Wheelers',
  three_wheeler: 'Three Wheelers',
  four_wheeler: 'Four Wheelers',
};

export default function JobCardsByVehicle() {
  const { vehicleType } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  const label = VEHICLE_LABELS[vehicleType] || vehicleType;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listJobCardsByTypeList(vehicleType);
        setJobs(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [vehicleType]);

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
  ];

  return (
    <div>
      <PageHeader
        title={`Job Cards — ${label}`}
        subtitle={`All job cards for ${label.toLowerCase()}`}
        actions={
          <Link to="/jobcards">
            <Button variant="secondary"><ChevronLeft size={16} /> Back to Job Cards</Button>
          </Link>
        }
      />

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by job card #, customer, or vehicle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No ${label.toLowerCase()} job cards found`}
          message={search ? 'Try adjusting your search.' : `No job cards have been created for ${label.toLowerCase()} yet.`}
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
