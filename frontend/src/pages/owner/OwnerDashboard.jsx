import { useQuery } from '@tanstack/react-query';
import { getOwnerStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';

const OwnerDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['owner-stats'],
    queryFn: () => getOwnerStats().then((r) => r.data),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="My Equipment" value={data?.totalEquipment || 0} icon="🚜" />
        <StatsCard title="Active Rentals" value={data?.activeRentals || 0} icon="✅" color="green" />
        <StatsCard title="Pending Requests" value={data?.pendingRequests || 0} icon="⏳" color="orange" />
        <StatsCard title="Completed" value={data?.completedRentals || 0} icon="🏁" color="blue" />
        <StatsCard title="Total Revenue" value={`₱${(data?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="purple" />
      </div>

      <RecentActivity reservations={data?.recentReservations || []} />
    </div>
  );
};

export default OwnerDashboard;
