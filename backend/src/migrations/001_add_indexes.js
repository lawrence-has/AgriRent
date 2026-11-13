/**
 * Migration: 001_add_indexes
 *
 * Adds performance indexes to all major tables.
 * Safe to run multiple times — uses IF NOT EXISTS pattern via Sequelize queryInterface.
 *
 * Run with: node src/migrations/001_add_indexes.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

const addIndexSafely = async (queryInterface, table, fields, options = {}) => {
  const indexName = options.name || `${table}_${fields.join('_')}_idx`;
  try {
    await queryInterface.addIndex(table, fields, { ...options, name: indexName });
    console.log(`  ✅ Added index: ${indexName}`);
  } catch (err) {
    if (err.message && err.message.includes('Duplicate key name')) {
      console.log(`  ⏭  Index already exists: ${indexName}`);
    } else {
      throw err;
    }
  }
};

const migrate = async () => {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    console.log('📋 Users table indexes...');
    await addIndexSafely(qi, 'Users', ['role'], { name: 'users_role_idx' });
    await addIndexSafely(qi, 'Users', ['deletedAt'], { name: 'users_deleted_at_idx' });

    console.log('\n📋 Equipment table indexes...');
    await addIndexSafely(qi, 'Equipment', ['ownerId'], { name: 'equipment_owner_idx' });
    await addIndexSafely(qi, 'Equipment', ['status'], { name: 'equipment_status_idx' });
    await addIndexSafely(qi, 'Equipment', ['category'], { name: 'equipment_category_idx' });
    await addIndexSafely(qi, 'Equipment', ['dailyRate'], { name: 'equipment_daily_rate_idx' });
    await addIndexSafely(qi, 'Equipment', ['ownerId', 'status'], { name: 'equipment_owner_status_idx' });
    await addIndexSafely(qi, 'Equipment', ['status', 'category'], { name: 'equipment_status_category_idx' });
    await addIndexSafely(qi, 'Equipment', ['deletedAt'], { name: 'equipment_deleted_at_idx' });

    console.log('\n📋 Reservations table indexes...');
    await addIndexSafely(qi, 'Reservations', ['farmerId'], { name: 'reservations_farmer_idx' });
    await addIndexSafely(qi, 'Reservations', ['equipmentId'], { name: 'reservations_equipment_idx' });
    await addIndexSafely(qi, 'Reservations', ['status'], { name: 'reservations_status_idx' });
    await addIndexSafely(qi, 'Reservations', ['equipmentId', 'status'], { name: 'reservations_equipment_status_idx' });
    await addIndexSafely(qi, 'Reservations', ['equipmentId', 'startDate', 'endDate'], { name: 'reservations_equipment_dates_idx' });
    await addIndexSafely(qi, 'Reservations', ['farmerId', 'status'], { name: 'reservations_farmer_status_idx' });
    await addIndexSafely(qi, 'Reservations', ['deletedAt'], { name: 'reservations_deleted_at_idx' });

    console.log('\n📋 Transactions table indexes...');
    await addIndexSafely(qi, 'Transactions', ['reservationId'], { name: 'transactions_reservation_idx' });
    await addIndexSafely(qi, 'Transactions', ['status'], { name: 'transactions_status_idx' });
    await addIndexSafely(qi, 'Transactions', ['deletedAt'], { name: 'transactions_deleted_at_idx' });

    console.log('\n📋 Notifications table indexes...');
    await addIndexSafely(qi, 'Notifications', ['userId'], { name: 'notifications_user_idx' });
    await addIndexSafely(qi, 'Notifications', ['userId', 'isRead'], { name: 'notifications_user_read_idx' });
    await addIndexSafely(qi, 'Notifications', ['createdAt'], { name: 'notifications_created_at_idx' });
    await addIndexSafely(qi, 'Notifications', ['deletedAt'], { name: 'notifications_deleted_at_idx' });

    console.log('\n📋 ChatMessages table indexes...');
    await addIndexSafely(qi, 'ChatMessages', ['senderId'], { name: 'chat_messages_sender_idx' });
    await addIndexSafely(qi, 'ChatMessages', ['receiverId'], { name: 'chat_messages_receiver_idx' });
    await addIndexSafely(qi, 'ChatMessages', ['senderId', 'receiverId'], { name: 'chat_messages_conversation_idx' });
    await addIndexSafely(qi, 'ChatMessages', ['receiverId', 'isRead'], { name: 'chat_messages_unread_idx' });
    await addIndexSafely(qi, 'ChatMessages', ['createdAt'], { name: 'chat_messages_created_at_idx' });
    await addIndexSafely(qi, 'ChatMessages', ['deletedAt'], { name: 'chat_messages_deleted_at_idx' });

    console.log('\n✅ Migration complete — all indexes applied.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
