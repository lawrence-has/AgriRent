const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reservationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // unique enforced at DB level — prevents duplicate transactions
    // even under concurrent requests
    unique: 'transactions_reservation_unique',
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
    // UNIQUE index on reservationId — DB-level duplicate prevention
    { unique: true, fields: ['reservationId'], name: 'transactions_reservation_unique' },
    { fields: ['status'], name: 'transactions_status_idx' },
    { fields: ['deletedAt'], name: 'transactions_deleted_at_idx' },
  ],
});

module.exports = Transaction;
