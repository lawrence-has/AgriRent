/**
 * Migration: 002_add_cancellation_reason
 *
 * Adds cancellationReason column to Reservations table.
 * Safe to run multiple times — checks if column exists first.
 *
 * Run with: node src/migrations/002_add_cancellation_reason.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

const migrate = async () => {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if column already exists
    const tableDesc = await qi.describeTable('Reservations');
    if (tableDesc.cancellationReason) {
      console.log('⏭  cancellationReason column already exists — skipping');
      process.exit(0);
    }

    await qi.addColumn('Reservations', 'cancellationReason', {
      type: require('sequelize').DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      after: 'notes', // MySQL: place after notes column
    });

    console.log('✅ Added cancellationReason column to Reservations table');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
