/**
 * Migration: 005_chat_client_message_id
 *
 * Adds a client-generated message ID so offline chat retries are idempotent.
 *
 * Run with: node src/migrations/005_chat_client_message_id.js
 */
require('dotenv').config();
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const migrate = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const columns = await queryInterface.describeTable('ChatMessages');
    if (!columns.clientMessageId) {
      await queryInterface.addColumn('ChatMessages', 'clientMessageId', {
        type: DataTypes.STRING(80),
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex('ChatMessages');
    const hasUniqueIndex = indexes.some(
      (index) => index.name === 'chat_messages_client_message_unique'
    );
    if (!hasUniqueIndex) {
      await queryInterface.addIndex('ChatMessages', ['senderId', 'clientMessageId'], {
        unique: true,
        name: 'chat_messages_client_message_unique',
      });
    }

    console.log('Chat message idempotency migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Chat message idempotency migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
