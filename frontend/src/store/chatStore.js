import { create } from 'zustand';

const useChatStore = create((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (partner) => set({ activeConversation: partner, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  updateUnreadCount: (partnerId, count) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.partner?.id === partnerId ? { ...c, unreadCount: count } : c
    ),
  })),
}));

export default useChatStore;
