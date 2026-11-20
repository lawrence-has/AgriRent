/**
 * Migration: 004_reservation_idempotency_key
 *
 * Adds a per-farmer reservation request key so retries from offline/background
 * sync cannot create duplicate reservations.
 *
 * Run with: node src/migrations/004_reservation_idempotency_key.js
 */
require('dotenv').config();
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const migrate = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const columns = await queryInterface.describeTable('Reservations');
    if (!columns.idempotencyKey) {
      await queryInterface.addColumn('Reservations', 'idempotencyKey', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex('Reservations');
    const hasUniqueIndex = indexes.some(
      (index) => index.name === 'reservations_farmer_idempotency_unique'
    );
    if (!hasUniqueIndex) {
      await queryInterface.addIndex('Reservations', ['farmerId', 'idempotencyKey'], {
        unique: true,
        name: 'reservations_farmer_idempotency_unique',
      });
    }

    console.log('Reservation idempotency migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Reservation idempotency migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
