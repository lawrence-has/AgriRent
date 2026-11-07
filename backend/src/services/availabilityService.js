const { Op } = require('sequelize');
const { Reservation } = require('../models');

/**
 * Check if equipment is available for the given date range.
 * Returns true if available, false if there's a conflict.
 */
const isEquipmentAvailable = async (equipmentId, startDate, endDate, excludeReservationId = null) => {
  const where = {
    equipmentId,
    status: { [Op.in]: ['pending', 'confirmed', 'active'] },
    [Op.or]: [
      // New range starts within existing range
      { startDate: { [Op.between]: [startDate, endDate] } },
      // New range ends within existing range
      { endDate: { [Op.between]: [startDate, endDate] } },
      // New range completely covers existing range
      {
        startDate: { [Op.lte]: startDate },
        endDate: { [Op.gte]: endDate },
      },
    ],
  };

  if (excludeReservationId) {
    where.id = { [Op.ne]: excludeReservationId };
  }

  const conflict = await Reservation.findOne({ where });
  return !conflict;
};

/**
 * Get all booked date ranges for an equipment (for calendar display).
 */
const getBookedDates = async (equipmentId) => {
  const reservations = await Reservation.findAll({
    where: {
      equipmentId,
      status: { [Op.in]: ['pending', 'confirmed', 'active'] },
    },
    attributes: ['id', 'startDate', 'endDate', 'status'],
  });

  return reservations.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
  }));
};

module.exports = { isEquipmentAvailable, getBookedDates };
