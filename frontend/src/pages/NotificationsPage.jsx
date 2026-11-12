import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Trash2, CheckCheck, CalendarDays, Package, MessageSquare, Settings } from 'lucide-react';
import { getNotifications, markAllRead, markNotificationRead, deleteNotification } from '../api/notifications';
import useNotificationStore from '../store/notificationStore';
import { getSocket } from '../hooks/useSocket';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';

const typeConfig = {
  reservation: { icon: CalendarDays, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Reservation' },
  transaction:  { icon: Package,      bg: 'bg-green-100', text: 'text-green-600', label: 'Transaction' },
  chat:         { icon: MessageSquare, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Message' },
  system:       { icon: Settings,     bg: 'bg-gray-100', text: 'text-gray-600', label: 'System' },
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { notifications, unreadCount, setNotifications, markRead, markAllRead: markAllStore, removeNotification } = useNotificationStore();

  // ── Fetch from HTTP ────────────────────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () =>
      getNotifications({ limit: 50 }).then((r) => {
        setNotifications(r.data.notifications, r.data.unreadCount);
        return r.data;
      }),
    staleTime: 0,
  });

  // ── Live update when socket fires ──────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries(['all-notifications']);
    socket.on('notification', refresh);
    return () => socket.off('notification', refresh);
  }, []);

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

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* List */}
      {!notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.system;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 transition-colors hover:bg-gray-50
                  ${!n.isRead ? 'bg-primary-50 border-l-4 border-l-primary-400' : ''}`}
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.text} />
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full inline-block" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="p-1 text-gray-300 hover:text-primary-500 rounded"
                      title="Mark as read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(n.id)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded"
                    title="Delete"
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
