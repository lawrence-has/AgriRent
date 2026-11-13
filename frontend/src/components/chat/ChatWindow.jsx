import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wifi, WifiOff, ArrowLeft, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { getMessages, sendMessage as sendREST } from '../../api/chat';
import { getSocket } from '../../socket';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';

const SENDING_COOLDOWN_MS = 300; // prevent double-send

const ChatWindow = ({ partner, onBack }) => {
  const { user } = useAuthStore();
  const { clearUnread, onlineUserIds, updateConversationOnMessage } = useChatStore();

  const myId = Number(user?.id);
  const pid = Number(partner.id);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(!!getSocket()?.connected);
  const [typingVisible, setTypingVisible] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const lastSentAt = useRef(0); // cooldown tracker

  const isOnline = onlineUserIds.includes(pid);
  const hasMore = msgs.length < totalMessages;

  // ── Load history (page 1) ──────────────────────────────────────
  const loadMessages = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setMsgs([]);
    setPage(1);
    setText('');
    getMessages(pid, { limit: 50 })
      .then((r) => {
        setMsgs(r.data.messages || []);
        setTotalMessages(r.data.total || 0);
      })
      .catch((err) => setLoadError(err.message || 'Failed to load messages'))
      .finally(() => setLoading(false));
  }, [pid]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Load older messages (pagination) ──────────────────────────
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const r = await getMessages(pid, { page: nextPage, limit: 50 });
      const older = r.data.messages || [];
      setMsgs((prev) => {
        // Dedup by id before prepending
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = older.filter((m) => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });
      setPage(nextPage);
    } catch {
      // fail silently for pagination
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Socket setup ───────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let checkInterval = null;
    let handleConnect, handleDisconnect, handleNewMessage,
        handleMessageSent, handleTyping, handleMessageRead, handleMissedMessages;

    const setup = (socket) => {
      if (!mounted) return;

      setConnected(socket.connected);
      socket.emit('join_chat', { withUserId: pid });
      socket.emit('mark_read', { withUserId: pid });
      clearUnread(pid);

      handleConnect = () => {
        if (!mounted) return;
        setConnected(true);
        // Re-join room and sync missed messages on reconnect
        socket.emit('join_chat', { withUserId: pid });
        socket.emit('mark_read', { withUserId: pid });
        // Ask server for messages missed during disconnection
        setMsgs((prev) => {
          const lastId = prev.filter((m) => !String(m.id).startsWith('temp_')).slice(-1)[0]?.id;
          socket.emit('sync_messages', { withUserId: pid, lastMessageId: lastId });
          return prev;
        });
      };

      handleDisconnect = () => { if (mounted) setConnected(false); };

      // Missed messages after reconnect
      handleMissedMessages = ({ withUserId, messages }) => {
        if (!mounted || Number(withUserId) !== pid) return;
        setMsgs((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = messages.filter((m) => !existingIds.has(m.id));
          if (!newOnes.length) return prev;
          return [...prev, ...newOnes].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
      };

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
          // Replace matching temp optimistic message
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

      // Update isRead on existing messages when partner reads them
      handleMessageRead = ({ byUserId, withUserId }) => {
        if (!mounted) return;
        if (Number(byUserId) !== pid) return;
        setMsgs((prev) =>
          prev.map((m) =>
            Number(m.senderId) === myId && !m.isRead
              ? { ...m, isRead: true }
              : m
          )
        );
      };

      handleTyping = ({ fromUserId, isTyping }) => {
        if (!mounted) return;
        if (Number(fromUserId) === pid) setTypingVisible(isTyping);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);
      socket.on('message_read', handleMessageRead);
      socket.on('missed_messages', handleMissedMessages);
      socket.on('typing', handleTyping);
    };

    const trySetup = () => {
      const socket = getSocket();
      if (socket) {
        clearInterval(checkInterval);
        // If already connected, setup immediately
        // If connecting, wait for connect event
        if (socket.connected) {
          setup(socket);
        } else {
          socket.once('connect', () => { if (mounted) setup(socket); });
        }
      }
    };

    trySetup();
    if (!getSocket()) {
      checkInterval = setInterval(trySetup, 300);
    }

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      clearTimeout(typingTimer.current);
      const socket = getSocket();
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleMessageSent);
        socket.off('message_read', handleMessageRead);
        socket.off('missed_messages', handleMissedMessages);
        socket.off('typing', handleTyping);
        // Stop typing on unmount
        if (isTypingRef.current) {
          socket.emit('typing', { toUserId: pid, isTyping: false });
        }
      }
    };
  }, [pid, myId]);

  // ── Auto-scroll on new messages ──────────────────────────────────
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs.length, loadingMore]);

  // ── Send ──────────────────────────────────────────────────────────
  const send = useCallback(() => {
    const t = text.trim();
    if (!t || sending) return;

    // Cooldown: prevent accidental double-send (e.g. double Enter)
    const now = Date.now();
    if (now - lastSentAt.current < SENDING_COOLDOWN_MS) return;
    lastSentAt.current = now;

    setText('');
    const socket = getSocket();

    if (socket?.connected) {
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
      clearTimeout(typingTimer.current);
      isTypingRef.current = false;
      socket.emit('typing', { toUserId: pid, isTyping: false });
    } else {
      // REST fallback when socket disconnected
      setSending(true);
      sendREST({ receiverId: pid, message: t })
        .then(({ data }) => {
          setMsgs((prev) => [
            ...prev,
            { ...data.message, sender: { id: myId, name: user.name } },
          ]);
          updateConversationOnMessage(data.message, myId);
        })
        .catch(() => {
          // Restore text so user can retry
          setText(t);
        })
        .finally(() => setSending(false));
    }
  }, [text, sending, pid, myId, user]);

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
      socket?.emit('typing', { toUserId: pid, isTyping: false });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          aria-label="Back to messages"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
            {partner.name?.[0]?.toUpperCase()}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
            aria-label={isOnline ? 'Online' : 'Offline'}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{partner.name}</p>
          <p className="text-xs text-gray-500 capitalize">
            {partner.role} · {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shrink-0
          ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
          aria-live="polite"
        >
          {connected
            ? <><Wifi size={11} aria-hidden="true" /> Live</>
            : <><WifiOff size={11} aria-hidden="true" /> Reconnecting...</>
          }
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" role="log" aria-label="Chat messages">
        {/* Load more button */}
        {hasMore && !loading && (
          <div className="flex justify-center" ref={topRef}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium py-1.5 px-3 bg-white rounded-full border border-primary-200 hover:border-primary-400 transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? <><RefreshCw size={12} className="animate-spin" /> Loading...</>
                : <><ChevronUp size={12} /> Load older messages ({totalMessages - msgs.length} more)</>
              }
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {/* Error state */}
        {loadError && !loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-gray-500">{loadError}</p>
            <button
              onClick={loadMessages}
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && msgs.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            No messages yet. Say hello!
          </p>
        )}

        {/* Messages */}
        {!loading && !loadError && msgs.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={Number(m.senderId) === myId}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingVisible && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <div className="flex gap-0.5" aria-hidden="true">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-xs text-gray-400" aria-live="polite">{partner.name} is typing...</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2 bg-white shrink-0">
        <textarea
          value={text}
          onChange={onChange}
          onKeyDown={onKey}
          rows={1}
          placeholder="Type a message… (Enter to send)"
          disabled={sending}
          maxLength={2000}
          aria-label="Message input"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50
            max-h-32 overflow-y-auto"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          aria-label="Send message"
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
