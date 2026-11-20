import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Wheat, Settings, Search, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import NotificationDropdown from '../notifications/NotificationDropdown';
import CommandPalette from './CommandPalette';
import ConfirmDialog from '../common/ConfirmDialog';
import useChatStore from '../../store/chatStore';
import { destroySocket } from '../../socket';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success('AgriRent has been installed.');
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    setShowUserMenu(false);
    if (isInstalled) {
      toast('AgriRent is already installed on this device.');
      return;
    }
    if (!installPrompt) {
      toast('To install, open your browser menu and choose “Install app” or “Add to Home Screen”.');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const requestLogout = () => {
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    destroySocket();
    queryClient.clear();
    useChatStore.getState().reset();
    useNotificationStore.getState().reset();
    logout();
    setShowLogoutConfirm(false);
    navigate('/login', { replace: true });
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <nav
      className="h-[4.5rem] bg-[#fbfaf6]/90 backdrop-blur-xl border-b border-[#e7e4d8] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_5px_22px_rgba(35,49,34,0.045)]"
      role="navigation"
      aria-label="Top navigation"
    >
      {/* Left: hamburger + brand (mobile) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        {/* Brand visible on mobile only (desktop shows in sidebar) */}
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-100 text-primary-700"><Wheat size={17} aria-hidden="true" /></span>
          <span className="text-lg font-extrabold tracking-tight text-[#294331]">AgriRent</span>
        </Link>
      </div>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-1 sm:gap-2">

        <button
          type="button"
          onClick={() => setShowCommandPalette(true)}
          className="group flex items-center gap-2 rounded-xl border border-[#e6e3d8] bg-white/75 px-2.5 py-2 text-sm text-gray-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 sm:px-3"
          aria-label="Search pages and features (Control K)"
        >
          <Search size={16} aria-hidden="true" />
          <span className="hidden md:inline">Quick search</span>
          <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400 lg:inline">Ctrl K</kbd>
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications((v) => !v); setShowUserMenu(false); }}
            className="p-2.5 rounded-xl text-[#49604a] hover:bg-[#e9eddf] relative transition"
            aria-label={`Notifications${unreadCount > 0 ? `, ${displayCount} unread` : ''}`}
            aria-expanded={showNotifications}
            aria-haspopup="true"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium leading-none"
                aria-hidden="true"
              >
                {displayCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => { setShowUserMenu((v) => !v); setShowNotifications(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label={`User menu for ${user?.name}`}
          >
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <User size={14} className="text-primary-600" aria-hidden="true" />
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {user?.name}
            </span>
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-6rem)] w-56 max-w-[calc(100vw-1.5rem)] animate-[section-rise_180ms_ease-out_both] overflow-y-auto rounded-2xl border border-[#e9e5da] bg-[#fffefa] py-1.5 shadow-[0_20px_60px_rgba(28,45,31,0.16)]"
              role="menu"
              aria-label="User options"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#eeece3] bg-[#f7f6ef] rounded-t-2xl">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] px-2.5 py-1 bg-primary-100 text-primary-800 rounded-full capitalize font-bold tracking-wide">
                  {user?.role}
                </span>
              </div>

              {/* Menu items */}
              <Link
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={15} aria-hidden="true" /> Profile Settings
              </Link>
              <Link
                to="/notifications"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Bell size={15} aria-hidden="true" />
                All Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-100 text-red-700 text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {displayCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleInstallApp}
                role="menuitem"
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-[#f0f3e9] transition-colors"
              >
                <Download size={15} aria-hidden="true" />
                {isInstalled ? 'App installed' : 'Install AgriRent'}
              </button>

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={requestLogout}
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Sign out?"
        message="Are you sure you want to sign out of AgriRent?"
        confirmLabel="Sign out"
      />
    </nav>
  );
};

export default Navbar;
