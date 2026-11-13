const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  reservationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Reservations', key: 'id' },
  },
  message: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // senderId — conversation listing
    { fields: ['senderId'], name: 'chat_messages_sender_idx' },
    // receiverId — conversation listing + unread count
    { fields: ['receiverId'], name: 'chat_messages_receiver_idx' },
    // Composite: senderId + receiverId — the PRIMARY query pattern for fetching
    // a conversation between two users:
    // WHERE (senderId = A AND receiverId = B) OR (senderId = B AND receiverId = A)
    { fields: ['senderId', 'receiverId'], name: 'chat_messages_conversation_idx' },
    // receiverId + isRead — unread count badge query
    { fields: ['receiverId', 'isRead'], name: 'chat_messages_unread_idx' },
    // createdAt — messages always ordered by time ASC
    { fields: ['createdAt'], name: 'chat_messages_created_at_idx' },
    // paranoid filter
    { fields: ['deletedAt'], name: 'chat_messages_deleted_at_idx' },
  ],
});

module.exports = ChatMessage;
