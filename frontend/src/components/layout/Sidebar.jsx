import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Tractor, CalendarDays, ClipboardList,
  Users, MessageSquare, X, BarChart3, Wheat, Archive, Package,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const farmerLinks = [
  { to: '/farmer/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/browse',       icon: Tractor,         label: 'Browse Equipment' },
  { to: '/farmer/reservations', icon: CalendarDays,    label: 'My Reservations' },
  { to: '/farmer/rentals',      icon: Package,         label: 'My Rentals' },
  { to: '/chat',                icon: MessageSquare,   label: 'Messages' },
];

const ownerLinks = [
  { to: '/owner/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/equipment',     icon: Tractor,         label: 'My Equipment' },
  { to: '/owner/reservations',  icon: CalendarDays,    label: 'Reservations' },
  { to: '/owner/transactions',  icon: ClipboardList,   label: 'Transactions' },
  { to: '/chat',                icon: MessageSquare,   label: 'Messages' },
];

const adminLinks = [
  { to: '/admin/dashboard',     icon: BarChart3,       label: 'Dashboard' },
  { to: '/admin/users',         icon: Users,           label: 'Users' },
  { to: '/admin/equipment',     icon: Tractor,         label: 'Equipment' },
  { to: '/admin/reservations',  icon: CalendarDays,    label: 'Reservations' },
  { to: '/admin/archive',       icon: Archive,         label: 'Archive' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();

  const links =
    user?.role === 'admin' ? adminLinks :
    user?.role === 'owner' ? ownerLinks :
    farmerLinks;

  const roleLabel =
    user?.role === 'admin' ? 'Administrator' :
    user?.role === 'owner' ? 'Equipment Owner' :
    'Farmer';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#14281d]/55 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-[min(16rem,calc(100vw-2.5rem))] bg-[#20382a] border-r border-white/10 z-40 text-white
          flex flex-col transform transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
          <span className="font-semibold text-[#f5e5b6] flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#d5ae59]/15"><Wheat size={17} aria-hidden="true" /></span> AgriRent
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Desktop brand header */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#d5ae59]/15 text-[#efd98e]"><Wheat size={21} aria-hidden="true" /></span>
          <div>
            <span className="block font-extrabold text-[#fffdf5] text-lg tracking-tight">AgriRent</span>
            <span className="block text-[10px] text-white/45 uppercase tracking-[0.2em]">Field marketplace</span>
          </div>
        </div>

        {/* Nav links */}
        <div className="px-5 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Workspace</div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1" aria-label="Main navigation">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5ae59]
                ${isActive
                  ? 'bg-[#d7e4c7] text-[#233b2a] shadow-[0_8px_20px_rgba(0,0,0,0.12)]'
                  : 'text-white/65 hover:bg-white/[0.07] hover:text-white'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 h-6 w-1 origin-center animate-[nav-indicator-in_220ms_ease-out_both] rounded-r-full bg-[#d5ae59]" />}
                  <Icon
                    size={18}
                    className={`transition-transform duration-200 ${isActive ? 'text-[#48633f] scale-105' : 'text-white/40 group-hover:text-white/75'}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Role badge at bottom */}
        <div className="p-4 border-t border-white/10">
          <div className="rounded-xl bg-white/[0.06] px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#a6c68c] rounded-full shadow-[0_0_10px_rgba(166,198,140,0.65)]" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/80">{roleLabel}</span>
            </div>
            <span className="mt-1 block pl-4 text-[10px] text-white/40">Your AgriRent workspace</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
