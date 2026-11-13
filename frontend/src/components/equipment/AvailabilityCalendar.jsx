import { useQuery } from '@tanstack/react-query';
import { getEquipmentAvailability } from '../../api/equipment';
import { format, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import Spinner from '../common/Spinner';

const AvailabilityCalendar = ({ equipmentId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['availability', equipmentId],
    queryFn: () => getEquipmentAvailability(equipmentId).then((r) => r.data.bookedDates),
    enabled: !!equipmentId,
    staleTime: 1000 * 60, // 1 minute — availability can change frequently
  });

  if (isLoading) return <div className="py-4"><Spinner /></div>;

  if (isError) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-500">Could not load availability. Please refresh.</p>
      </div>
    );
  }

  const bookedRanges = data || [];

  // Separate hard blocks (confirmed/active) from soft blocks (pending)
  // Backend C6 now returns isHardBlock field
  const isHardBlocked = (date) =>
    bookedRanges
      .filter((r) => r.isHardBlock !== false) // treat missing field as hard block (backwards compat)
      .some((range) =>
        isWithinInterval(date, {
          start: parseISO(range.startDate),
          end: parseISO(range.endDate),
        })
      );

  const isSoftBlocked = (date) =>
    bookedRanges
      .filter((r) => r.isHardBlock === false) // pending only
      .some((range) =>
        isWithinInterval(date, {
          start: parseISO(range.startDate),
          end: parseISO(range.endDate),
        })
      );

  const today = new Date();
  const monthDays = eachDayOfInterval({
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  });

  const getDayClass = (day) => {
    if (day < today) return 'text-gray-300 cursor-default';
    if (isHardBlocked(day)) return 'bg-red-100 text-red-700';
    if (isSoftBlocked(day)) return 'bg-yellow-100 text-yellow-700'; // pending — might open up
    return 'bg-green-100 text-green-700';
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Availability — {format(today, 'MMMM yyyy')}
      </h4>
      <div className="grid grid-cols-7 gap-1 text-xs text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="font-medium text-gray-500 py-1">{d}</div>
        ))}
        {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {monthDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`py-1 rounded text-xs font-medium ${getDayClass(day)}`}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 rounded inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-100 rounded inline-block" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 rounded inline-block" /> Booked
        </span>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
