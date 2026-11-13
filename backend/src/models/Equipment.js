const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Equipment = sequelize.define('Equipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category: {
    type: DataTypes.ENUM('tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  dailyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  specifications: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  status: {
    type: DataTypes.ENUM('available', 'rented', 'maintenance', 'archived'),
    allowNull: false,
    defaultValue: 'available',
  },
  location: { type: DataTypes.STRING(200), allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // ownerId — used in /owner/me, dashboard stats, and ownership checks
    { fields: ['ownerId'], name: 'equipment_owner_idx' },
    // status — public listing always filters by status
    { fields: ['status'], name: 'equipment_status_idx' },
    // category — frequently used filter in browse/search
    { fields: ['category'], name: 'equipment_category_idx' },
    // dailyRate — range queries (minRate, maxRate filters)
    { fields: ['dailyRate'], name: 'equipment_daily_rate_idx' },
    // Composite: owner + status (most common owner dashboard query)
    { fields: ['ownerId', 'status'], name: 'equipment_owner_status_idx' },
    // Composite: status + category (common browse combo)
    { fields: ['status', 'category'], name: 'equipment_status_category_idx' },
    // paranoid filter
    { fields: ['deletedAt'], name: 'equipment_deleted_at_idx' },
  ],
});

module.exports = Equipment;
