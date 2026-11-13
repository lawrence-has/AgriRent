import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Tractor, Clock, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { getFarmerStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';

const FarmerDashboard = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['farmer-stats'],
    queryFn: () => getFarmerStats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Failed to load dashboard</p>
            <p className="text-sm text-red-600 mt-1">{error?.message || 'Please try again.'}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 flex items-center gap-1"
            >
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with quick action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's your rental overview.</p>
        </div>
        <Button as={Link} to="/farmer/browse" className="shrink-0">
          <Tractor size={15} /> Browse Equipment
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Reservations"
          value={data?.totalReservations ?? 0}
          icon={ClipboardList}
          color="primary"
        />
        <StatsCard
          title="Active Rentals"
          value={data?.activeRentals ?? 0}
          icon={Tractor}
          color="green"
        />
        <StatsCard
          title="Pending"
          value={data?.pendingReservations ?? 0}
          icon={Clock}
          color="orange"
          subtitle={data?.pendingReservations > 0 ? 'Awaiting confirmation' : undefined}
        />
        <StatsCard
          title="Total Spent"
          value={`₱${(data?.totalSpent ?? 0).toLocaleString()}`}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'View My Reservations', to: '/farmer/reservations', desc: 'Track your bookings' },
          { label: 'My Rentals', to: '/farmer/rentals', desc: 'Release & return records' },
          { label: 'Messages', to: '/chat', desc: 'Chat with equipment owners' },
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

export default FarmerDashboard;
