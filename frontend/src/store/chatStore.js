import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: new Set(),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (partner) => {
    set({ activeConversation: partner, messages: [] });
  },

  setMessages: (messages) => set({ messages }),

  // Only add message to the visible list if it belongs to the active conversation
  addMessage: (message) => {
    const { activeConversation, conversations } = get();
    const partnerId = activeConversation?.id;
    const msgPartnerId =
      message.senderId === partnerId ? message.senderId : message.receiverId;

    // Append to messages only if this chat is currently open
    if (
      partnerId &&
      (message.senderId === partnerId || message.receiverId === partnerId)
    ) {
      set((state) => ({ messages: [...state.messages, message] }));
    }

    // Always update conversation list: last message + unread count
    set((state) => {
      const otherUserId =
        message.senderId === state.activeConversation?.id
          ? message.receiverId
          : message.senderId;

      const exists = state.conversations.find(
        (c) => c.partner?.id === message.senderId || c.partner?.id === message.receiverId
      );

      if (!exists) {
        // New conversation — will be refreshed by query invalidation
        return state;
      }

      return {
        conversations: state.conversations.map((c) => {
          const isThisConversation =
            c.partner?.id === message.senderId || c.partner?.id === message.receiverId;
          if (!isThisConversation) return c;

          // If sender is not me and this chat is NOT active → increment unread
          const isActiveChat = state.activeConversation?.id === message.senderId ||
            state.activeConversation?.id === message.receiverId;
          const isMine = message.senderId !== message.receiverId &&
            c.partner?.id === message.receiverId;

          return {
            ...c,
            lastMessage: message,
            unreadCount: (!isActiveChat && !isMine)
              ? (c.unreadCount || 0) + 1
              : c.unreadCount,
          };
        }),
      };
    });
  },

  clearUnread: (partnerId) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.partner?.id === partnerId ? { ...c, unreadCount: 0 } : c
    ),
  })),

  setUserOnline: (userId) => set((state) => {
    const next = new Set(state.onlineUsers);
    next.add(userId);
    return { onlineUsers: next };
  }),

  setUserOffline: (userId) => set((state) => {
    const next = new Set(state.onlineUsers);
    next.delete(userId);
    return { onlineUsers: next };
  }),
}));

export default useChatStore;
