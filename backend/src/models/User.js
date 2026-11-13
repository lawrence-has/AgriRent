const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('farmer', 'owner', 'admin'),
    allowNull: false,
    defaultValue: 'farmer',
  },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  profilePicture: { type: DataTypes.STRING, allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  paranoid: true,
  indexes: [
    // email is already unique — explicit index ensures the DB optimizer uses it
    { unique: true, fields: ['email'], name: 'users_email_unique' },
    // role filter used heavily in admin user listing and auth checks
    { fields: ['role'], name: 'users_role_idx' },
    // paranoid filter — most queries include WHERE deletedAt IS NULL
    { fields: ['deletedAt'], name: 'users_deleted_at_idx' },
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
