import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tractor, CheckCircle, Clock, Flag, DollarSign, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { getOwnerStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import useAuthStore from '../../store/authStore';

const OwnerDashboard = () => {
  const user = useAuthStore((state) => state.user);
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
      <div className="agri-hero px-5 py-6 sm:px-8 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="agri-eyebrow">Owner workspace <span className="mx-1.5 text-[#d7bd78]">✦</span> Farm operations</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#fffdf5]">Grow your equipment business.</h1>
          <p className="text-sm text-white/70 mt-2">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Manage your equipment and track rentals.</p>
        </div>
        <Button as={Link} to="/owner/equipment" className="shrink-0 border border-white/30 bg-white/10 text-white shadow-none hover:border-white/50 hover:bg-white/20">
          <Plus size={15} /> Add Equipment
        </Button>
      </div>

      {/* Stats — responsive: 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCard title="My Equipment" value={data?.totalEquipment ?? 0} icon={Tractor} to="/owner/equipment" />
        <StatsCard title="Active Rentals" value={data?.activeRentals ?? 0} icon={CheckCircle} color="green" to="/owner/transactions" />
        <StatsCard
          title="Pending Requests"
          value={data?.pendingRequests ?? 0}
          icon={Clock}
          color="orange"
          subtitle={data?.pendingRequests > 0 ? 'Needs your action' : undefined}
          to="/owner/reservations"
        />
        <StatsCard title="Completed" value={data?.completedRentals ?? 0} icon={Flag} color="blue" to="/owner/transactions" />
        <StatsCard
          title="Total Revenue"
          value={`₱${(data?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Alert if pending requests exist */}
      {(data?.pendingRequests ?? 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800 font-medium">
              You have {data.pendingRequests} pending reservation request{data.pendingRequests > 1 ? 's' : ''} waiting for your response.
            </p>
          </div>
          <Button as={Link} to="/owner/reservations" size="sm" variant="outline" className="w-full shrink-0 sm:w-auto">
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
          className="group rounded-2xl border border-[#e7e5da] bg-[#fffefa]/90 p-4 shadow-[0_9px_24px_rgba(35,49,34,0.045)] transition-all hover:-translate-y-1 hover:border-primary-200 hover:bg-white hover:shadow-[0_18px_36px_rgba(35,49,34,0.10)]"
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
