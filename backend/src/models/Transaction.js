const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reservationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Reservations', key: 'id' },
  },
  releaseDate: { type: DataTypes.DATE, allowNull: true },
  returnDate: { type: DataTypes.DATE, allowNull: true },
  releaseNotes: { type: DataTypes.TEXT, allowNull: true },
  returnNotes: { type: DataTypes.TEXT, allowNull: true },
  releaseImages: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  returnImages: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  status: {
    type: DataTypes.ENUM('released', 'returned'),
    allowNull: false,
    defaultValue: 'released',
  },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // reservationId — joined on every transaction fetch
    { fields: ['reservationId'], name: 'transactions_reservation_idx' },
    // status — filtered in listing queries
    { fields: ['status'], name: 'transactions_status_idx' },
    // paranoid filter
    { fields: ['deletedAt'], name: 'transactions_deleted_at_idx' },
  ],
});

module.exports = Transaction;
