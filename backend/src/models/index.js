const sequelize = require('../config/database');
const User = require('./User');
const Equipment = require('./Equipment');
const Reservation = require('./Reservation');
const Transaction = require('./Transaction');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');
const ChatMessage = require('./ChatMessage');

// ── User → Equipment ─────────────────────────────────────────────
User.hasMany(Equipment, { foreignKey: 'ownerId', as: 'equipment' });
Equipment.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// ── User → Reservation ───────────────────────────────────────────
User.hasMany(Reservation, { foreignKey: 'farmerId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

// ── Equipment → Reservation ──────────────────────────────────────
// paranoid: false on the Equipment side so that soft-deleted equipment
// still appears in historical reservation records (preserve history)
Equipment.hasMany(Reservation, { foreignKey: 'equipmentId', as: 'reservations' });
Reservation.belongsTo(Equipment, {
  foreignKey: 'equipmentId',
  as: 'equipment',
  constraints: false, // allow null equipment ref without FK error on soft-deletes
});

// ── Reservation → Transaction ────────────────────────────────────
Reservation.hasOne(Transaction, { foreignKey: 'reservationId', as: 'transaction' });
Transaction.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// ── User → Notification ──────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── User → PushSubscription ──────────────────────────────────────
User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── User → ChatMessage ───────────────────────────────────────────
// paranoid: false on sender/receiver includes so messages from soft-deleted
// users still appear in the recipient's chat history
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(ChatMessage, { foreignKey: 'receiverId', as: 'receivedMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender', constraints: false });
ChatMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver', constraints: false });

// ── Reservation → ChatMessage ─────────────────────────────────────
Reservation.hasMany(ChatMessage, { foreignKey: 'reservationId', as: 'chatMessages' });
ChatMessage.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

module.exports = {
  sequelize,
  User,
  Equipment,
  Reservation,
  Transaction,
  Notification,
  PushSubscription,
  ChatMessage,
};
