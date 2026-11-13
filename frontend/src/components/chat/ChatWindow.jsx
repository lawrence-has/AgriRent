import { useState, useEffect, useRef } from 'react';
import { Send, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { getMessages, sendMessage as sendREST } from '../../api/chat';
import { getSocket } from '../../socket';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';

const ChatWindow = ({ partner, onBack }) => {
  const { user } = useAuthStore();
  const { clearUnread, onlineUserIds, updateConversationOnMessage } = useChatStore();

  const myId = Number(user?.id);
  const pid = Number(partner.id);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(!!getSocket()?.connected);
  const [typingVisible, setTypingVisible] = useState(false);
  const [msgs, setMsgs] = useState([]);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const isOnline = onlineUserIds.includes(pid);

  // ── Load history ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setMsgs([]);
    setText('');
    getMessages(pid)
      .then((r) => setMsgs(r.data.messages || []))
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  }, [pid]);

  // ── Socket ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let checkInterval = null;

    // Named handlers so we can remove exact listeners later
    let handleConnect, handleDisconnect, handleNewMessage, handleMessageSent, handleTyping;

    const setup = (socket) => {
      if (!mounted) return;

      setConnected(socket.connected);
      socket.emit('join_chat', { withUserId: pid });
      socket.emit('mark_read', { withUserId: pid });
      clearUnread(pid);

      handleConnect = () => { if (mounted) setConnected(true); };
      handleDisconnect = () => { if (mounted) setConnected(false); };

      handleNewMessage = (msg) => {
        if (!mounted) return;
        const sid = Number(msg.senderId);
        const rid = Number(msg.receiverId);
        const mine = sid === myId && rid === pid;
        const theirs = sid === pid && rid === myId;
        if (!mine && !theirs) return;
        setMsgs((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (theirs) {
          socket.emit('mark_read', { withUserId: pid });
          clearUnread(pid);
        }
        updateConversationOnMessage(msg, myId);
      };

      handleMessageSent = (msg) => {
        if (!mounted) return;
        if (Number(msg.senderId) !== myId || Number(msg.receiverId) !== pid) return;
        setMsgs((prev) => {
          const idx = prev.findIndex(
            (m) => String(m.id).startsWith('temp_') &&
              m.message === msg.message &&
              Number(m.senderId) === myId
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = msg;
            return copy;
          }
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        updateConversationOnMessage(msg, myId);
      };

      handleTyping = ({ fromUserId, isTyping }) => {
        if (!mounted) return;
        if (Number(fromUserId) === pid) setTypingVisible(isTyping);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);
      socket.on('typing', handleTyping);
    };

    const trySetup = () => {
      const socket = getSocket();
      if (socket) {
        clearInterval(checkInterval);
        setup(socket);
      }
    };

    trySetup();
    if (!getSocket()) {
      checkInterval = setInterval(trySetup, 300);
    }

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      const socket = getSocket();
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleMessageSent);
        socket.off('typing', handleTyping);
      }
    };
  }, [pid, myId]);

  // ── Auto-scroll ──────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  // ── Send ─────────────────────────────────────────────────────────
  const send = () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');

    const socket = getSocket();

    if (socket?.connected) {
      // Add optimistic immediately
      const temp = {
        id: `temp_${Date.now()}`,
        senderId: myId,
        receiverId: pid,
        message: t,
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: { id: myId, name: user.name, profilePicture: user.profilePicture },
      };
      setMsgs((prev) => [...prev, temp]);
      socket.emit('send_message', { receiverId: pid, message: t });
      // Stop typing
      clearTimeout(typingTimer.current);
      isTypingRef.current = false;
      socket.emit('typing', { toUserId: pid, isTyping: false });
    } else {
      // No socket — use REST
      setSending(true);
      sendREST({ receiverId: pid, message: t })
        .then(({ data }) => {
          setMsgs((prev) => [
            ...prev,
            { ...data.message, sender: { id: myId, name: user.name } },
          ]);
          updateConversationOnMessage(data.message, myId);
        })
        .catch(console.error)
        .finally(() => setSending(false));
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onChange = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket?.connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { toUserId: pid, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing', { toUserId: pid, isTyping: false });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
            {partner.name?.[0]?.toUpperCase()}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{partner.name}</p>
          <p className="text-xs text-gray-500 capitalize">{partner.role} · {isOnline ? 'Online' : 'Offline'}</p>
        </div>

        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shrink-0 ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {connected ? <><Wifi size={11} /> Live</> : <><WifiOff size={11} /> Reconnecting...</>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading
          ? <div className="flex justify-center py-10"><Spinner /></div>
          : msgs.length === 0
            ? <p className="text-center text-sm text-gray-400 py-10">No messages yet. Say hello!</p>
            : msgs.map((m) => (
                <MessageBubble key={m.id} message={m} isMine={Number(m.senderId) === myId} />
              ))
        }
        <div ref={bottomRef} />
      </div>

      {/* Typing */}
      {typingVisible && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-xs text-gray-400">{partner.name} is typing...</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2 bg-white">
        <textarea
          value={text}
          onChange={onChange}
          onKeyDown={onKey}
          rows={1}
          placeholder="Type a message... (Enter to send)"
          disabled={sending}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        />
        <button
          onClick={send}
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
