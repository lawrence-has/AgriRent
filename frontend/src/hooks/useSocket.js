import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { initSocket, destroySocket, getSocket } from '../socket';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import useChatStore from '../store/chatStore';
import { saveCachedConversations } from '../services/chatOfflineStore';

const useSocket = () => {
  const { token, user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const {
    setUserOnline,
    setUserOffline,
    setOnlineUsers,
    updateConversationOnMessage,
    clearUnread,
  } = useChatStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !user) return;

    const socket = initSocket(token);

    const onConnect = () => {
      console.log('[Socket] Connected:', socket.id);
      // Re-join active chat room on reconnect
      const active = useChatStore.getState().activeConversation;
      if (active) socket.emit('join_chat', { withUserId: Number(active.id) });
    };

    // ── New message: update sidebar instantly ───────────────────
    const onNewMessage = (message) => {
      const myId = useAuthStore.getState().user?.id;
      updateConversationOnMessage(message, myId);
      saveCachedConversations(myId, useChatStore.getState().conversations);

      // Auto mark read if this chat is currently open
      const active = useChatStore.getState().activeConversation;
      const senderId = Number(message.senderId);
      if (active && Number(active.id) === senderId) {
        clearUnread(senderId);
        socket.emit('mark_read', { withUserId: senderId });
      }
    };

    // ── Chat toast ──────────────────────────────────────────────
    const onMessageNotification = ({ senderName, preview }) => {
      toast(`${senderName}: ${preview}`, { icon: '💬', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    // ── Database-backed notifications ────────────────────────────
    const onNotification = (notification) => {
      addNotification(notification);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['all-notifications']);
      if (notification.type === 'chat') return;
      const icons = { reservation: '📋', transaction: '📦', chat: '💬', system: '🔔' };
      toast(`${icons[notification.type] || '🔔'} ${notification.title}: ${notification.message}`,
        { duration: 5000 }
      );
    };

    const onUserOnline = ({ userId }) => setUserOnline(Number(userId));
    const onUserOffline = ({ userId }) => setUserOffline(Number(userId));
    const onOnlineUsers = ({ userIds }) => setOnlineUsers(userIds);

    socket.on('connect', onConnect);
    socket.on('new_message', onNewMessage);
    socket.on('message_notification', onMessageNotification);
    socket.on('notification', onNotification);
    socket.on('user_online', onUserOnline);
    socket.on('user_offline', onUserOffline);
    socket.on('online_users', onOnlineUsers);

    return () => {
      socket.off('connect', onConnect);
      socket.off('new_message', onNewMessage);
      socket.off('message_notification', onMessageNotification);
      socket.off('notification', onNotification);
      socket.off('user_online', onUserOnline);
      socket.off('user_offline', onUserOffline);
      socket.off('online_users', onOnlineUsers);
      destroySocket();
    };
  }, [token, user?.id]);
};

export { getSocket } from '../socket';
export default useSocket;
