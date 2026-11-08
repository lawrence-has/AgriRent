import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { getConversations } from '../../api/chat';
import useChatStore from '../../store/chatStore';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';

const ChatPage = () => {
  const { activeConversation, setActiveConversation } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations().then((r) => r.data.conversations),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="h-[calc(100vh-80px)] flex rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white">
      {/* Conversation sidebar */}
      <div className={`w-80 border-r border-gray-100 flex-shrink-0 ${activeConversation ? 'hidden md:flex flex-col' : 'flex flex-col w-full md:w-80'}`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold">Messages</h2>
        </div>
        {!data?.length ? (
          <EmptyState icon={MessageSquare} title="No conversations" description="Start chatting from a reservation" />
        ) : (
          <ConversationList conversations={data} activeId={activeConversation?.id} onSelect={setActiveConversation} />
        )}
      </div>

      {/* Chat window */}
      <div className={`flex-1 ${!activeConversation ? 'hidden md:flex items-center justify-center' : 'flex flex-col'}`}>
        {activeConversation ? (
          <ChatWindow partner={activeConversation} />
        ) : (
          <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a contact to start messaging" />
        )}
      </div>
    </div>
  );
};

export default ChatPage;
