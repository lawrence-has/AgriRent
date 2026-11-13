const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  farmerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  equipmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Equipment', key: 'id' },
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  totalCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  // cancellationReason — recorded when status transitions to 'cancelled'
  cancellationReason: { type: DataTypes.STRING(500), allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    { fields: ['farmerId'], name: 'reservations_farmer_idx' },
    { fields: ['equipmentId'], name: 'reservations_equipment_idx' },
    { fields: ['status'], name: 'reservations_status_idx' },
    { fields: ['equipmentId', 'status'], name: 'reservations_equipment_status_idx' },
    { fields: ['equipmentId', 'startDate', 'endDate'], name: 'reservations_equipment_dates_idx' },
    { fields: ['farmerId', 'status'], name: 'reservations_farmer_status_idx' },
    { fields: ['deletedAt'], name: 'reservations_deleted_at_idx' },
  ],
});

module.exports = Reservation;
