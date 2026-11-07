const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  keys: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  paranoid: false,
});

module.exports = PushSubscription;
