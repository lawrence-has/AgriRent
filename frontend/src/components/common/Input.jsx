import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      ref={ref}
      className={`w-full min-w-0 border rounded-xl px-3.5 py-2.5 text-sm min-h-10 bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
        ${error ? 'border-red-400 bg-red-50 focus:ring-red-500/10 focus:border-red-500' : 'border-gray-200 shadow-sm'}
        ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-600">{error}</span>}
  </div>
));

Input.displayName = 'Input';
export default Input;
