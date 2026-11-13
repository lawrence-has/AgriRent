const express = require('express');
const { differenceInDays, parseISO, isValid, isAfter, startOfDay } = require('date-fns');
const { body, param } = require('express-validator');
const { Reservation, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const { isEquipmentAvailable } = require('../services/availabilityService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

const VALID_STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

// ── GET /api/reservations/my ─────────────────────────────────────
router.get('/my', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { farmerId: req.user.id };

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [{
        model: Equipment, as: 'equipment',
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }],
      }],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, reservations: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/reservations ── admin/owner ─────────────────────────
router.get('/', requireAuth, requireRole('admin', 'owner'), validatePagination, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
    }

    let include = [
      { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'category', 'dailyRate', 'ownerId'] },
      { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] },
    ];

    if (req.user.role === 'owner') {
      include[0].where = { ownerId: req.user.id };
      include[0].required = true;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Reservation.findAndCountAll({
      where, include,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, reservations: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/reservations/:id ────────────────────────────────────
router.get('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: Equipment, as: 'equipment', include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }] },
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] },
      ],
    });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    res.json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/reservations ── farmer only ────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('farmer'),
  [
    body('equipmentId').isInt({ min: 1 }).withMessage('equipmentId must be a positive integer'),
    body('startDate')
      .notEmpty().withMessage('startDate is required')
      .isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    body('endDate')
      .notEmpty().withMessage('endDate is required')
      .isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { equipmentId, startDate, endDate, notes } = req.body;

      // Business date validation
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const today = startOfDay(new Date());

      if (!isValid(start) || !isValid(end)) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
      if (!isAfter(start, new Date(today.getTime() - 1))) {
        return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
      }
      if (!isAfter(end, start) && end.getTime() !== start.getTime()) {
        // allow same-day rentals
      }
      const days = differenceInDays(end, start) + 1;
      if (days < 1) {
        return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
      }

      const equipment = await Equipment.findByPk(equipmentId);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
      if (equipment.status !== 'available') {
        return res.status(400).json({ success: false, message: 'Equipment is not currently available for rental' });
      }

      const available = await isEquipmentAvailable(equipmentId, startDate, endDate);
      if (!available) {
        return res.status(409).json({ success: false, message: 'Equipment is already booked for the selected dates' });
      }

      const totalCost = days * parseFloat(equipment.dailyRate);

      const reservation = await Reservation.create({
        farmerId: req.user.id,
        equipmentId,
        startDate,
        endDate,
        totalCost,
        notes: notes?.trim() || null,
        status: 'pending',
      });

      const io = req.app.get('io');
      await createNotification(
        equipment.ownerId,
        'New Reservation Request',
        `${req.user.name} has requested to rent "${equipment.name}" from ${startDate} to ${endDate}`,
        'reservation',
        { reservationId: reservation.id },
        io
      );

      res.status(201).json({ success: true, reservation });
    } catch (error) {
      next(error);
    }
  }
);

// ── PUT /api/reservations/:id ────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('status').notEmpty().withMessage('status is required')
      .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const reservation = await Reservation.findByPk(req.params.id, {
        include: [{ model: Equipment, as: 'equipment' }],
      });
      if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

      const { status, notes } = req.body;
      const io = req.app.get('io');

      if (req.user.role === 'owner') {
        if (reservation.equipment.ownerId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Not authorized to update this reservation' });
        }
        if (!['confirmed', 'cancelled'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Owner can only confirm or cancel a reservation' });
        }
      } else if (req.user.role === 'farmer') {
        if (reservation.farmerId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Not authorized to update this reservation' });
        }
        if (status !== 'cancelled') {
          return res.status(400).json({ success: false, message: 'Farmers can only cancel reservations' });
        }
        if (!['pending', 'confirmed'].includes(reservation.status)) {
          return res.status(400).json({ success: false, message: `Cannot cancel a reservation with status: ${reservation.status}` });
        }
      }

      await reservation.update({ status, notes: notes?.trim() || reservation.notes });

      await createNotification(
        reservation.farmerId,
        `Reservation ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your reservation for "${reservation.equipment.name}" has been ${status}`,
        'reservation',
        { reservationId: reservation.id },
        io
      );

      res.json({ success: true, reservation });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/reservations/:id ── admin only ───────────────────
router.delete('/:id', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    await reservation.destroy();
    res.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
