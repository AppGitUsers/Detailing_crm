import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ClipboardList, Filter, Pencil, Plus, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import Table from '../../components/Table';
import { Input, Select } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { listJobCardsByTypeList } from '../../api/jobcards';
import { listVehicleCompanies, listVehicleModels } from '../../api/customers';
import { extractError } from '../../api/axios';
import { jobCardTotal } from '../../utils/jobcard';

const VEHICLE_LABELS = {
  two_wheeler:   'Two Wheelers',
  three_wheeler: 'Three Wheelers',
  four_wheeler:  'Four Wheelers',
};

export default function JobCardsByVehicle() {
  const { vehicleType } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading]           = useState(true);
  const [jobs, setJobs]                 = useState([]);
  const [search, setSearch]             = useState('');
  const [dateFilter, setDateFilter]     = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [modelFilter, setModelFilter]   = useState('');
  const [companies, setCompanies]       = useState([]);
  const [models, setModels]             = useState([]);

  const label = VEHICLE_LABELS[vehicleType] || vehicleType;

  // Load companies filtered by this vehicle type
  useEffect(() => {
    listVehicleCompanies({ vehicle_type: vehicleType })
      .then(d => setCompanies(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [vehicleType]);

  // Reload models when company filter changes
  useEffect(() => {
    if (!companyFilter) { setModels([]); return; }
    listVehicleModels({ company: companyFilter })
      .then(d => setModels(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [companyFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (dateFilter)    params.date    = dateFilter;
        if (companyFilter) params.company = companyFilter;
        if (modelFilter)   params.model   = modelFilter;
        const data = await listJobCardsByTypeList(vehicleType, Object.keys(params).length ? params : undefined);
        setJobs(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [vehicleType, dateFilter, companyFilter, modelFilter]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const s = search.toLowerCase();
    return jobs.filter((j) =>
      (j.job_card_number || '').toLowerCase().includes(s) ||
      (j.customer_name   || '').toLowerCase().includes(s) ||
      (j.vehicle_number  || '').toLowerCase().includes(s) ||
      (j.vehicle_company || '').toLowerCase().includes(s) ||
      (j.vehicle_model   || '').toLowerCase().includes(s)
    );
  }, [jobs, search]);

  const columns = [
    {
      key: 'job_card_number',
      header: 'Job Card #',
      render: (r) => <span className="font-medium text-gray-100">{r.job_card_number}</span>,
    },
    { key: 'customer_name', header: 'Customer' },
    {
      key: 'vehicle_number',
      header: 'Vehicle',
      render: (r) => (
        <div className="leading-tight">
          <div className="text-gray-100">{r.vehicle_number}</div>
          {(r.vehicle_company || r.vehicle_model) && (
            <div className="text-[10px] text-gray-500 mt-0.5">
              {[r.vehicle_company, r.vehicle_model, r.vehicle_colour].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'employee_name',
      header: 'Employee',
      render: (r) => r.employee_name
        ? <span className="text-gray-200">{r.employee_name}</span>
        : <span className="text-gray-600 text-xs">—</span>,
    },
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
      key: 'edit',
      header: '',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); navigate(`/jobcards/${r.id}/edit`); }}
          title="Edit job card"
        >
          <Pencil size={13} />
        </Button>
      ),
    },
  ];

  const hasFilter = !!(dateFilter || companyFilter || modelFilter);

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

      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        {/* Row 1: search + date */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by job card #, customer, or vehicle"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="sm:w-44"
            title="Filter by date"
          />
        </div>
        {/* Row 2: company + model */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Filter size={14} className="text-gray-500 shrink-0 hidden sm:block" />
          <Select
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setModelFilter(''); }}
            className="sm:w-52"
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="sm:w-48"
            disabled={!companyFilter}
          >
            <option value="">{companyFilter ? 'All Models' : 'Select company first'}</option>
            {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </Select>
          {hasFilter && (
            <button
              type="button"
              onClick={() => { setDateFilter(''); setCompanyFilter(''); setModelFilter(''); }}
              className="text-xs text-gray-400 hover:text-gray-200 underline shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No ${label.toLowerCase()} job cards found`}
          message={search || hasFilter ? 'Try adjusting your filters.' : `No job cards for ${label.toLowerCase()} yet.`}
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
