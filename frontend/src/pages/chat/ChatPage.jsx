import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { getConversations } from '../../api/chat';
import { getSocket } from '../../hooks/useSocket';
import useChatStore from '../../store/chatStore';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';

const ChatPage = () => {
  const { activeConversation, setActiveConversation, setConversations } = useChatStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () =>
      getConversations().then((r) => {
        setConversations(r.data.conversations);
        return r.data.conversations;
      }),
    // No polling — socket events trigger invalidation instead
    staleTime: 1000 * 60,
  });

  // Re-fetch conversations whenever a new message arrives via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refresh = () => queryClient.invalidateQueries(['conversations']);
    socket.on('new_message', refresh);
    socket.on('message_read', refresh);

    return () => {
      socket.off('new_message', refresh);
      socket.off('message_read', refresh);
    };
  }, []);

  const handleSelectConversation = (partner) => {
    setActiveConversation(partner);
  };

  const handleBack = () => {
    setActiveConversation(null);
  };

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="h-[calc(100vh-80px)] flex rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white">

      {/* Conversation sidebar */}
      <div className={`border-r border-gray-100 flex-shrink-0 flex flex-col
        ${activeConversation ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Messages</h2>
          {data?.length > 0 && (
            <span className="text-xs text-gray-400">{data.length} conversation{data.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {!data?.length ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations"
            description="Conversations appear here after a reservation is made"
          />
        ) : (
          <ConversationList
            conversations={data}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Chat window */}
      <div className={`flex-1 flex flex-col
        ${!activeConversation ? 'hidden md:flex' : 'flex'}`}
      >
        {activeConversation ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden px-3 pt-2">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>
            <ChatWindow partner={activeConversation} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a contact from the list to start messaging"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
