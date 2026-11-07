import { useQuery } from '@tanstack/react-query';
import { getEquipmentAvailability } from '../../api/equipment';
import { format, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import Spinner from '../common/Spinner';

const AvailabilityCalendar = ({ equipmentId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['availability', equipmentId],
    queryFn: () => getEquipmentAvailability(equipmentId).then((r) => r.data.bookedDates),
  });

  if (isLoading) return <Spinner />;

  const bookedRanges = data || [];

  // Check if a given date falls within any booked range
  const isBooked = (date) =>
    bookedRanges.some((range) =>
      isWithinInterval(date, {
        start: parseISO(range.startDate),
        end: parseISO(range.endDate),
      })
    );

  // Show current month and next month
  const today = new Date();
  const monthDays = eachDayOfInterval({
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Availability — {format(today, 'MMMM yyyy')}
      </h4>
      <div className="grid grid-cols-7 gap-1 text-xs text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="font-medium text-gray-500 py-1">{d}</div>
        ))}
        {/* Empty cells for first day offset */}
        {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
        {monthDays.map((day) => {
          const booked = isBooked(day);
          const past = day < today;
          return (
            <div
              key={day.toISOString()}
              className={`py-1 rounded text-xs font-medium
                ${past ? 'text-gray-300' :
                booked ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'}`}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded inline-block" /> Booked</span>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
