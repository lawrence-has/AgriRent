import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import { getNotifications, markAllRead, markNotificationRead, deleteNotification } from '../api/notifications';
import useNotificationStore from '../store/notificationStore';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { setNotifications } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () => getNotifications({ limit: 50 }).then((r) => {
      setNotifications(r.data.notifications, r.data.unreadCount);
      return r.data;
    }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries(['all-notifications']),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries(['all-notifications']),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries(['all-notifications']),
  });

  const typeColors = {
    reservation: 'blue',
    transaction: 'green',
    chat: 'purple',
    system: 'primary',
  };

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {data?.unreadCount > 0 && (
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

      {!data?.notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {data.notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${!n.isRead ? 'bg-primary-50' : ''}`}
            >
              <div className={`mt-0.5 p-2 rounded-lg bg-${typeColors[n.type] || 'primary'}-100`}>
                <Bell size={16} className={`text-${typeColors[n.type] || 'primary'}-600`} />
              </div>
              <div className="flex-1 min-w-0" onClick={() => !n.isRead && markReadMutation.mutate(n.id)}>
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                  <Badge label={n.type} />
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-primary-500 rounded-full inline-block" />
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(n.id)}
                className="p-1 text-gray-400 hover:text-red-500 shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
