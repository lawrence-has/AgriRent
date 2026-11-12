import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import useChatStore from '../store/chatStore';

let socketInstance = null;

const useSocket = () => {
  const { token, user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addMessage, addConversation, setUserOnline, setUserOffline } = useChatStore();
  const queryClient = useQueryClient();
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      clearTimeout(reconnectTimer.current);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        reconnectTimer.current = setTimeout(() => socketInstance?.connect(), 1000);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socketInstance.on('reconnect', () => {
      const active = useChatStore.getState().activeConversation;
      if (active) socketInstance.emit('join_chat', { withUserId: active.id });
    });

    // Notifications
    socketInstance.on('notification', (notification) => {
      addNotification(notification);
      toast(notification.title, { icon: '🔔', duration: 4000 });
      queryClient.invalidateQueries(['all-notifications']);
    });

    // new_message: a message FROM the other person arriving on MY socket
    // This fires on the RECEIVER's personal room — instant, no HTTP round-trip
    socketInstance.on('new_message', (message) => {
      addMessage(message);
      // Only update conversation list sidebar — no full HTTP refetch
      queryClient.invalidateQueries(['conversations']);
    });

    // message_sent: server confirms OUR sent message with the real DB record
    // Replaces the optimistic temp message with the real one
    socketInstance.on('message_sent', (message) => {
      addMessage(message); // store deduplication handles temp_ replacement
    });

    // Toast only when receiver is NOT looking at this chat
    socketInstance.on('message_notification', ({ senderId, senderName, preview }) => {
      const activePartner = useChatStore.getState().activeConversation;
      if (!activePartner || activePartner.id !== senderId) {
        toast(`${senderName}: ${preview}`, { icon: '💬', duration: 4000 });
      }
    });

    // Online presence
    socketInstance.on('user_online', ({ userId }) => setUserOnline(userId));
    socketInstance.on('user_offline', ({ userId }) => setUserOffline(userId));

    return () => {
      clearTimeout(reconnectTimer.current);
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [token, user?.id]);
};

export const getSocket = () => socketInstance;

export default useSocket;
