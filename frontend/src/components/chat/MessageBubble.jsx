import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
};

const MessageBubble = ({ message, isMine }) => {
  // Optimistic messages have a temp id
  const isOptimistic = String(message.id).startsWith('temp_');

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar for received messages */}
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center font-semibold text-primary-700 text-xs shrink-0 mr-2 mt-1">
          {message.sender?.name?.[0]?.toUpperCase()}
        </div>
      )}

      <div className={`max-w-xs lg:max-w-md`}>
        <div className={`px-3 py-2 rounded-2xl text-sm
          ${isMine
            ? 'bg-primary-600 text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100'}
          ${isOptimistic ? 'opacity-70' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        </div>

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <p className="text-xs text-gray-400">
            {formatTime(message.createdAt)}
          </p>
          {isMine && (
            <span className="text-xs">
              {isOptimistic ? (
                <Check size={12} className="text-gray-400" />
              ) : message.isRead ? (
                <CheckCheck size={12} className="text-primary-500" />
              ) : (
                <Check size={12} className="text-gray-400" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
