const { Op, Transaction: SequelizeTransaction } = require('sequelize');
const { Reservation, sequelize } = require('../models');

/**
 * AVAILABILITY POLICY:
 * - 'confirmed' and 'active' reservations ALWAYS block dates.
 * - 'pending' reservations are advisory only — they do NOT block dates
 *   from being confirmed by the owner, but they DO prevent a second
 *   pending reservation from being created for the same dates.
 *
 * This means:
 *   - Farmer submits: check against confirmed+active+pending
 *   - Owner confirms: check against confirmed+active only (re-check)
 */
const HARD_BLOCK_STATUSES = ['confirmed', 'active'];
const SOFT_BLOCK_STATUSES = ['confirmed', 'active', 'pending'];

/**
 * Standard interval overlap formula.
 * Two ranges [a,b] and [c,d] overlap if: a <= d AND b >= c
 */
const buildOverlapWhere = (equipmentId, startDate, endDate, statuses, excludeId = null) => {
  const where = {
    equipmentId,
    status: { [Op.in]: statuses },
    startDate: { [Op.lte]: endDate },
    endDate: { [Op.gte]: startDate },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return where;
};

/**
 * Check availability for CREATING a new reservation (farmer).
 * Blocks if any confirmed, active, or pending reservation overlaps.
 * Returns { available: bool, conflictingReservation: Reservation|null }
 */
const checkAvailabilityForCreate = async (equipmentId, startDate, endDate, t = null) => {
  const options = {
    where: buildOverlapWhere(equipmentId, startDate, endDate, SOFT_BLOCK_STATUSES),
    attributes: ['id', 'startDate', 'endDate', 'status'],
  };
  if (t) options.transaction = t;

  const conflict = await Reservation.findOne(options);
  return { available: !conflict, conflictingReservation: conflict };
};

/**
 * Check availability for CONFIRMING a reservation (owner).
 * Re-checks ONLY against confirmed+active (not pending).
 * Uses SELECT ... FOR UPDATE to lock conflicting rows and prevent
 * concurrent confirmations of overlapping reservations.
 *
 * Must be called inside a Sequelize transaction.
 */
const checkAvailabilityForConfirm = async (equipmentId, startDate, endDate, excludeReservationId, t) => {
  if (!t) throw new Error('checkAvailabilityForConfirm requires a transaction');

  const conflict = await Reservation.findOne({
    where: buildOverlapWhere(equipmentId, startDate, endDate, HARD_BLOCK_STATUSES, excludeReservationId),
    attributes: ['id', 'startDate', 'endDate', 'status'],
    lock: t.LOCK.UPDATE, // row-level lock prevents concurrent confirmations
    transaction: t,
  });

  return { available: !conflict, conflictingReservation: conflict };
};

/**
 * Legacy function kept for backward compatibility.
 * New code should use checkAvailabilityForCreate / checkAvailabilityForConfirm.
 */
const isEquipmentAvailable = async (equipmentId, startDate, endDate, excludeReservationId = null) => {
  const result = await checkAvailabilityForCreate(equipmentId, startDate, endDate);
  return result.available;
};

/**
 * Get all booked date ranges for an equipment (for calendar display).
 * Returns confirmed+active (hard blocks) and pending (soft blocks) separately
 * so the frontend can show them differently.
 */
const getBookedDates = async (equipmentId) => {
  const reservations = await Reservation.findAll({
    where: {
      equipmentId,
      status: { [Op.in]: SOFT_BLOCK_STATUSES },
    },
    attributes: ['id', 'startDate', 'endDate', 'status'],
    order: [['startDate', 'ASC']],
  });

  return reservations.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    isHardBlock: HARD_BLOCK_STATUSES.includes(r.status),
  }));
};

module.exports = {
  isEquipmentAvailable,
  checkAvailabilityForCreate,
  checkAvailabilityForConfirm,
  getBookedDates,
  HARD_BLOCK_STATUSES,
  SOFT_BLOCK_STATUSES,
};
