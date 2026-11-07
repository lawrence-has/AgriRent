import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { getNotifications, markAllRead, markNotificationRead } from '../../api/notifications';
import useNotificationStore from '../../store/notificationStore';
import Spinner from '../common/Spinner';

const NotificationDropdown = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { setNotifications } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 10 }).then((r) => r.data),
  });

  useEffect(() => {
    if (data) setNotifications(data.notifications, data.unreadCount);
  }, [data]);

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <button
          onClick={() => markAllMutation.mutate()}
          className="text-xs text-primary-600 hover:underline"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="py-8"><Spinner /></div>
        ) : !data?.notifications?.length ? (
          <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
        ) : (
          data.notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => { markReadMutation.mutate(n.id); onClose(); }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 ${!n.isRead ? 'bg-primary-50' : ''}`}
            >
              <p className="text-sm font-medium text-gray-800">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
