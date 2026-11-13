/**
 * Migration: 003_transaction_unique_constraint
 *
 * Adds a UNIQUE constraint on Transactions.reservationId.
 * This is the DB-level guard against duplicate transaction records
 * per reservation — prevents race conditions even under concurrent load.
 *
 * Safe to run multiple times — skips if constraint already exists.
 *
 * Run with: node src/migrations/003_transaction_unique_constraint.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

const migrate = async () => {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if constraint already exists by trying to describe indexes
    const indexes = await qi.showIndex('Transactions');
    const alreadyExists = indexes.some(
      (idx) => idx.name === 'transactions_reservation_unique' && idx.unique
    );

    if (alreadyExists) {
      console.log('⏭  Unique constraint on Transactions.reservationId already exists — skipping');
      process.exit(0);
    }

    // Check for existing duplicate reservationIds before adding constraint
    const [duplicates] = await sequelize.query(
      `SELECT reservationId, COUNT(*) as cnt
       FROM Transactions
       GROUP BY reservationId
       HAVING cnt > 1`
    );

    if (duplicates.length > 0) {
      console.error('❌ Cannot add unique constraint: duplicate reservationId values exist:');
      duplicates.forEach((d) => console.error(`  reservationId: ${d.reservationId} (${d.cnt} records)`));
      console.error('  Resolve duplicates manually before running this migration.');
      process.exit(1);
    }

    await qi.addIndex('Transactions', ['reservationId'], {
      unique: true,
      name: 'transactions_reservation_unique',
    });

    console.log('✅ Added UNIQUE constraint on Transactions.reservationId');
    process.exit(0);
  } catch (err) {
    if (err.message && err.message.includes('Duplicate key name')) {
      console.log('⏭  Constraint already exists');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
