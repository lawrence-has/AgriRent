import { formatDistanceToNow } from 'date-fns';
import Badge from '../common/Badge';

const RecentActivity = ({ reservations = [] }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <h3 className="font-semibold text-gray-800 mb-4">Recent Reservations</h3>
    {reservations.length === 0 ? (
      <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
    ) : (
      <div className="space-y-3">
        {reservations.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-800">{r.equipment?.name || 'Equipment'}</p>
              <p className="text-xs text-gray-500">
                {r.farmer?.name || 'Farmer'} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </p>
            </div>
            <Badge label={r.status} />
          </div>
        ))}
      </div>
    )}
  </div>
);

export default RecentActivity;
