import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, ArrowRight } from 'lucide-react';
import Badge from '../common/Badge';
import useAuthStore from '../../store/authStore';

const RecentActivity = ({ reservations = [], viewAllLink }) => {
  const { user } = useAuthStore();

  // Default "view all" link by role
  const defaultLink =
    user?.role === 'farmer' ? '/farmer/reservations' :
    user?.role === 'owner' ? '/owner/reservations' :
    '/admin/reservations';

  const allLink = viewAllLink || defaultLink;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Recent Reservations</h3>
        <Link
          to={allLink}
          className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium"
          aria-label="View all reservations"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays size={32} className="text-gray-200 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-400">No recent reservations</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-3 gap-3 text-sm hover:bg-gray-50 rounded-lg px-1 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">
                  {r.equipment?.name || 'Equipment'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {r.farmer?.name && `${r.farmer.name} · `}
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Badge label={r.status} />
                {r.totalCost && (
                  <span className="text-xs text-gray-500 hidden sm:block">
                    ₱{parseFloat(r.totalCost).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
