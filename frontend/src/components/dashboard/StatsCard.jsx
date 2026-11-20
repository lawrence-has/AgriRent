import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';

const colorMap = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-100', rail: 'bg-primary-600' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100', rail: 'bg-blue-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100', rail: 'bg-orange-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100', rail: 'bg-purple-500' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100', rail: 'bg-green-600' },
};

const StatsCard = ({ title, value, icon: Icon, color = 'primary', subtitle, onClick, to }) => {
  const c = colorMap[color] || colorMap.primary;
  const rawValue = String(value ?? 0);
  const valueParts = rawValue.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const numericValue = valueParts ? Number(valueParts[2].replaceAll(',', '')) : Number(value);
  const animatedValue = useCountUp(numericValue);
  const decimals = valueParts?.[2].split('.')[1]?.length || 0;
  const displayValue = valueParts
    ? `${valueParts[1]}${animatedValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${valueParts[3]}`
    : rawValue;

  const inner = (
    <div className="relative h-full overflow-hidden rounded-2xl border border-[#e7e5da] bg-[#fffefa]/95 p-4 pl-5 shadow-[0_10px_28px_rgba(35,49,34,0.05)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#d6ddc9] group-hover:shadow-[0_18px_38px_rgba(35,49,34,0.11)] sm:p-5 sm:pl-6">
      <span className={`absolute bottom-5 left-0 top-5 w-1 rounded-r-full ${c.rail}`} aria-hidden="true" />
      <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#f4f1e7] opacity-60 transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-[#273a2c] mt-1 truncate tabular-nums" aria-label={`${title}: ${rawValue}`}>{displayValue}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`relative z-[1] p-2.5 sm:p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-110 ${c.bg} ${c.text} border ${c.border}`}>
          {Icon && <Icon size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />}
        </div>
      </div>
      {(to || onClick) && <ArrowUpRight size={15} className="absolute bottom-4 right-4 text-[#9aa28f] opacity-0 -translate-x-1 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" aria-hidden="true" />}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block rounded-2xl text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2" aria-label={`${title}: ${value}. Open details`}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left w-full group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label={`${title}: ${value}`}
      >
        {inner}
      </button>
    );
  }

  return inner;
};

export default StatsCard;

