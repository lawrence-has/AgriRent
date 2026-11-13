const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('reservation', 'transaction', 'chat', 'system'),
    allowNull: false,
    defaultValue: 'system',
  },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  data: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // userId — every notification query filters by userId
    { fields: ['userId'], name: 'notifications_user_idx' },
    // Composite: userId + isRead — used for unread count badge (most frequent query)
    { fields: ['userId', 'isRead'], name: 'notifications_user_read_idx' },
    // createdAt DESC — notifications always ordered by creation date
    { fields: ['createdAt'], name: 'notifications_created_at_idx' },
    // paranoid filter
    { fields: ['deletedAt'], name: 'notifications_deleted_at_idx' },
  ],
});

module.exports = Notification;
