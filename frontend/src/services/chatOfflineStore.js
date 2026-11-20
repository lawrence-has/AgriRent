import api from '../api/axios';

const storageKey = (userId) => `agrirent_chat_offline_v1_${userId}`;

const readCache = (userId) => {
  if (!userId) return { conversations: [], messages: {}, outbox: [] };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}');
    return {
      conversations: Array.isArray(stored.conversations) ? stored.conversations : [],
      messages: stored.messages && typeof stored.messages === 'object' ? stored.messages : {},
      outbox: Array.isArray(stored.outbox) ? stored.outbox : [],
    };
  } catch {
    return { conversations: [], messages: {}, outbox: [] };
  }
};

const writeCache = (userId, cache) => {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(cache));
  } catch (error) {
    console.error('[Chat offline] Failed to save local chat data:', error);
  }
};

export const getCachedConversations = (userId) => readCache(userId).conversations;

export const saveCachedConversations = (userId, conversations) => {
  const cache = readCache(userId);
  cache.conversations = conversations;
  writeCache(userId, cache);
};

export const getCachedMessages = (userId, partnerId) =>
  readCache(userId).messages[String(partnerId)] || [];

export const saveCachedMessages = (userId, partnerId, messages) => {
  const cache = readCache(userId);
  cache.messages[String(partnerId)] = messages;
  writeCache(userId, cache);
};

export const queueChatMessage = (userId, partner, message, sender) => {
  const cache = readCache(userId);
  const id = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const queued = {
    id,
    clientMessageId: id,
    senderId: Number(userId),
    receiverId: partner.id,
    message,
    createdAt: new Date().toISOString(),
    isRead: false,
    sender,
    status: 'queued',
  };
  cache.outbox.push(queued);

  const partnerId = String(partner.id);
  cache.messages[partnerId] = [...(cache.messages[partnerId] || []), queued];
  const existingConversation = cache.conversations.some(
    (conversation) => Number(conversation.partner?.id) === Number(partner.id)
  );
  cache.conversations = existingConversation
    ? cache.conversations.map((conversation) =>
      Number(conversation.partner?.id) === Number(partner.id)
        ? { ...conversation, lastMessage: queued }
        : conversation
    )
    : [{ partner, lastMessage: queued, unreadCount: 0 }, ...cache.conversations];
  writeCache(userId, cache);
  return queued;
};

export const syncChatOutbox = async (userId) => {
  if (!navigator.onLine) return { sent: 0 };
  const cache = readCache(userId);
  let sent = 0;

  for (const queued of cache.outbox) {
    try {
      const { data } = await api.post('/chat', {
        receiverId: queued.receiverId,
        message: queued.message,
        clientMessageId: queued.clientMessageId,
      });
      const partnerId = String(queued.receiverId);
      cache.messages[partnerId] = (cache.messages[partnerId] || []).map((item) =>
        item.clientMessageId === queued.clientMessageId ? data.message : item
      );
      cache.conversations = cache.conversations.map((conversation) =>
        Number(conversation.partner?.id) === Number(queued.receiverId)
          ? { ...conversation, lastMessage: data.message }
          : conversation
      );
      cache.outbox = cache.outbox.filter(
        (item) => item.clientMessageId !== queued.clientMessageId
      );
      sent += 1;
    } catch (error) {
      if (!error.response) break;
      console.error('[Chat offline] Queued message could not be sent:', error.message);
      break;
    }
  }

  writeCache(userId, cache);
  return { sent };
};
