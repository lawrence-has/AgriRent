const sequelize = require('../config/database');
const User = require('./User');
const Equipment = require('./Equipment');
const Reservation = require('./Reservation');
const Transaction = require('./Transaction');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');
const ChatMessage = require('./ChatMessage');

// User -> Equipment (owner has many equipment)
User.hasMany(Equipment, { foreignKey: 'ownerId', as: 'equipment' });
Equipment.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User -> Reservation (farmer has many reservations)
User.hasMany(Reservation, { foreignKey: 'farmerId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

// Equipment -> Reservation
Equipment.hasMany(Reservation, { foreignKey: 'equipmentId', as: 'reservations' });
Reservation.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });

// Reservation -> Transaction
Reservation.hasOne(Transaction, { foreignKey: 'reservationId', as: 'transaction' });
Transaction.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> PushSubscription
User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ChatMessage sender/receiver
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(ChatMessage, { foreignKey: 'receiverId', as: 'receivedMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
ChatMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// ChatMessage -> Reservation (optional)
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
