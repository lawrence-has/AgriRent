const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  reservationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Reservations', key: 'id' },
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  returnDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  releaseNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  returnNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  releaseImages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  returnImages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('released', 'returned'),
    allowNull: false,
    defaultValue: 'released',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  paranoid: true,
});

module.exports = Transaction;
