import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, ArrowLeft, UserPlus, Search, X } from 'lucide-react';
import { getConversations } from '../../api/chat';
import api from '../../api/axios';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';

const ChatPage = () => {
  const { activeConversation, setActiveConversation, conversations, setConversations, addConversation } = useChatStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // ── Load conversations from HTTP (initial load + background sync) ─
  const { isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      getConversations().then((r) => {
        setConversations(r.data.conversations);
        return r.data.conversations;
      }),
    staleTime: 1000 * 30,
    // Refetch when window regains focus (e.g. user switches tabs)
    refetchOnWindowFocus: true,
  });

  // No separate socket listeners needed here —
  // useSocket already calls updateConversationOnMessage which updates the store,
  // and the store update re-renders ConversationList automatically

  // ── Search users to start a new conversation ──────────────────
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

  const handleSelectConversation = (partner) => {
    setActiveConversation(partner);
    setShowNewChat(false);
  };

  const handleStartChat = (u) => {
    const partner = { id: u.id, name: u.name, role: u.role, profilePicture: u.profilePicture };
    // Add to conversations list if not already there
    addConversation({ partner, lastMessage: null, unreadCount: 0 });
    setActiveConversation(partner);
    setShowNewChat(false);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleBack = () => setActiveConversation(null);

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="h-[calc(100vh-80px)] flex rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white">

      {/* ── Conversation sidebar ──────────────────────────────── */}
      <div className={`border-r border-gray-100 flex-shrink-0 flex flex-col
        ${activeConversation ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Messages</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="New conversation"
          >
            {showNewChat ? <X size={18} /> : <UserPlus size={18} />}
          </button>
        </div>

        {/* New chat search panel */}
        {showNewChat && (
          <div className="border-b border-gray-100 p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-medium">Start a new conversation</p>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {/* Results */}
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

        {/* Conversation list */}
        {!conversations?.length && !showNewChat ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description={
              <span>
                Click <strong>+</strong> above to start a conversation
              </span>
            }
          />
        ) : (
          <ConversationList
            conversations={conversations || []}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* ── Chat window ───────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Mobile back */}
            <div className="md:hidden px-3 pt-2 pb-1 border-b border-gray-100">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={16} /> Back to messages
              </button>
            </div>
            <ChatWindow partner={activeConversation} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Pick someone from the list or start a new chat"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
