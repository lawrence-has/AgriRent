import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Wheat, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import NotificationDropdown from '../notifications/NotificationDropdown';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

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

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <nav
      className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 flex items-center justify-between sticky top-0 z-40"
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
        <Link to="/" className="flex items-center gap-1.5 lg:hidden">
          <Wheat size={20} className="text-primary-600" aria-hidden="true" />
          <span className="text-lg font-bold text-primary-600">AgriRent</span>
        </Link>
      </div>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-1 sm:gap-2">

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications((v) => !v); setShowUserMenu(false); }}
            className="p-2 rounded-full hover:bg-gray-100 relative"
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
              className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
              role="menu"
              aria-label="User options"
            >
              {/* User info */}
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full capitalize font-medium">
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

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
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
    </nav>
  );
};

export default Navbar;
