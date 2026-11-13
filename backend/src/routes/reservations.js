const express = require('express');
const { differenceInDays, parseISO, isValid, isAfter, startOfDay } = require('date-fns');
const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const { Reservation, Equipment, User, sequelize } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const {
  checkAvailabilityForCreate,
  checkAvailabilityForConfirm,
} = require('../services/availabilityService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// ── Status transition rules ───────────────────────────────────────
// Defines which transitions are allowed per role.
// key = current status, value = allowed next statuses
const FARMER_TRANSITIONS = {
  pending:   ['cancelled'],
  confirmed: ['cancelled'],
  active:    [],            // cannot cancel once equipment is released
  completed: [],
  cancelled: [],
};

const OWNER_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  active:    [],            // controlled by transaction workflow
  completed: [],
  cancelled: [],
};

const ADMIN_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled'],
  active:    ['completed', 'cancelled'],
  completed: [],
  cancelled: ['pending'], // admin can reopen cancelled reservations
};

const MAX_RENTAL_DAYS = 365; // prevent unreasonably long reservations

// ── GET /api/reservations/history ────────────────────────────────
router.get('/history', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;

    let include = [
      { model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name', 'category', 'ownerId'] },
      { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'email'] },
    ];

    if (req.user.role === 'farmer') {
      where.farmerId = req.user.id;
    } else if (req.user.role === 'owner') {
      include[0].where = { ownerId: req.user.id };
      include[0].required = true;
    }

    const { count, rows } = await Reservation.findAndCountAll({
      paranoid: false,
      where, include,
      limit: limitNum, offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, reservations: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/reservations/my ─────────────────────────────────────
router.get('/my', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { farmerId: req.user.id };
    if (status) where.status = status;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [{
        model: Equipment, as: 'equipment',
        paranoid: false,
        include: [{ model: User, as: 'owner', paranoid: false, attributes: ['id', 'name', 'phone'] }],
      }],
      limit: limitNum, offset,
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
    if (status) where.status = status;

    let include = [
      { model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name', 'category', 'dailyRate', 'ownerId'] },
      { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'email', 'phone'] },
    ];

    if (req.user.role === 'owner') {
      include[0].where = { ownerId: req.user.id };
      include[0].required = true;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Reservation.findAndCountAll({
      where, include, limit: limitNum, offset,
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
        {
          model: Equipment, as: 'equipment', paranoid: false,
          include: [{ model: User, as: 'owner', paranoid: false, attributes: ['id', 'name', 'phone'] }],
        },
        { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'email', 'phone'] },
      ],
    });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (req.user.role === 'farmer' && reservation.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this reservation' });
    }
    if (req.user.role === 'owner' && reservation.equipment?.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this reservation' });
    }

    res.json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/reservations ── farmer only ────────────────────────
// Uses a DB transaction + re-check to prevent race conditions.
router.post(
  '/',
  requireAuth,
  requireRole('farmer'),
  [
    body('equipmentId').isInt({ min: 1 }).withMessage('equipmentId must be a positive integer'),
    body('startDate').notEmpty().withMessage('startDate is required')
      .isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    body('endDate').notEmpty().withMessage('endDate is required')
      .isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { equipmentId, startDate, endDate, notes } = req.body;

      // ── Date validation ────────────────────────────────────────
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const today = startOfDay(new Date());

      if (!isValid(start) || !isValid(end)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      if (start < today) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
      }
      const days = differenceInDays(end, start) + 1;
      if (days < 1) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
      }
      if (days > MAX_RENTAL_DAYS) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Rental duration cannot exceed ${MAX_RENTAL_DAYS} days`,
        });
      }

      // ── Equipment check (with row lock) ────────────────────────
      const equipment = await Equipment.findByPk(equipmentId, {
        transaction: t,
        lock: t.LOCK.UPDATE, // lock equipment row to prevent concurrent status changes
      });
      if (!equipment) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }
      if (equipment.status !== 'available') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Equipment is not available for rental. Current status: ${equipment.status}`,
        });
      }

      // ── Check if farmer already has a pending/confirmed reservation for this equipment ──
      const existingFarmerReservation = await Reservation.findOne({
        where: {
          farmerId: req.user.id,
          equipmentId,
          status: { [Op.in]: ['pending', 'confirmed'] },
        },
        transaction: t,
      });
      if (existingFarmerReservation) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'You already have a pending or confirmed reservation for this equipment',
        });
      }

      // ── Availability check (inside transaction) ────────────────
      const { available, conflictingReservation } = await checkAvailabilityForCreate(
        equipmentId, startDate, endDate, t
      );
      if (!available) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'Equipment is already reserved for the selected dates',
          conflict: conflictingReservation
            ? { startDate: conflictingReservation.startDate, endDate: conflictingReservation.endDate }
            : undefined,
        });
      }

      // ── Create reservation ─────────────────────────────────────
      const totalCost = days * parseFloat(equipment.dailyRate);
      const reservation = await Reservation.create({
        farmerId: req.user.id,
        equipmentId,
        startDate,
        endDate,
        totalCost,
        notes: notes?.trim() || null,
        status: 'pending',
      }, { transaction: t });

      await t.commit();

      // Notify owner (outside transaction — not critical path)
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
      await t.rollback();
      next(error);
    }
  }
);

// ── PUT /api/reservations/:id ── status transition ───────────────
// Owner confirms/cancels; Farmer cancels; Admin manages all transitions.
// When owner CONFIRMS, re-checks availability with locking.
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('status').notEmpty().withMessage('status is required')
      .isIn(['pending', 'confirmed', 'active', 'completed', 'cancelled'])
      .withMessage('Invalid status value'),
    body('notes').optional().trim().isLength({ max: 1000 }),
    body('cancellationReason').optional().trim().isLength({ max: 500 })
      .withMessage('Cancellation reason must be 500 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const reservation = await Reservation.findByPk(req.params.id, {
        include: [{ model: Equipment, as: 'equipment', paranoid: false }],
        transaction: t,
        lock: t.LOCK.UPDATE, // lock the reservation row
      });

      if (!reservation) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      const { status, notes, cancellationReason } = req.body;
      const currentStatus = reservation.status;

      // ── Validate transition by role ────────────────────────────
      let allowedTransitions;
      if (req.user.role === 'farmer') {
        if (reservation.farmerId !== req.user.id) {
          await t.rollback();
          return res.status(403).json({ success: false, message: 'Not authorized to update this reservation' });
        }
        allowedTransitions = FARMER_TRANSITIONS[currentStatus] || [];
      } else if (req.user.role === 'owner') {
        if (reservation.equipment?.ownerId !== req.user.id) {
          await t.rollback();
          return res.status(403).json({ success: false, message: 'Not authorized to update this reservation' });
        }
        allowedTransitions = OWNER_TRANSITIONS[currentStatus] || [];
      } else if (req.user.role === 'admin') {
        allowedTransitions = ADMIN_TRANSITIONS[currentStatus] || [];
      }

      if (!allowedTransitions.includes(status)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot transition from '${currentStatus}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
        });
      }

      // ── Re-check availability when CONFIRMING ──────────────────
      // This is the critical concurrency guard: two owners can't both
      // confirm the same dates for the same equipment simultaneously.
      if (status === 'confirmed') {
        const { available, conflictingReservation } = await checkAvailabilityForConfirm(
          reservation.equipmentId,
          reservation.startDate,
          reservation.endDate,
          reservation.id, // exclude self
          t
        );
        if (!available) {
          await t.rollback();
          return res.status(409).json({
            success: false,
            message: 'Cannot confirm: another reservation has already been confirmed for these dates',
            conflict: conflictingReservation
              ? { startDate: conflictingReservation.startDate, endDate: conflictingReservation.endDate }
              : undefined,
          });
        }

        // Auto-cancel other pending reservations for the same dates
        await Reservation.update(
          {
            status: 'cancelled',
            cancellationReason: 'Another reservation was confirmed for this equipment on these dates',
          },
          {
            where: {
              equipmentId: reservation.equipmentId,
              status: 'pending',
              id: { [Op.ne]: reservation.id },
              startDate: { [Op.lte]: reservation.endDate },
              endDate: { [Op.gte]: reservation.startDate },
            },
            transaction: t,
          }
        );
      }

      // ── Build updates ──────────────────────────────────────────
      const updates = { status };
      if (notes !== undefined) updates.notes = notes?.trim() || reservation.notes;
      if (status === 'cancelled' && cancellationReason) {
        updates.cancellationReason = cancellationReason.trim();
      }

      await reservation.update(updates, { transaction: t });
      await t.commit();

      // ── Notifications (outside transaction) ────────────────────
      const io = req.app.get('io');
      const equipmentName = reservation.equipment?.name || 'equipment';

      if (status === 'confirmed') {
        await createNotification(
          reservation.farmerId,
          'Reservation Confirmed',
          `Your reservation for "${equipmentName}" has been confirmed by the owner.`,
          'reservation', { reservationId: reservation.id }, io
        );
      } else if (status === 'cancelled') {
        const notifyId = req.user.role === 'farmer'
          ? reservation.equipment?.ownerId
          : reservation.farmerId;
        if (notifyId) {
          await createNotification(
            notifyId,
            'Reservation Cancelled',
            `The reservation for "${equipmentName}" has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
            'reservation', { reservationId: reservation.id }, io
          );
        }
      } else {
        await createNotification(
          reservation.farmerId,
          `Reservation ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          `Your reservation for "${equipmentName}" status is now: ${status}`,
          'reservation', { reservationId: reservation.id }, io
        );
      }

      res.json({ success: true, reservation });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
);

// ── DELETE /api/reservations/:id ── admin only ───────────────────
router.delete('/:id', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    // Safety: only allow archiving of terminal-state reservations
    if (['active', 'confirmed', 'pending'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a reservation with status '${reservation.status}'. Cancel it first.`,
      });
    }

    await reservation.destroy();
    res.json({ success: true, message: 'Reservation archived successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
