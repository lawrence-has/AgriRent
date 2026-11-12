import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Wifi, WifiOff } from 'lucide-react';
import { getMessages, sendMessage as sendMessageREST } from '../../api/chat';
import { getSocket } from '../../hooks/useSocket';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';

const ChatWindow = ({ partner }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const { messages, setMessages, addMessage, clearUnread, onlineUserIds } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const myId = Number(user?.id);
  const partnerId = Number(partner.id);
  const partnerOnline = onlineUserIds.includes(partnerId);
  const partnerIdRef = useRef(partnerId);

  // Keep ref in sync
  useEffect(() => { partnerIdRef.current = partnerId; }, [partnerId]);

  // ── Load message history ────────────────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['messages', partner.id],
    queryFn: () =>
      getMessages(partner.id).then((r) => {
        setMessages(r.data.messages);
        return r.data.messages;
      }),
    enabled: !!partner.id,
    staleTime: 0,
  });

  // ── Join room + mark read on open ───────────────────────────────
  useEffect(() => {
    const joinAndMark = () => {
      const socket = getSocket();
      if (!socket) return;
      socket.emit('join_chat', { withUserId: partnerId });
      socket.emit('mark_read', { withUserId: partnerId });
      clearUnread(partnerId);
    };
    joinAndMark();
    const socket = getSocket();
    socket?.on('reconnect', joinAndMark);
    return () => socket?.off('reconnect', joinAndMark);
  }, [partnerId]);

  // ── Direct socket listeners inside this chat window ────────────
  // These are separate from useSocket so messages appear INSTANTLY
  // without waiting for Zustand's addMessage conversation check
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    // Message arriving from the OTHER person
    const onNewMessage = (message) => {
      const pid = partnerIdRef.current;
      const mid = Number(user?.id);
      const senderId = Number(message.senderId);
      const receiverId = Number(message.receiverId);

      const belongsHere =
        (senderId === pid && receiverId === mid) ||
        (receiverId === pid && senderId === mid);
      if (!belongsHere) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      socket.emit('mark_read', { withUserId: pid });
      clearUnread(pid);
    };

    // Server confirming OUR sent message (replaces temp optimistic)
    const onMessageSent = (message) => {
      const pid = partnerIdRef.current;
      const receiverId = Number(message.receiverId);
      const senderId = Number(message.senderId);
      if (receiverId !== pid && senderId !== pid) return;

      setMessages((prev) => {
        const hasTemp = prev.some(
          (m) =>
            String(m.id).startsWith('temp_') &&
            Number(m.senderId) === Number(message.senderId) &&
            m.message === message.message
        );
        if (hasTemp) {
          return prev.map((m) =>
            String(m.id).startsWith('temp_') &&
            Number(m.senderId) === Number(message.senderId) &&
            m.message === message.message
              ? message
              : m
          );
        }
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const onTyping = ({ fromUserId, isTyping }) => {
      if (Number(fromUserId) === partnerIdRef.current) setPartnerTyping(isTyping);
    };

    setSocketConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_message', onNewMessage);
    socket.on('message_sent', onMessageSent);
    socket.on('typing', onTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_message', onNewMessage);
      socket.off('message_sent', onMessageSent);
      socket.off('typing', onTyping);
    };
  }, [partnerId, myId]);

  // ── Auto-scroll on new messages ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send message ────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const socket = getSocket();

    if (socket?.connected) {
      const optimistic = {
        id: `temp_${Date.now()}`,
        senderId: myId,
        receiverId: partnerId,
        message: trimmed,
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: { id: myId, name: user.name, profilePicture: user.profilePicture },
      };
      setMessages((prev) => [...prev, optimistic]);
      socket.emit('send_message', { receiverId: partnerId, message: trimmed });
      setText('');
      clearTimeout(typingTimer.current);
      isTypingRef.current = false;
      socket.emit('typing', { toUserId: partnerId, isTyping: false });
    } else {
      setSending(true);
      sendMessageREST({ receiverId: partnerId, message: trimmed })
        .then(({ data }) => {
          setMessages((prev) => [...prev, { ...data.message, sender: { id: user.id, name: user.name } }]);
          setText('');
          queryClient.invalidateQueries(['conversations']);
        })
        .catch(() => toast?.error?.('Failed to send'))
        .finally(() => setSending(false));
    }
  }, [text, sending, partnerId, myId, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket?.connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { toUserId: partnerId, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing', { toUserId: partnerId, isTyping: false });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700 text-sm">
            {partner.name?.[0]?.toUpperCase()}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
            ${partnerOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{partner.name}</p>
          <p className="text-xs text-gray-500 capitalize">
            {partner.role} · {partnerOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium
          ${socketConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {socketConnected
            ? <><Wifi size={11} /> Live</>
            : <><WifiOff size={11} /> Reconnecting...</>}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={Number(msg.senderId) === myId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {partnerTyping && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-xs text-gray-400">{partner.name} is typing...</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2 bg-white">
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message... (Enter to send)"
          disabled={sending}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
