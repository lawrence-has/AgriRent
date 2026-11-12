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

    // Disconnect stale socket if auth changed
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
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      clearTimeout(reconnectTimer.current);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        reconnectTimer.current = setTimeout(() => socketInstance?.connect(), 3000);
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

    // New message from the other side (not sent by this socket)
    socketInstance.on('new_message', (message) => {
      addMessage(message);
      queryClient.invalidateQueries(['conversations']);
    });

    // Toast for messages when chat is not open
    socketInstance.on('message_notification', ({ senderId, senderName, preview }) => {
      const activeParter = useChatStore.getState().activeConversation;
      if (!activeParter || activeParter.id !== senderId) {
        toast(`${senderName}: ${preview}`, { icon: '💬', duration: 5000 });
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
