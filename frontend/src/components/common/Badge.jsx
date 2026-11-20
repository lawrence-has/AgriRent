const colors = {
  pending: 'bg-[#fbf1dc] text-[#8a641e] border-[#eddbb4]',
  confirmed: 'bg-[#e8f0f5] text-[#42637a] border-[#d1e0e9]',
  active: 'bg-[#e9f1e4] text-[#45683b] border-[#d5e3cc]',
  completed: 'bg-[#f0f0eb] text-[#666b60] border-[#e3e3dc]',
  cancelled: 'bg-[#f8e9e5] text-[#984d3b] border-[#efd3ca]',
  available: 'bg-[#e9f1e4] text-[#45683b] border-[#d5e3cc]',
  rented: 'bg-[#f8eddf] text-[#94602c] border-[#ead8bd]',
  maintenance: 'bg-[#fbf1dc] text-[#8a641e] border-[#eddbb4]',
  archived: 'bg-[#f0f0eb] text-[#666b60] border-[#e3e3dc]',
  released: 'bg-[#e8f0f5] text-[#42637a] border-[#d1e0e9]',
  returned: 'bg-[#e9f1e4] text-[#45683b] border-[#d5e3cc]',
  farmer: 'bg-[#e9f1e4] text-[#45683b] border-[#d5e3cc]',
  owner: 'bg-[#f5eddf] text-[#86633a] border-[#e9dcc5]',
  admin: 'bg-[#eeeaf4] text-[#65517c] border-[#ded5eb]',
};

const Badge = ({ label, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize tracking-[0.01em]
    ${colors[label] || 'bg-[#f0f0eb] text-[#666b60] border-[#e3e3dc]'} ${className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
    {label}
  </span>
);

export default Badge;
