import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getFarmerStats } from '../../api/dashboard';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';

const FarmerDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['farmer-stats'],
    queryFn: () => getFarmerStats().then((r) => r.data),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button as={Link} to="/farmer/browse">Browse Equipment</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Reservations" value={data?.totalReservations || 0} icon="📋" />
        <StatsCard title="Active Rentals" value={data?.activeRentals || 0} icon="🚜" color="green" />
        <StatsCard title="Pending" value={data?.pendingReservations || 0} icon="⏳" color="orange" />
        <StatsCard title="Total Spent" value={`₱${(data?.totalSpent || 0).toLocaleString()}`} icon="💰" color="purple" />
      </div>

      <RecentActivity reservations={data?.recentReservations || []} />
    </div>
  );
};

export default FarmerDashboard;
