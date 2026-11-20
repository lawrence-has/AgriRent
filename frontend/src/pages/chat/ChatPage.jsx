import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, UserPlus, Search, X } from 'lucide-react';
import { getConversations } from '../../api/chat';
import api from '../../api/axios';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import {
  getCachedConversations,
  saveCachedConversations,
  syncChatOutbox,
} from '../../services/chatOfflineStore';

const ChatPage = () => {
  const {
    activeConversation,
    setActiveConversation,
    conversations,
    setConversations,
    addConversation,
  } = useChatStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setActiveConversation(null);
    setConversations(getCachedConversations(user.id));
  }, [setActiveConversation, setConversations, user.id]);

  // ── Load conversations from HTTP ───────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['conversations', user.id],
    queryFn: async () => {
      try {
        if (navigator.onLine) await syncChatOutbox(user.id);
        const { data } = await getConversations();
        setConversations(data.conversations);
        saveCachedConversations(user.id, data.conversations);
        return data.conversations;
      } catch (error) {
        if (!navigator.onLine) {
          const cached = getCachedConversations(user.id);
          setConversations(cached);
          return cached;
        }
        throw error;
      }
    },
    initialData: () => getCachedConversations(user.id),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const syncQueuedMessages = async () => {
      if (!navigator.onLine) return;
      try {
        const result = await syncChatOutbox(user.id);
        if (result.sent) {
          window.dispatchEvent(new Event('chat:outbox-synced'));
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      } catch (error) {
        console.error('[Chat offline] Failed to sync queued messages:', error);
      }
    };

    window.addEventListener('online', syncQueuedMessages);
    return () => window.removeEventListener('online', syncQueuedMessages);
  }, [queryClient, user.id]);

  // ── Search users ───────────────────────────────────────────────
  useEffect(() => {
    if (!userSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/users/search', { params: { q: userSearch, limit: 20 } });
        setSearchResults(res.data.users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleSelect = (partner) => {
    setActiveConversation(partner);
    setShowNewChat(false);
  };

  const handleStartChat = (u) => {
    const partner = { id: u.id, name: u.name, role: u.role, profilePicture: u.profilePicture };
    addConversation({ partner, lastMessage: null, unreadCount: 0 });
    saveCachedConversations(user.id, useChatStore.getState().conversations);
    setActiveConversation(partner);
    setShowNewChat(false);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleBack = () => setActiveConversation(null);

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[24rem] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:h-[calc(100dvh-9rem)] sm:min-h-[32rem]">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div className={`border-r border-gray-100 flex-shrink-0 flex flex-col
        ${activeConversation ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            disabled={!navigator.onLine}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="New conversation"
          >
            {showNewChat ? <X size={18} /> : <UserPlus size={18} />}
          </button>
        </div>

        {/* New chat search */}
        {showNewChat && (
          <div className="border-b border-gray-100 p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-medium">Start a new conversation</p>
            {!navigator.onLine && (
              <p className="text-xs text-orange-700 mb-2">Connect to the internet to find people.</p>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                disabled={!navigator.onLine}
                placeholder="Search by name..."
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {searching && <p className="text-xs text-gray-400 text-center py-2">Searching...</p>}
              {!searching && userSearch && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No users found</p>
              )}
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartChat(u)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-primary-50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700 text-sm shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation list from store (live) */}
        {!conversations?.length && !showNewChat ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description={navigator.onLine
              ? 'Click + above to start a conversation'
              : 'Connect to the internet to start a conversation. Your saved chats will appear here.'}
          />
        ) : (
          <ConversationList
            conversations={conversations || []}
            activeId={activeConversation?.id}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* ── Chat window ───────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatWindow partner={activeConversation} onBack={handleBack} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Pick someone from the list or click + to start a new chat"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
