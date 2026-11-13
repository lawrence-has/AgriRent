import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tractor, CheckCircle, Clock, Flag, DollarSign, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { getOwnerStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';

const OwnerDashboard = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['owner-stats'],
    queryFn: () => getOwnerStats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse h-24" />
          ))}
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Failed to load dashboard</p>
            <p className="text-sm text-red-600 mt-1">{error?.message || 'Please try again.'}</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3 flex items-center gap-1">
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your equipment and track rentals.</p>
        </div>
        <Button as={Link} to="/owner/equipment" className="shrink-0">
          <Plus size={15} /> Add Equipment
        </Button>
      </div>

      {/* Stats — responsive: 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCard title="My Equipment" value={data?.totalEquipment ?? 0} icon={Tractor} />
        <StatsCard title="Active Rentals" value={data?.activeRentals ?? 0} icon={CheckCircle} color="green" />
        <StatsCard
          title="Pending Requests"
          value={data?.pendingRequests ?? 0}
          icon={Clock}
          color="orange"
          subtitle={data?.pendingRequests > 0 ? 'Needs your action' : undefined}
        />
        <StatsCard title="Completed" value={data?.completedRentals ?? 0} icon={Flag} color="blue" />
        <StatsCard
          title="Total Revenue"
          value={`₱${(data?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Alert if pending requests exist */}
      {(data?.pendingRequests ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800 font-medium">
              You have {data.pendingRequests} pending reservation request{data.pendingRequests > 1 ? 's' : ''} waiting for your response.
            </p>
          </div>
          <Button as={Link} to="/owner/reservations" size="sm" variant="outline" className="shrink-0">
            Review
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Manage Reservations', to: '/owner/reservations', desc: 'Confirm or reject requests' },
          { label: 'Transactions', to: '/owner/transactions', desc: 'Release & return tracking' },
          { label: 'Messages', to: '/chat', desc: 'Chat with farmers' },
        ].map(({ label, to, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm hover:border-primary-200 transition-all"
          >
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      <RecentActivity reservations={data?.recentReservations || []} />
    </div>
  );
};

export default OwnerDashboard;
