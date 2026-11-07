import { formatDistanceToNow } from 'date-fns';

const ConversationList = ({ conversations, activeId, onSelect }) => (
  <div className="overflow-y-auto h-full">
    {conversations.map(({ partner, lastMessage, unreadCount }) => (
      <button
        key={partner.id}
        onClick={() => onSelect(partner)}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100
          ${activeId === partner.id ? 'bg-primary-50' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700 shrink-0">
          {partner.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate">{partner.name}</p>
            {lastMessage && (
              <p className="text-xs text-gray-400 shrink-0 ml-2">
                {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>
          {lastMessage && (
            <p className="text-xs text-gray-500 truncate">{lastMessage.message}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
            {unreadCount}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default ConversationList;
