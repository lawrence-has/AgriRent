import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getReservations } from '../../api/reservations';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';

const ReservationManagement = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: () => getReservations({ limit: 50 }).then((r) => r.data),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">All Reservations</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Equipment', 'Farmer', 'Dates', 'Cost', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.reservations?.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.equipment?.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.farmer?.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-primary-600 font-medium">₱{parseFloat(r.totalCost).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge label={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReservationManagement;
