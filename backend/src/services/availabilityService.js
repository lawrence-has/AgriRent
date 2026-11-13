const { Op } = require('sequelize');
const { Reservation } = require('../models');

/**
 * Check if equipment is available for the given date range.
 * Returns true if available, false if there's a conflict.
 *
 * OPTIMIZED: uses the composite index (equipmentId, status) added to Reservations.
 * The date overlap check uses the standard interval overlap formula:
 *   existing.startDate <= newEndDate AND existing.endDate >= newStartDate
 * This is more efficient than the previous 3-condition OR which prevented index use.
 */
const isEquipmentAvailable = async (equipmentId, startDate, endDate, excludeReservationId = null) => {
  const where = {
    equipmentId,
    status: { [Op.in]: ['pending', 'confirmed', 'active'] },
    // Standard overlap formula — MySQL can use the equipmentId+status composite index
    // then filter dates. Much faster than the previous 3-way OR.
    startDate: { [Op.lte]: endDate },   // existing starts before new ends
    endDate: { [Op.gte]: startDate },   // existing ends after new starts
  };

  if (excludeReservationId) {
    where.id = { [Op.ne]: excludeReservationId };
  }

  const conflict = await Reservation.findOne({
    where,
    attributes: ['id'], // only fetch the id — no need for full row
  });

  return !conflict;
};

/**
 * Get all booked date ranges for an equipment (for calendar display).
 * Uses the (equipmentId, status) composite index.
 */
const getBookedDates = async (equipmentId) => {
  const reservations = await Reservation.findAll({
    where: {
      equipmentId,
      status: { [Op.in]: ['pending', 'confirmed', 'active'] },
    },
    attributes: ['id', 'startDate', 'endDate', 'status'], // only needed columns
    order: [['startDate', 'ASC']], // sorted for frontend calendar rendering
  });

  return reservations.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
  }));
};

module.exports = { isEquipmentAvailable, getBookedDates };
