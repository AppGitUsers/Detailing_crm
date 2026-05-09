import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, IndianRupee, AlertTriangle, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { listJobCards } from '../../api/jobcards';
import { listCustomers } from '../../api/customers';
import { listInventory } from '../../api/inventory';
import { extractError } from '../../api/axios';
import { jobCardTotal } from '../../utils/jobcard';

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, customers: 0, revenue: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [active, completed, customers, lowStockItems] = await Promise.all([
          listJobCards({ status: 'IN_PROGRESS' }),
          listJobCards({ status: 'COMPLETED' }),
          listCustomers(),
          listInventory({ low_stock: 'true' }),
        ]);
        if (cancelled) return;
        const activeArr = Array.isArray(active) ? active : (active.results || []);
        const completedArr = Array.isArray(completed) ? completed : (completed.results || []);
        const customersArr = Array.isArray(customers) ? customers : (customers.results || []);
        const lowArr = Array.isArray(lowStockItems) ? lowStockItems : (lowStockItems.results || []);
        const revenue = completedArr.reduce((sum, j) => sum + jobCardTotal(j), 0);
        const recent = [...activeArr, ...completedArr]
          .sort((a, b) => new Date(b.job_card_date || 0) - new Date(a.job_card_date || 0))
          .slice(0, 6);
        setStats({ active: activeArr.length, customers: customersArr.length, revenue });
        setRecentJobs(recent);
        setLowStock(lowArr);
      } catch (err) {
        if (!cancelled) toast.error(extractError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your detailing workshop" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Active Job Cards" value={stats.active} accent="yellow" loading={loading} />
        <StatCard icon={Users} label="Customers" value={stats.customers} accent="blue" loading={loading} />
        <StatCard icon={IndianRupee} label="Revenue (Completed)" value={formatCurrency(stats.revenue)} accent="green" loading={loading} />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length} accent="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-100">Recent Job Cards</h2>
            <Link to="/jobcards" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <Loading />
          ) : recentJobs.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No job cards yet" message="Create your first job card to get started." />
          ) : (
            <div className="divide-y divide-border">
              {recentJobs.map((j) => (
                <Link
                  to={`/jobcards/${j.id}`}
                  key={j.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">{j.job_card_number}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {j.customer_name || '—'} · {j.vehicle_number || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{j.job_card_date}</span>
                    <Badge variant={j.job_card_status === 'COMPLETED' ? 'green' : 'yellow'}>
                      {j.job_card_status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-100">Low Stock Alerts</h2>
            <Link to="/vendors/inventory" className="text-xs text-accent hover:underline flex items-center gap-1">
              Inventory <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <Loading />
          ) : lowStock.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="All stocked up" message="No items below threshold." />
          ) : (
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {lowStock.map((item) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="text-sm font-medium text-red-300">{item.product_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.quantity_available} {item.unit} available · threshold {item.minimum_threshold}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
