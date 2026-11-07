const colors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  available: 'bg-green-100 text-green-800',
  rented: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-600',
  released: 'bg-blue-100 text-blue-800',
  returned: 'bg-green-100 text-green-800',
  farmer: 'bg-emerald-100 text-emerald-800',
  owner: 'bg-indigo-100 text-indigo-800',
  admin: 'bg-purple-100 text-purple-800',
};

const Badge = ({ label, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
    ${colors[label] || 'bg-gray-100 text-gray-800'} ${className}`}>
    {label}
  </span>
);

export default Badge;
