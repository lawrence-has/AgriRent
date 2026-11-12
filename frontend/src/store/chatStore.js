import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUserIds: [],

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

  // ── Update conversation list when a new message arrives ────────
  // Called from useSocket on new_message — updates sidebar instantly
  updateConversationOnMessage: (message, myId) => {
    set((state) => {
      const senderId = Number(message.senderId);
      const receiverId = Number(message.receiverId);
      const mid = Number(myId);

      // The other person in this message
      const partnerId = senderId === mid ? receiverId : senderId;
      const isActiveChat = Number(state.activeConversation?.id) === partnerId;
      const isMine = senderId === mid;

      const exists = state.conversations.some(
        (c) => Number(c.partner?.id) === partnerId
      );

      if (exists) {
        return {
          conversations: state.conversations.map((c) => {
            if (Number(c.partner?.id) !== partnerId) return c;
            return {
              ...c,
              lastMessage: message,
              // Only increment unread if: chat is not open AND message is from other person
              unreadCount: (!isActiveChat && !isMine)
                ? (c.unreadCount || 0) + 1
                : c.unreadCount,
            };
          }),
        };
      }

      // New conversation — add it to top of list (partner info comes later via refetch)
      return {
        conversations: [
          {
            partner: message.sender || { id: partnerId, name: 'Unknown' },
            lastMessage: message,
            unreadCount: isMine ? 0 : 1,
          },
          ...state.conversations,
        ],
      };
    });
  },

  addConversation: (conversation) => {
    set((state) => {
      const exists = state.conversations.some(
        (c) => Number(c.partner?.id) === Number(conversation.partner?.id)
      );
      if (exists) return state;
      return { conversations: [conversation, ...state.conversations] };
    });
  },

  clearUnread: (partnerId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        Number(c.partner?.id) === Number(partnerId)
          ? { ...c, unreadCount: 0 }
          : c
      ),
    })),

  setUserOnline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.includes(Number(userId))
        ? state.onlineUserIds
        : [...state.onlineUserIds, Number(userId)],
    })),

  setUserOffline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.filter((id) => id !== Number(userId)),
    })),
}));

export default useChatStore;
