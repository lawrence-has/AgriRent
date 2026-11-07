import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { getMessages } from '../../api/chat';
import { getSocket } from '../../hooks/useSocket';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';

const ChatWindow = ({ partner }) => {
  const [text, setText] = useState('');
  const { messages, setMessages, addMessage } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);

  const { isLoading } = useQuery({
    queryKey: ['messages', partner.id],
    queryFn: () => getMessages(partner.id).then((r) => {
      setMessages(r.data.messages);
      return r.data.messages;
    }),
    enabled: !!partner.id,
  });

  useEffect(() => {
    const socket = getSocket();
    if (socket) socket.emit('join_chat', { withUserId: partner.id });
  }, [partner.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send_message', { receiverId: partner.id, message: trimmed });
    }
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700">
          {partner.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm">{partner.name}</p>
          <p className="text-xs text-gray-500 capitalize">{partner.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? <Spinner /> : messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isMine={msg.senderId === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
