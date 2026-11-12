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
  const { setUserOnline, setUserOffline, updateConversationOnMessage, clearUnread } = useChatStore();
  const queryClient = useQueryClient();
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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
      // Re-join active chat room on reconnect
      const active = useChatStore.getState().activeConversation;
      if (active) socketInstance.emit('join_chat', { withUserId: Number(active.id) });
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

    // ── New message: update conversation sidebar instantly ──────
    // ChatWindow handles rendering the message itself
    // useSocket handles updating the sidebar (last msg + unread badge)
    socketInstance.on('new_message', (message) => {
      const myId = useAuthStore.getState().user?.id;
      updateConversationOnMessage(message, myId);

      // Auto-mark as read if this chat is currently open
      const activePartner = useChatStore.getState().activeConversation;
      const senderId = Number(message.senderId);
      if (activePartner && Number(activePartner.id) === senderId) {
        clearUnread(senderId);
        socketInstance.emit('mark_read', { withUserId: senderId });
      }
    });

    // ── message_notification: unread badge when chat is not open ─
    socketInstance.on('message_notification', ({ senderId, senderName, preview }) => {
      const activePartner = useChatStore.getState().activeConversation;
      const isChattingWithSender = activePartner &&
        Number(activePartner.id) === Number(senderId);

      if (!isChattingWithSender) {
        // Show toast
        toast(`${senderName}: ${preview}`, { icon: '💬', duration: 4000 });
        // Refresh conversations from server so new conversation appears if first message
        queryClient.invalidateQueries(['conversations']);
      }
    });

    // ── System/reservation/transaction notifications ─────────────
    socketInstance.on('notification', (notification) => {
      addNotification(notification);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['all-notifications']);

      const icons = { reservation: '📋', transaction: '📦', chat: '💬', system: '🔔' };
      toast(
        `${icons[notification.type] || '🔔'} ${notification.title}: ${notification.message}`,
        { duration: 5000 }
      );
    });

    // ── Online presence ──────────────────────────────────────────
    socketInstance.on('user_online', ({ userId }) => setUserOnline(Number(userId)));
    socketInstance.on('user_offline', ({ userId }) => setUserOffline(Number(userId)));

    return () => {
      clearTimeout(reconnectTimer.current);
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [token, user?.id]);
};

export const getSocket = () => socketInstance;

export default useSocket;
