import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import useChatStore from '../store/chatStore';

let socketInstance = null;

const useSocket = () => {
  const { token, user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { addMessage, activeConversation } = useChatStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('notification', (notification) => {
      addNotification(notification);
      toast(notification.title, { icon: '🔔' });
    });

    socketInstance.on('new_message', (message) => {
      addMessage(message);
    });

    socketInstance.on('message_notification', ({ senderName, preview }) => {
      if (!activeConversation || activeConversation.id !== message?.senderId) {
        toast(`💬 ${senderName}: ${preview}`);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [token, user]);

  return socketRef.current;
};

export const getSocket = () => socketInstance;

export default useSocket;
