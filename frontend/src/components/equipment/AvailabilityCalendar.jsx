import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEquipmentAvailability } from '../../api/equipment';
import { format, eachDayOfInterval, parseISO, isWithinInterval, startOfMonth, endOfMonth, addMonths, subMonths, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from '../common/Spinner';

const AvailabilityCalendar = ({ equipmentId }) => {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
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
  const monthStart = startOfMonth(visibleMonth);
  const monthDays = eachDayOfInterval({
    start: monthStart,
    end: endOfMonth(visibleMonth),
  });

  const getDayClass = (day) => {
    if (isBefore(day, new Date(today.getFullYear(), today.getMonth(), today.getDate()))) return 'text-[#c5c8bd]';
    if (isHardBlocked(day)) return 'bg-[#f8e9e5] text-[#984d3b] hover:bg-[#f1d7d0]';
    if (isSoftBlocked(day)) return 'bg-[#fbf1dc] text-[#8a641e] hover:bg-[#f3e4bf]';
    return 'bg-[#e9f1e4] text-[#45683b] hover:bg-[#d8e7cf]';
  };

  const getDayLabel = (day) => {
    if (isHardBlocked(day)) return 'Booked';
    if (isSoftBlocked(day)) return 'Pending request';
    return 'Available';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#87907e]">Availability calendar</p>
          <h4 className="mt-0.5 text-base font-bold text-[#2b3d2d]">{format(visibleMonth, 'MMMM yyyy')}</h4>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setVisibleMonth((month) => subMonths(month, 1))} aria-label="Previous month" className="rounded-xl border border-[#e7e5da] bg-white p-2 text-[#687361] transition hover:bg-[#f0f3e9] hover:text-[#294331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} aria-label="Next month" className="rounded-xl border border-[#e7e5da] bg-white p-2 text-[#687361] transition hover:bg-[#f0f3e9] hover:text-[#294331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center" aria-label={`Equipment availability for ${format(visibleMonth, 'MMMM yyyy')}`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#969a8e]">{d}</div>
        ))}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {monthDays.map((day) => (
          <div
            key={day.toISOString()}
            title={`${format(day, 'MMMM d')}: ${getDayLabel(day)}`}
            aria-label={`${format(day, 'MMMM d')}: ${getDayLabel(day)}`}
            className={`grid aspect-square place-items-center rounded-xl text-xs font-semibold transition-colors ${getDayClass(day)}`}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#eeede5] pt-3 text-[11px] font-medium text-[#737a6d]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#86a875]" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d7ab51]" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#c87d68]" /> Booked
        </span>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
