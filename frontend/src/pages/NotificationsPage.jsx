import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, BellOff, Trash2, CheckCheck,
  CalendarDays, Package, MessageSquare, Settings, AlertTriangle,
} from 'lucide-react';
import { getNotifications, markAllRead, markNotificationRead, deleteNotification } from '../api/notifications';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import { getSocket } from '../hooks/useSocket';
import usePushNotification from '../hooks/usePushNotification';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';

const typeConfig = {
  reservation: { icon: CalendarDays, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Reservation' },
  transaction:  { icon: Package,      bg: 'bg-green-100', text: 'text-green-600', label: 'Transaction' },
  chat:         { icon: MessageSquare, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Message' },
  system:       { icon: Settings,     bg: 'bg-gray-100', text: 'text-gray-600', label: 'System' },
};

/**
 * Returns the target URL for a notification based on its type and data.
 * Used for both notification click navigation and future deep-linking.
 */
const getNotificationUrl = (notification, userRole) => {
  const { type, data = {} } = notification;

  if (type === 'reservation') {
    if (data.reservationId) {
      if (userRole === 'farmer') return `/farmer/reservations/${data.reservationId}`;
      if (userRole === 'owner') return `/owner/reservations`;
    }
    if (userRole === 'farmer') return '/farmer/reservations';
    if (userRole === 'owner') return '/owner/reservations';
    return '/admin/reservations';
  }

  if (type === 'transaction') {
    if (userRole === 'farmer') return '/farmer/rentals';
    if (userRole === 'owner') return '/owner/transactions';
    return '/admin/reservations';
  }

  if (type === 'chat') return '/chat';

  return null;
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications, unreadCount,
    setNotifications, markRead, markAllRead: markAllStore, removeNotification,
  } = useNotificationStore();

  const {
    isSubscribed, isSupported, isLoading: pushLoading,
    permissionState, error: pushError, subscribe, unsubscribe,
  } = usePushNotification();

  // ── Fetch notifications ────────────────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () =>
      getNotifications({ limit: 50 }).then((r) => {
        setNotifications(r.data.notifications, r.data.unreadCount);
        return r.data;
      }),
    staleTime: 0,
  });

  // ── Live update on socket ──────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries(['all-notifications']);
    socket.on('notification', refresh);
    return () => socket.off('notification', refresh);
  }, []);

  // ── Mutations ──────────────────────────────────────────────────
  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      markAllStore();
      queryClient.invalidateQueries(['all-notifications']);
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      markRead(id);
      queryClient.invalidateQueries(['all-notifications']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => {
      removeNotification(id);
      queryClient.invalidateQueries(['all-notifications']);
    },
  });

  // ── Handle notification click: mark read + navigate ────────────
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const url = getNotificationUrl(notification, user?.role);
    if (url) navigate(url);
  };

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
          >
            <CheckCheck size={15} /> Mark all read
          </Button>
        )}
      </div>

      {/* Push notification quick toggle */}
      {isSupported && (
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3
          ${isSubscribed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isSubscribed
              ? <Bell size={16} className="text-green-700 shrink-0" aria-hidden="true" />
              : <BellOff size={16} className="text-gray-500 shrink-0" aria-hidden="true" />
            }
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {isSubscribed ? 'Push notifications on' : 'Push notifications off'}
              </p>
              {permissionState === 'denied' && (
                <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> Blocked in browser settings
                </p>
              )}
              {pushError && permissionState !== 'denied' && (
                <p className="text-xs text-red-600 mt-0.5 truncate">{pushError}</p>
              )}
            </div>
          </div>
          {permissionState !== 'denied' && (
            <Button
              variant={isSubscribed ? 'secondary' : 'outline'}
              size="sm"
              onClick={isSubscribed ? unsubscribe : subscribe}
              loading={pushLoading}
              disabled={pushLoading}
              className="shrink-0"
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          )}
        </div>
      )}

      {/* Notification list */}
      {!notifications?.length ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! Notifications appear here when there's activity on your reservations or equipment."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.system;
            const Icon = cfg.icon;
            const isClickable = !!getNotificationUrl(n, user?.role);

            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 transition-colors
                  ${!n.isRead ? 'bg-primary-50 border-l-4 border-l-primary-400' : ''}
                  ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                onClick={isClickable ? () => handleNotificationClick(n) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={isClickable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(n);
                  }
                } : undefined}
                aria-label={isClickable ? `${n.title} — click to view` : undefined}
              >
                {/* Type icon */}
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${cfg.bg}`} aria-hidden="true">
                  <Icon size={16} className={cfg.text} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full inline-block" aria-label="Unread" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                    {isClickable && (
                      <span className="text-xs text-primary-600 font-medium">View →</span>
                    )}
                  </div>
                </div>

                {/* Actions — stop propagation so click on buttons doesn't trigger row click */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!n.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="p-1 text-gray-300 hover:text-primary-500 rounded"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(n.id)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded"
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
