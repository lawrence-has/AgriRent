import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { getMessages, sendMessage as sendREST } from '../../api/chat';
import { getSocket } from '../../socket';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';

const ChatWindow = ({ partner, onBack }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState([]);

  const { user } = useAuthStore();
  const { clearUnread, onlineUserIds, updateConversationOnMessage } = useChatStore();

  const myId = Number(user?.id);
  const pid = Number(partner.id);
  const pidRef = useRef(pid);
  const myIdRef = useRef(myId);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const bottomRef = useRef(null);

  pidRef.current = pid;
  myIdRef.current = myId;

  const isOnline = onlineUserIds.includes(pid);

  // ── 1. Load history ─────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setMsgs([]);
    setText('');
    getMessages(pid)
      .then((r) => setMsgs(r.data.messages || []))
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  }, [pid]);

  // ── 2. Socket listeners ─────────────────────────────────────────
  useEffect(() => {
    // Poll until socket is ready (handles race condition on first mount)
    let interval;
    let socket = getSocket();

    const attach = (s) => {
      s.emit('join_chat', { withUserId: pid });
      s.emit('mark_read', { withUserId: pid });
      clearUnread(pid);
      setConnected(s.connected);

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);

      const onNewMsg = (msg) => {
        const sid = Number(msg.senderId);
        const rid = Number(msg.receiverId);
        const p = pidRef.current;
        const m = myIdRef.current;
        // Only messages in this conversation
        if (!((sid === p && rid === m) || (sid === m && rid === p))) return;
        setMsgs((prev) => prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]);
        if (sid === p) {
          s.emit('mark_read', { withUserId: p });
          clearUnread(p);
        }
      };

      const onSent = (msg) => {
        // Replace optimistic temp with confirmed DB message
        if (Number(msg.senderId) !== myIdRef.current || Number(msg.receiverId) !== pidRef.current) return;
        setMsgs((prev) => {
          const i = prev.findIndex(
            (m) => String(m.id).startsWith('temp_') &&
              Number(m.senderId) === Number(msg.senderId) &&
              m.message === msg.message
          );
          if (i !== -1) { const n = [...prev]; n[i] = msg; return n; }
          return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
        });
        updateConversationOnMessage(msg, myIdRef.current);
      };

      const onTyping = ({ fromUserId, isTyping: t }) => {
        if (Number(fromUserId) === pidRef.current) setTyping(t);
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('new_message', onNewMsg);
      s.on('message_sent', onSent);
      s.on('typing', onTyping);

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('new_message', onNewMsg);
        s.off('message_sent', onSent);
        s.off('typing', onTyping);
      };
    };

    if (socket?.connected) {
      const cleanup = attach(socket);
      return cleanup;
    }

    // Socket not ready yet — retry every 200ms until it is
    let cleanup = null;
    interval = setInterval(() => {
      socket = getSocket();
      if (socket?.connected) {
        clearInterval(interval);
        cleanup = attach(socket);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      cleanup?.();
    };
  }, [pid]);

  // ── 3. Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  // ── 4. Send ──────────────────────────────────────────────────────
  const send = useCallback(() => {
    const t = text.trim();
    if (!t || sending) return;

    const socket = getSocket();

    if (socket?.connected) {
      // Show immediately (optimistic)
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
      setText('');
      clearTimeout(typingTimer.current);
      isTyping.current = false;
      socket.emit('typing', { toUserId: pid, isTyping: false });
    } else {
      // REST fallback
      setSending(true);
      sendREST({ receiverId: pid, message: t })
        .then(({ data }) => {
          setMsgs((prev) => [...prev, { ...data.message, sender: { id: myId, name: user.name } }]);
          setText('');
        })
        .catch(console.error)
        .finally(() => setSending(false));
    }
  }, [text, sending, pid, myId, user]);

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const onChange = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket?.connected) return;
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing', { toUserId: pid, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket?.emit('typing', { toUserId: pid, isTyping: false });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        {/* Back button — always visible */}
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          title="Back to messages"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700 text-sm">
            {partner.name?.[0]?.toUpperCase()}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>

        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900">{partner.name}</p>
          <p className="text-xs text-gray-500 capitalize">
            {partner.role} · {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium
          ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
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
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={Number(m.senderId) === myId}
                />
              ))
        }
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typing && (
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
