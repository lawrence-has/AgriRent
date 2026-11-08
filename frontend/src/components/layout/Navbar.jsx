import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Wheat, Settings } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import NotificationDropdown from '../notifications/NotificationDropdown';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 rounded-md hover:bg-gray-100 lg:hidden">
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <Wheat size={24} className="text-primary-600" />
          <span className="text-xl font-bold text-primary-600">AgriRent</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-gray-100 relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings size={16} /> Profile Settings
              </Link>
              <Link
                to="/notifications"
                onClick={() => setShowUserMenu(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Bell size={16} /> All Notifications
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
