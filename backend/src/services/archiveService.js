/**
 * Archive Service — centralized soft-delete and restore operations.
 *
 * Rules:
 * - Soft delete sets deletedAt timestamp (paranoid).
 * - Hard delete is only allowed for admins and only on specific models.
 * - Restoration checks for conflicts before restoring.
 * - Business records (Reservation, Transaction) are never hard-deleted.
 */

const { Op } = require('sequelize');
const { Reservation, Transaction, Equipment, User } = require('../models');

// ── Reservation archiving ─────────────────────────────────────────

/**
 * Soft-archive a reservation (admin only).
 * Only cancelled or completed reservations can be archived.
 */
const archiveReservation = async (reservationId) => {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation) throw { status: 404, message: 'Reservation not found' };

  if (!['cancelled', 'completed'].includes(reservation.status)) {
    throw {
      status: 400,
      message: `Only cancelled or completed reservations can be archived. Current status: ${reservation.status}`,
    };
  }

  await reservation.destroy(); // soft delete
  return reservation;
};

/**
 * Restore a soft-deleted reservation.
 * Checks that the referenced equipment and farmer still exist.
 */
const restoreReservation = async (reservationId) => {
  const reservation = await Reservation.findOne({
    where: { id: reservationId },
    paranoid: false,
  });

  if (!reservation) throw { status: 404, message: 'Reservation not found' };
  if (!reservation.deletedAt) throw { status: 400, message: 'Reservation is not archived' };

  // Verify farmer still exists
  const farmer = await User.findByPk(reservation.farmerId);
  if (!farmer) throw { status: 400, message: 'Cannot restore: the associated farmer account no longer exists' };

  // Verify equipment still exists (paranoid: false to check)
  const equipment = await Equipment.findOne({
    where: { id: reservation.equipmentId },
    paranoid: false,
  });
  if (!equipment) throw { status: 400, message: 'Cannot restore: the associated equipment no longer exists' };

  await reservation.restore();
  return reservation;
};

// ── Transaction archiving ─────────────────────────────────────────

/**
 * Soft-archive a transaction (admin only).
 * Only completed (returned) transactions can be archived.
 */
const archiveTransaction = async (transactionId) => {
  const transaction = await Transaction.findByPk(transactionId);
  if (!transaction) throw { status: 404, message: 'Transaction not found' };

  if (transaction.status !== 'returned') {
    throw {
      status: 400,
      message: `Only completed (returned) transactions can be archived. Current status: ${transaction.status}`,
    };
  }

  await transaction.destroy(); // soft delete
  return transaction;
};

/**
 * Restore a soft-deleted transaction.
 * Checks that the parent reservation still exists.
 */
const restoreTransaction = async (transactionId) => {
  const transaction = await Transaction.findOne({
    where: { id: transactionId },
    paranoid: false,
  });

  if (!transaction) throw { status: 404, message: 'Transaction not found' };
  if (!transaction.deletedAt) throw { status: 400, message: 'Transaction is not archived' };

  // Verify parent reservation still exists
  const reservation = await Reservation.findOne({
    where: { id: transaction.reservationId },
    paranoid: false,
  });
  if (!reservation) {
    throw { status: 400, message: 'Cannot restore: the parent reservation no longer exists' };
  }

  await transaction.restore();
  return transaction;
};

// ── Equipment archiving ───────────────────────────────────────────

/**
 * Get summary of archived records for admin dashboard.
 */
const getArchiveSummary = async () => {
  const [users, equipment, reservations, transactions] = await Promise.all([
    User.count({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } }),
    Equipment.count({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } }),
    Reservation.count({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } }),
    Transaction.count({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } }),
  ]);

  return { users, equipment, reservations, transactions };
};

module.exports = {
  archiveReservation,
  restoreReservation,
  archiveTransaction,
  restoreTransaction,
  getArchiveSummary,
};
