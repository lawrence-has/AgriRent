const colorMap = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-100' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100' },
};

const StatsCard = ({ title, value, icon: Icon, color = 'primary', subtitle, onClick }) => {
  const c = colorMap[color] || colorMap.primary;

  const inner = (
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
          {Icon && <Icon size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left w-full hover:shadow-md transition-shadow rounded-xl"
        aria-label={`${title}: ${value}`}
      >
        {inner}
      </button>
    );
  }

  return inner;
};

export default StatsCard;
