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
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // farmerId — GET /reservations/my filters by this on every load
    { fields: ['farmerId'], name: 'reservations_farmer_idx' },
    // equipmentId — availability check runs on every new reservation POST
    { fields: ['equipmentId'], name: 'reservations_equipment_idx' },
    // status — filtered in almost every reservation query
    { fields: ['status'], name: 'reservations_status_idx' },
    // Composite: equipmentId + status — the MOST critical index.
    // isEquipmentAvailable() runs: WHERE equipmentId = ? AND status IN (...)
    // Without this, MySQL does a full table scan on every availability check.
    { fields: ['equipmentId', 'status'], name: 'reservations_equipment_status_idx' },
    // Date range composite — used in overlap detection
    { fields: ['equipmentId', 'startDate', 'endDate'], name: 'reservations_equipment_dates_idx' },
    // farmerId + status — GET /reservations/my with status filter
    { fields: ['farmerId', 'status'], name: 'reservations_farmer_status_idx' },
    // paranoid filter
    { fields: ['deletedAt'], name: 'reservations_deleted_at_idx' },
  ],
});

module.exports = Reservation;
