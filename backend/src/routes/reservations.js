const express = require('express');
const { differenceInDays, parseISO } = require('date-fns');
const { Reservation, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isEquipmentAvailable } = require('../services/availabilityService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// GET /api/reservations/my — farmer's own reservations
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { farmerId: req.user.id };
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: Equipment, as: 'equipment', include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ total: count, page: parseInt(page), reservations: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/reservations — admin sees all, owner sees equipment reservations
router.get('/', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status) where.status = status;

    let include = [
      { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'category', 'dailyRate'] },
      { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] },
    ];

    // Owner only sees reservations for their equipment
    if (req.user.role === 'owner') {
      include[0].where = { ownerId: req.user.id };
      include[0].required = true;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ total: count, page: parseInt(page), reservations: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/reservations/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Equipment, as: 'equipment', include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }] },
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] },
      ],
    });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json({ reservation });
  } catch (error) {
    next(error);
  }
});

// POST /api/reservations — farmer only
router.post('/', requireAuth, requireRole('farmer'), async (req, res, next) => {
  try {
    const { equipmentId, startDate, endDate, notes } = req.body;

    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    if (equipment.status !== 'available') {
      return res.status(400).json({ message: 'Equipment is not available for rental' });
    }

    // Check date availability
    const available = await isEquipmentAvailable(equipmentId, startDate, endDate);
    if (!available) {
      return res.status(409).json({ message: 'Equipment is already booked for the selected dates' });
    }

    // Calculate cost
    const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
    if (days < 1) return res.status(400).json({ message: 'End date must be after start date' });
    const totalCost = days * parseFloat(equipment.dailyRate);

    const reservation = await Reservation.create({
      farmerId: req.user.id,
      equipmentId,
      startDate,
      endDate,
      totalCost,
      notes,
      status: 'pending',
    });

    // Notify equipment owner
    const io = req.app.get('io');
    await createNotification(
      equipment.ownerId,
      'New Reservation Request',
      `${req.user.name} has requested to rent "${equipment.name}" from ${startDate} to ${endDate}`,
      'reservation',
      { reservationId: reservation.id },
      io
    );

    res.status(201).json({ reservation });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reservations/:id — owner confirms/cancels, farmer cancels
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Equipment, as: 'equipment' }],
    });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const { status, notes } = req.body;
    const io = req.app.get('io');

    // Owner: can confirm or cancel
    if (req.user.role === 'owner') {
      if (reservation.equipment.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (!['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Owner can only confirm or cancel' });
      }
    }
    // Farmer: can only cancel their own pending/confirmed reservations
    else if (req.user.role === 'farmer') {
      if (reservation.farmerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ message: 'Farmers can only cancel reservations' });
      }
      if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({ message: 'Cannot cancel this reservation' });
      }
    }

    await reservation.update({ status, notes: notes || reservation.notes });

    // Notify farmer of status change
    await createNotification(
      reservation.farmerId,
      `Reservation ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your reservation for "${reservation.equipment.name}" has been ${status}`,
      'reservation',
      { reservationId: reservation.id },
      io
    );

    res.json({ reservation });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reservations/:id — soft delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    await reservation.destroy();
    res.json({ message: 'Reservation deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
