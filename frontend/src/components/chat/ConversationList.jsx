import { formatDistanceToNow } from 'date-fns';
import useChatStore from '../../store/chatStore';

const ConversationList = ({ conversations, activeId, onSelect }) => {
  const { onlineUserIds } = useChatStore();

  return (
    <div className="overflow-y-auto flex-1">
      {conversations.map(({ partner, lastMessage, unreadCount }) => {
        const isOnline = onlineUserIds.includes(partner.id);
        const isActive = activeId === partner.id;

        return (
          <button
            key={partner.id}
            onClick={() => onSelect(partner)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 transition-colors
              ${isActive ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''}`}
          >
            {/* Avatar with online dot */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700">
                {partner.name?.[0]?.toUpperCase()}
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
                ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {partner.name}
                </p>
                {lastMessage && (
                  <p className="text-xs text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
              <p className={`text-xs truncate mt-0.5 ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                {lastMessage?.message || <span className="italic text-gray-400">No messages yet</span>}
              </p>
            </div>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="bg-primary-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0 font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
