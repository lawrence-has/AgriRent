import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tractor, CalendarDays, ClipboardList,
  Users, MessageSquare, X, BarChart3, Wheat, Archive, Package,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const farmerLinks = [
  { to: '/farmer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/browse', icon: Tractor, label: 'Browse Equipment' },
  { to: '/farmer/reservations', icon: CalendarDays, label: 'My Reservations' },
  { to: '/farmer/rentals', icon: Package, label: 'My Rentals' },
  { to: '/chat', icon: MessageSquare, label: 'Messages' },
];

const ownerLinks = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/equipment', icon: Tractor, label: 'My Equipment' },
  { to: '/owner/reservations', icon: CalendarDays, label: 'Reservations' },
  { to: '/owner/transactions', icon: ClipboardList, label: 'Transactions' },
  { to: '/chat', icon: MessageSquare, label: 'Messages' },
];

const adminLinks = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/equipment', icon: Tractor, label: 'Equipment' },
  { to: '/admin/reservations', icon: CalendarDays, label: 'Reservations' },
  { to: '/admin/archive', icon: Archive, label: 'Archive' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();

  const links =
    user?.role === 'admin' ? adminLinks :
    user?.role === 'owner' ? ownerLinks :
    farmerLinks;

  // Role label shown at bottom of sidebar
  const roleLabel =
    user?.role === 'admin' ? 'Administrator' :
    user?.role === 'owner' ? 'Equipment Owner' :
    'Farmer';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40
          flex flex-col transform transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="font-semibold text-primary-600 flex items-center gap-2">
            <Wheat size={18} aria-hidden="true" /> AgriRent
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Desktop brand header */}
        <div className="hidden lg:flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Wheat size={20} className="text-primary-600" aria-hidden="true" />
          <span className="font-bold text-primary-600 text-lg">AgriRent</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Main navigation">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
              aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={isActive ? 'text-primary-600' : 'text-gray-400'}
                    aria-hidden="true"
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Role badge at bottom */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
            <span className="text-xs text-gray-500 capitalize">{roleLabel}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
