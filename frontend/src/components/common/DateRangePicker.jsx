import Input from './Input';

const DateRangePicker = ({ startDate, endDate, onStartChange, onEndChange, minDate, disabledRanges = [] }) => {
  const today = minDate || new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        min={today}
      />
      <Input
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        min={startDate || today}
      />
    </div>
  );
};

export default DateRangePicker;
