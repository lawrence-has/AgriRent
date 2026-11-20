import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Archive, Bell, CalendarDays, Command, MessageSquare, Search, Settings, Tractor, Users, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const commonActions = [
  { label: 'My profile', to: '/profile', icon: Settings, keywords: 'account settings' },
  { label: 'Notifications', to: '/notifications', icon: Bell, keywords: 'alerts updates' },
  { label: 'Messages', to: '/chat', icon: MessageSquare, keywords: 'chat conversation' },
];

const actionsByRole = {
  farmer: [
    { label: 'Dashboard', to: '/farmer/dashboard', icon: Command },
    { label: 'Browse equipment', to: '/farmer/browse', icon: Tractor, keywords: 'search machinery rent' },
    { label: 'My reservations', to: '/farmer/reservations', icon: CalendarDays, keywords: 'bookings' },
    { label: 'My rentals', to: '/farmer/rentals', icon: Tractor, keywords: 'active rental history' },
  ],
  owner: [
    { label: 'Dashboard', to: '/owner/dashboard', icon: Command },
    { label: 'My equipment', to: '/owner/equipment', icon: Tractor, keywords: 'inventory listing' },
    { label: 'Manage reservations', to: '/owner/reservations', icon: CalendarDays, keywords: 'booking requests' },
    { label: 'Transactions', to: '/owner/transactions', icon: Archive, keywords: 'release returns' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: Command },
    { label: 'Users', to: '/admin/users', icon: Users, keywords: 'accounts' },
    { label: 'Equipment', to: '/admin/equipment', icon: Tractor, keywords: 'listings' },
    { label: 'Reservations', to: '/admin/reservations', icon: CalendarDays, keywords: 'bookings' },
    { label: 'Archive', to: '/admin/archive', icon: Archive, keywords: 'restore deleted' },
  ],
};

const CommandPalette = ({ open, onClose }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const filteredRef = useRef([]);
  const activeIndexRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const actions = useMemo(() => [...(actionsByRole[user?.role] || []), ...commonActions], [user?.role]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return actions;
    return actions.filter((item) => `${item.label} ${item.keywords || ''}`.toLowerCase().includes(term));
  }, [actions, query]);
  filteredRef.current = filtered;
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => filteredRef.current.length ? (index + 1) % filteredRef.current.length : 0);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => filteredRef.current.length ? (index - 1 + filteredRef.current.length) % filteredRef.current.length : 0);
      }
      if (event.key === 'Enter' && filteredRef.current[activeIndexRef.current]) {
        navigate(filteredRef.current[activeIndexRef.current].to);
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, navigate]);

  useEffect(() => { if (open) onCloseRef.current(); }, [location.pathname]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-gray-950/45 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Quick navigation" className="w-full max-w-xl overflow-hidden rounded-[1.4rem] border border-[#e7e5da] bg-[#fffefa] shadow-[0_30px_90px_rgba(21,36,24,0.3)] animate-[page-enter_180ms_ease-out_both]">
        <div className="flex items-center gap-3 border-b border-[#eeede5] bg-[#faf9f4] px-4">
          <span className="rounded-xl bg-[#e9eee1] p-2 text-[#496448]"><Search size={17} aria-hidden="true" /></span>
          <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Search pages and features..." className="h-16 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-gray-400 focus:ring-0" aria-label="Search pages and features" />
          <button type="button" onClick={onClose} aria-label="Close quick navigation" className="rounded-xl border border-[#e7e5da] bg-white p-2 text-gray-400 transition hover:bg-[#f0f2e9] hover:text-gray-700"><X size={17} /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#899080]">Quick navigation <span className="ml-1 font-medium normal-case tracking-normal">· {filtered.length} destinations</span></p>
          {filtered.length ? filtered.map((item, index) => {
            const Icon = item.icon;
            return <button type="button" key={item.to} onMouseEnter={() => setActiveIndex(index)} onClick={() => { navigate(item.to); onClose(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${activeIndex === index ? 'translate-x-0.5 bg-[#edf1e6] text-[#294331] shadow-sm' : 'text-gray-700 hover:bg-[#f7f7f2]'}`}>
              <span className={`rounded-xl p-2 transition-colors ${activeIndex === index ? 'bg-white text-[#54724b]' : 'bg-[#f1f0e9] text-gray-500'}`}><Icon size={16} /></span>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {activeIndex === index && <span className="text-[11px] text-primary-500">Enter ↵</span>}
            </button>;
          }) : <p className="px-3 py-8 text-center text-sm text-gray-500">No matching pages. Try another search.</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] text-gray-400"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div>
      </section>
    </div>
  );
};

export default CommandPalette;
