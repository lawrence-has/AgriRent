import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Tractor, CalendarDays, ClipboardList,
  Users, MessageSquare, X, BarChart3, Wheat, Archive,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const farmerLinks = [
  { to: '/farmer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/browse', icon: Tractor, label: 'Browse Equipment' },
  { to: '/farmer/reservations', icon: CalendarDays, label: 'My Reservations' },
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

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="font-semibold text-primary-600 flex items-center gap-2"><Wheat size={18} /> AgriRent</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
