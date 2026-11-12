import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { getNotifications, markAllRead, markNotificationRead, deleteNotification } from '../../api/notifications';
import useNotificationStore from '../../store/notificationStore';
import { getSocket } from '../../hooks/useSocket';
import Spinner from '../common/Spinner';

const typeStyles = {
  reservation: { bg: 'bg-blue-100', text: 'text-blue-600' },
  transaction: { bg: 'bg-green-100', text: 'text-green-600' },
  chat:        { bg: 'bg-purple-100', text: 'text-purple-600' },
  system:      { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const NotificationDropdown = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { notifications, unreadCount, setNotifications, markRead, markAllRead: markAllStore, removeNotification } = useNotificationStore();
  const dropdownRef = useRef(null);

  // ── Fetch from HTTP on open ────────────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      getNotifications({ limit: 20 }).then((r) => {
        setNotifications(r.data.notifications, r.data.unreadCount);
        return r.data;
      }),
    staleTime: 0,
  });

  // ── Refetch when socket fires a new notification ───────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries(['notifications']);
    socket.on('notification', refresh);
    return () => socket.off('notification', refresh);
  }, []);

  // ── Close on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      markAllStore();
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['all-notifications']);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      markRead(id);
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => {
      removeNotification(id);
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const handleClick = (n) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-400">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {isLoading ? (
          <div className="py-10"><Spinner /></div>
        ) : !notifications?.length ? (
          <div className="text-center py-10">
            <Bell size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => {
            const style = typeStyles[n.type] || typeStyles.system;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors
                  ${!n.isRead ? 'bg-primary-50 border-l-2 border-l-primary-400' : ''}`}
                onClick={() => handleClick(n)}
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${style.bg}`}>
                  <Bell size={14} className={style.text} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                  className="p-1 text-gray-300 hover:text-red-500 shrink-0 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications?.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <a href="/notifications" onClick={onClose} className="text-xs text-primary-600 hover:underline">
            View all notifications →
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
