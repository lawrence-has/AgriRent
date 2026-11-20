import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';
import Badge from '../common/Badge';
import useAuthStore from '../../store/authStore';

const RecentActivity = ({ reservations = [], viewAllLink }) => {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Default "view all" link by role
  const defaultLink =
    user?.role === 'farmer' ? '/farmer/reservations' :
    user?.role === 'owner' ? '/owner/reservations' :
    '/admin/reservations';

  const allLink = viewAllLink || defaultLink;
  const statuses = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];
  const filteredReservations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
      const matchesSearch = !term || [
        reservation.equipment?.name,
        reservation.farmer?.name,
        reservation.status,
      ].some((value) => value?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [reservations, search, statusFilter]);
  const statusColors = {
    pending: '#d7ab51',
    confirmed: '#7694a8',
    active: '#719263',
    completed: '#a7aa9e',
    cancelled: '#c87d68',
  };
  const statusSummary = statuses
    .filter((status) => status !== 'all')
    .map((status) => ({
      status,
      count: reservations.filter((reservation) => reservation.status === status).length,
    }))
    .filter(({ count }) => count > 0);

  const reservationLink = (reservation) => user?.role === 'farmer'
    ? `/farmer/reservations/${reservation.id}`
    : allLink;

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
        <>
          <div className="mb-4 rounded-xl bg-[#f8f8f3] px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#7b8374]">Recent reservation mix</p>
              <span className="text-[10px] text-[#9a9e93]">Latest {reservations.length}</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#e9e9e1]" role="group" aria-label="Filter by recent reservation status">
              {statusSummary.map(({ status, count }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                  title={`${count} ${status}`}
                  aria-label={`Show ${count} ${status} reservations`}
                  aria-pressed={statusFilter === status}
                  style={{ width: `${(count / reservations.length) * 100}%`, backgroundColor: statusColors[status] }}
                  className={`min-w-[6px] transition-all duration-300 hover:brightness-110 ${statusFilter === status ? 'ring-2 ring-inset ring-white' : ''}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
              {statusSummary.map(({ status, count }) => (
                <button key={status} type="button" onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)} aria-pressed={statusFilter === status} className="inline-flex items-center gap-1.5 text-[10px] capitalize text-[#747a6f] transition hover:text-[#293b2d]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />{status} <span className="font-bold tabular-nums">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter recent reservations by status">
              {statuses.filter((status) => status === 'all' || reservations.some((reservation) => reservation.status === status)).map((status) => {
                const count = status === 'all' ? reservations.length : reservations.filter((reservation) => reservation.status === status).length;
                return <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${statusFilter === status ? 'bg-primary-100 text-primary-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                  {status} <span className="ml-0.5 opacity-70">{count}</span>
                </button>;
              })}
            </div>
            <label className="relative block sm:w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find recent activity" aria-label="Search recent reservations" className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-8 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear activity search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"><X size={13} /></button>}
            </label>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-7 text-center">
              <p className="text-sm font-medium text-gray-600">No matching activity</p>
              <p className="mt-1 text-xs text-gray-400">Try a different status or search term.</p>
            </div>
          ) : <div className="divide-y divide-gray-50">
          {filteredReservations.map((r) => (
            <Link
              key={r.id}
              to={reservationLink(r)}
              className="group flex items-center justify-between gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-primary-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
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
              <ArrowUpRight size={15} className="shrink-0 text-gray-300 transition group-hover:text-primary-600" aria-hidden="true" />
            </Link>
          ))}
          </div>}
        </>
      )}
    </div>
  );
};

export default RecentActivity;
