import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import useChatStore from '../store/chatStore';

// Module-level singleton so the socket survives re-renders
let socketInstance = null;

const useSocket = () => {
  const { token, user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addMessage, setUserOnline, setUserOffline, activeConversation, clearUnread } = useChatStore();
  const queryClient = useQueryClient();
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const connect = () => {
      if (socketInstance?.connected) return;

      socketInstance = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // polling as fallback
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      // ── Connection lifecycle ─────────────────────────────────────
      socketInstance.on('connect', () => {
        console.log('[Socket] Connected:', socketInstance.id);
        clearTimeout(reconnectTimer.current);
      });

      socketInstance.on('disconnect', (reason) => {
        console.warn('[Socket] Disconnected:', reason);
        // Socket.IO auto-reconnects for most reasons; manual only for server-forced
        if (reason === 'io server disconnect') {
          reconnectTimer.current = setTimeout(() => socketInstance?.connect(), 3000);
        }
      });

      socketInstance.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });

      socketInstance.on('reconnect', (attempt) => {
        console.log('[Socket] Reconnected after', attempt, 'attempts');
        // Re-join active chat room after reconnect
        const active = useChatStore.getState().activeConversation;
        if (active) {
          socketInstance.emit('join_chat', { withUserId: active.id });
        }
      });

      // ── Notifications ────────────────────────────────────────────
      socketInstance.on('notification', (notification) => {
        addNotification(notification);
        toast(notification.title, { icon: '🔔', duration: 4000 });
        queryClient.invalidateQueries(['all-notifications']);
      });

      // ── Chat messages ────────────────────────────────────────────
      socketInstance.on('new_message', (message) => {
        addMessage(message);
        // Refresh conversation list so last message / unread count stays in sync
        queryClient.invalidateQueries(['conversations']);
      });

      socketInstance.on('message_read', ({ byUserId }) => {
        // The other side read our messages — no UI action needed beyond what store handles
      });

      // Toast when a message arrives in a conversation that's NOT currently open
      socketInstance.on('message_notification', ({ senderId, senderName, preview }) => {
        const activeParter = useChatStore.getState().activeConversation;
        if (!activeParter || activeParter.id !== senderId) {
          toast(`${senderName}: ${preview}`, { icon: '💬', duration: 5000 });
        }
      });

      // ── Online presence ──────────────────────────────────────────
      socketInstance.on('user_online', ({ userId }) => setUserOnline(userId));
      socketInstance.on('user_offline', ({ userId }) => setUserOffline(userId));
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [token, user?.id]); // only reconnect when auth changes
};

export const getSocket = () => socketInstance;

export default useSocket;
