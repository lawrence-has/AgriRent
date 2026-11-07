import { formatDistanceToNow } from 'date-fns';

const MessageBubble = ({ message, isMine }) => (
  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm
      ${isMine ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
      <p className="whitespace-pre-wrap break-words">{message.message}</p>
      <p className={`text-xs mt-1 ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
      </p>
    </div>
  </div>
);

export default MessageBubble;
