const express = require('express');
const { body, param, query } = require('express-validator');
const { Transaction, Reservation, Equipment, User, sequelize } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const { uploadTransactionImages } = require('../middleware/upload');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// ── Shared include builder ────────────────────────────────────────
const buildTransactionInclude = (ownerId = null) => {
  const equipmentInclude = {
    model: Equipment,
    as: 'equipment',
    paranoid: false,
    attributes: ['id', 'name', 'ownerId', 'category', 'dailyRate'],
  };
  if (ownerId) {
    equipmentInclude.where = { ownerId };
    equipmentInclude.required = true;
  }
  return [{
    model: Reservation,
    as: 'reservation',
    paranoid: false,
    include: [
      equipmentInclude,
      { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'phone', 'email'] },
    ],
  }];
};

// ── GET /api/transactions/history ── full history incl. archived ─
router.get('/history', requireAuth, requireRole('admin', 'owner'), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const ownerId = req.user.role === 'owner' ? req.user.id : null;
    const include = buildTransactionInclude(ownerId);

    const where = {};
    if (status && ['released', 'returned'].includes(status)) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      paranoid: false,
      where,
      include,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, transactions: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/transactions/my ── farmer's own rental transactions ─
// Farmers can view release and return records for their own reservations
router.get('/my', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status && ['released', 'returned'].includes(status)) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [{
        model: Reservation,
        as: 'reservation',
        required: true,
        paranoid: false,
        where: { farmerId: req.user.id }, // scope to farmer's own reservations
        include: [{
          model: Equipment,
          as: 'equipment',
          paranoid: false,
          attributes: ['id', 'name', 'category'],
        }],
      }],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, transactions: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/transactions ── admin/owner ─────────────────────────
router.get('/', requireAuth, requireRole('admin', 'owner'), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const ownerId = req.user.role === 'owner' ? req.user.id : null;
    const include = buildTransactionInclude(ownerId);

    const where = {};
    if (status && ['released', 'returned'].includes(status)) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, transactions: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/transactions/:id ────────────────────────────────────
router.get('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const txn = await Transaction.findByPk(req.params.id, {
      include: buildTransactionInclude(),
    });
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const equipmentOwnerId = txn.reservation?.equipment?.ownerId;
    const farmerId = txn.reservation?.farmerId;

    if (req.user.role === 'owner' && equipmentOwnerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this transaction' });
    }
    if (req.user.role === 'farmer' && farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this transaction' });
    }

    res.json({ success: true, transaction: txn });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/transactions ── owner releases equipment ───────────
// ATOMIC: wraps all DB changes in a transaction with row locking
// to prevent duplicate releases under concurrent requests.
router.post(
  '/',
  requireAuth,
  requireRole('owner'),
  uploadTransactionImages,
  [
    body('reservationId').isInt({ min: 1 }).withMessage('reservationId must be a positive integer'),
    body('releaseNotes').optional().trim()
      .isLength({ max: 1000 }).withMessage('Release notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { reservationId, releaseNotes } = req.body;

      // Lock the reservation row to prevent concurrent release attempts
      const reservation = await Reservation.findByPk(reservationId, {
        include: [{ model: Equipment, as: 'equipment', paranoid: false }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!reservation) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      // Ownership check
      if (reservation.equipment.ownerId !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'You do not own this equipment' });
      }

      // Status check
      if (reservation.status !== 'confirmed') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Reservation must be confirmed before release. Current status: ${reservation.status}`,
        });
      }

      // Idempotency check — the UNIQUE constraint on reservationId catches
      // concurrent duplicates at DB level, but we give a friendlier error here
      const existing = await Transaction.findOne({
        where: { reservationId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existing) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'Equipment has already been released for this reservation',
          existingTransactionId: existing.id,
        });
      }

      const releaseImages = req.files
        ? req.files.map((f) => `/uploads/transactions/${f.filename}`)
        : [];

      // All three writes in one atomic transaction
      const txn = await Transaction.create({
        reservationId,
        releaseDate: new Date(),
        releaseNotes: releaseNotes?.trim() || null,
        releaseImages,
        status: 'released',
      }, { transaction: t });

      await reservation.update({ status: 'active' }, { transaction: t });
      await reservation.equipment.update({ status: 'rented' }, { transaction: t });

      await t.commit();

      // Notification outside the DB transaction (not critical path)
      const io = req.app.get('io');
      await createNotification(
        reservation.farmerId,
        'Equipment Released',
        `"${reservation.equipment.name}" has been released to you. Your rental period has started.`,
        'transaction',
        { transactionId: txn.id, reservationId },
        io
      );

      // Return the full transaction with associations
      const full = await Transaction.findByPk(txn.id, { include: buildTransactionInclude() });
      res.status(201).json({ success: true, transaction: full });
    } catch (error) {
      await t.rollback();
      // Handle DB-level unique constraint violation (concurrent duplicate release)
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'A release transaction already exists for this reservation',
        });
      }
      next(error);
    }
  }
);

// ── PUT /api/transactions/:id ── owner records return ────────────
// ATOMIC: wraps all DB changes in a transaction with row locking.
// Prevents double-return and ensures reservation + equipment status
// are updated atomically with the transaction record.
router.put(
  '/:id',
  requireAuth,
  requireRole('owner'),
  uploadTransactionImages,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('returnNotes').optional().trim()
      .isLength({ max: 1000 }).withMessage('Return notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      // Lock the transaction row to prevent concurrent return attempts
      const txn = await Transaction.findByPk(req.params.id, {
        include: [{
          model: Reservation,
          as: 'reservation',
          paranoid: false,
          include: [{ model: Equipment, as: 'equipment', paranoid: false }],
        }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!txn) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      const equipment = txn.reservation?.equipment;
      const reservation = txn.reservation;

      // Ownership check
      if (!equipment || equipment.ownerId !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'You do not have permission to record this return' });
      }

      // Idempotency guard — prevent double return
      if (txn.status === 'returned') {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'This equipment has already been returned',
          returnDate: txn.returnDate,
        });
      }

      // Must be in released state
      if (txn.status !== 'released') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot record return for a transaction with status: ${txn.status}`,
        });
      }

      const returnDate = new Date();

      // Validate return date is not before release date
      if (txn.releaseDate && returnDate < new Date(txn.releaseDate)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Return date cannot be before the release date',
        });
      }

      const { returnNotes } = req.body;
      const returnImages = req.files
        ? req.files.map((f) => `/uploads/transactions/${f.filename}`)
        : [];

      // Atomic: update transaction + reservation + equipment together
      await txn.update({
        returnDate,
        returnNotes: returnNotes?.trim() || null,
        returnImages,
        status: 'returned',
      }, { transaction: t });

      await reservation.update({ status: 'completed' }, { transaction: t });
      await equipment.update({ status: 'available' }, { transaction: t });

      await t.commit();

      // Notification outside the DB transaction
      const io = req.app.get('io');
      await createNotification(
        reservation.farmerId,
        'Rental Completed',
        `Your rental of "${equipment.name}" has been completed successfully. Thank you!`,
        'transaction',
        { transactionId: txn.id },
        io
      );

      // Also notify the owner
      await createNotification(
        req.user.id,
        'Return Recorded',
        `"${equipment.name}" has been returned and marked as available.`,
        'transaction',
        { transactionId: txn.id },
        io
      );

      const full = await Transaction.findByPk(txn.id, { include: buildTransactionInclude() });
      res.json({ success: true, transaction: full });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
);

module.exports = router;
