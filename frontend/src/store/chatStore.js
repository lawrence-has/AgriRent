import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUserIds: [], // plain array so Zustand detects changes

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (partner) =>
    set({ activeConversation: partner, messages: [] }),

  setMessages: (messagesOrUpdater) => {
    if (typeof messagesOrUpdater === 'function') {
      set((state) => ({ messages: messagesOrUpdater(state.messages) }));
    } else {
      set({ messages: messagesOrUpdater });
    }
  },

  // Add a message — dedup optimistic temp messages when real one arrives
  addMessage: (message) => {
    const { activeConversation } = get();
    const partnerId = activeConversation?.id;
    const belongsHere =
      partnerId &&
      (message.senderId === partnerId || message.receiverId === partnerId);

    set((state) => {
      let newMessages = state.messages;

      if (belongsHere) {
        // Replace matching optimistic message if present, otherwise append
        const hasOptimistic = state.messages.some(
          (m) =>
            String(m.id).startsWith('temp_') &&
            m.senderId === message.senderId &&
            m.message === message.message
        );
        if (hasOptimistic) {
          newMessages = state.messages.map((m) =>
            String(m.id).startsWith('temp_') &&
            m.senderId === message.senderId &&
            m.message === message.message
              ? message
              : m
          );
        } else {
          // Only append if not already in the list (avoid duplicates)
          const alreadyExists = state.messages.some((m) => m.id === message.id);
          newMessages = alreadyExists
            ? state.messages
            : [...state.messages, message];
        }
      }

      // Update conversation list last message + unread count
      const isActiveChat =
        state.activeConversation?.id === message.senderId ||
        state.activeConversation?.id === message.receiverId;

      const updatedConversations = state.conversations.map((c) => {
        const isThis =
          c.partner?.id === message.senderId ||
          c.partner?.id === message.receiverId;
        if (!isThis) return c;

        const isMine = message.senderId !== message.receiverId &&
          c.partner?.id === message.receiverId;

        return {
          ...c,
          lastMessage: message,
          unreadCount:
            !isActiveChat && !isMine
              ? (c.unreadCount || 0) + 1
              : c.unreadCount,
        };
      });

      return { messages: newMessages, conversations: updatedConversations };
    });
  },

  // Add a brand-new conversation to the list (when first message is sent)
  addConversation: (conversation) => {
    set((state) => {
      const exists = state.conversations.some(
        (c) => c.partner?.id === conversation.partner?.id
      );
      if (exists) return state;
      return { conversations: [conversation, ...state.conversations] };
    });
  },

  clearUnread: (partnerId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.partner?.id === partnerId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setUserOnline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.includes(userId)
        ? state.onlineUserIds
        : [...state.onlineUserIds, userId],
    })),

  setUserOffline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.filter((id) => id !== userId),
    })),
}));

export default useChatStore;
