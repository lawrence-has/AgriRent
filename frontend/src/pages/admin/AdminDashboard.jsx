import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Tractor, ClipboardList, CheckCircle,
  Clock, Flag, AlertCircle, RefreshCw,
} from 'lucide-react';
import { getAdminStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';

const AdminDashboard = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminStats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide overview and management.</p>
      </div>

      {/* Primary stats — 2 cols mobile, 4 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard title="Total Users" value={data?.totalUsers ?? 0} icon={Users} color="blue" />
        <StatsCard title="Total Equipment" value={data?.totalEquipment ?? 0} icon={Tractor} />
        <StatsCard title="Total Reservations" value={data?.totalReservations ?? 0} icon={ClipboardList} color="purple" />
        <StatsCard title="Active Rentals" value={data?.activeRentals ?? 0} icon={CheckCircle} color="green" />
      </div>

      {/* Secondary stats from C5 updated backend */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatsCard
          title="Pending Reservations"
          value={data?.pendingReservations ?? 0}
          icon={Clock}
          color="orange"
          subtitle={data?.pendingReservations > 0 ? 'Awaiting owner action' : undefined}
        />
        <StatsCard
          title="Completed Rentals"
          value={data?.completedRentals ?? 0}
          icon={Flag}
          color="blue"
        />
        <StatsCard
          title="Cancellations"
          value={((data?.totalReservations ?? 0) - (data?.activeRentals ?? 0) - (data?.completedRentals ?? 0) - (data?.pendingReservations ?? 0))}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Quick admin links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'User Management', to: '/admin/users', desc: `${data?.totalUsers ?? 0} accounts` },
          { label: 'Equipment', to: '/admin/equipment', desc: `${data?.totalEquipment ?? 0} listed` },
          { label: 'Reservations', to: '/admin/reservations', desc: 'View all bookings' },
          { label: 'Archive', to: '/admin/archive', desc: 'Archived records' },
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

export default AdminDashboard;
