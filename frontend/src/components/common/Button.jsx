/**
 * Button component — supports `as` prop for rendering as Link or any element.
 *
 * Usage:
 *   <Button>Submit</Button>
 *   <Button as={Link} to="/path">Navigate</Button>
 *   <Button variant="danger" size="sm">Delete</Button>
 */
import { forwardRef } from 'react';

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800',
  danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  outline:   'border border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100',
  ghost:     'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  type = 'button',
  onClick,
  as: Component,
  ...props
}, ref) => {
  const baseClass = `inline-flex items-center justify-center rounded-lg font-medium transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]} ${sizes[size]} ${className}`;

  // Render as custom component (e.g. Link) when `as` prop is provided
  if (Component) {
    return (
      <Component ref={ref} className={baseClass} {...props}>
        {loading && <Spinner />}
        {children}
      </Component>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={disabled || loading ? 'true' : undefined}
      className={baseClass}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
