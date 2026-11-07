import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminStats().then((r) => r.data),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={data?.totalUsers || 0} icon="👥" color="blue" />
        <StatsCard title="Total Equipment" value={data?.totalEquipment || 0} icon="🚜" />
        <StatsCard title="Total Reservations" value={data?.totalReservations || 0} icon="📋" color="purple" />
        <StatsCard title="Active Rentals" value={data?.activeRentals || 0} icon="✅" color="green" />
      </div>

      <RecentActivity reservations={data?.recentReservations || []} />
    </div>
  );
};

export default AdminDashboard;
