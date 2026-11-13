const express = require('express');
const { body, param } = require('express-validator');
const { Transaction, Reservation, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const { uploadTransactionImages } = require('../middleware/upload');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// ── GET /api/transactions/history ── completed transaction history ─
// Returns all transactions including soft-deleted (archived) ones
// Owners see their own equipment's history; admins see all
router.get('/history', requireAuth, requireRole('admin', 'owner'), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const equipmentInclude = {
      model: Equipment,
      as: 'equipment',
      paranoid: false,
      attributes: ['id', 'name', 'ownerId'],
    };

    if (req.user.role === 'owner') {
      equipmentInclude.where = { ownerId: req.user.id };
      equipmentInclude.required = true;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      paranoid: false, // include soft-deleted
      include: [{
        model: Reservation, as: 'reservation',
        paranoid: false,
        include: [
          equipmentInclude,
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'phone'] },
        ],
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
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build include with ownership scoping for owners
    const equipmentInclude = {
      model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name', 'ownerId'],
    };

    // Owners only see transactions for their own equipment
    if (req.user.role === 'owner') {
      equipmentInclude.where = { ownerId: req.user.id };
      equipmentInclude.required = true;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      include: [{
        model: Reservation, as: 'reservation',
        paranoid: false,
        include: [
          equipmentInclude,
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'phone'] },
        ],
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

// ── GET /api/transactions/:id ────────────────────────────────────
router.get('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{
        model: Reservation, as: 'reservation',
        paranoid: false,
        include: [
          { model: Equipment, as: 'equipment', paranoid: false },
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name', 'phone'] },
        ],
      }],
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // IDOR protection
    const equipmentOwnerId = transaction.reservation?.equipment?.ownerId;
    const farmerId = transaction.reservation?.farmerId;

    if (req.user.role === 'owner' && equipmentOwnerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this transaction' });
    }
    if (req.user.role === 'farmer' && farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this transaction' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/transactions ── owner releases equipment ───────────
router.post(
  '/',
  requireAuth,
  requireRole('owner'),
  uploadTransactionImages,
  [
    body('reservationId').isInt({ min: 1 }).withMessage('reservationId must be a positive integer'),
    body('releaseNotes').optional().trim().isLength({ max: 1000 }).withMessage('Release notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { reservationId, releaseNotes } = req.body;

      const reservation = await Reservation.findByPk(reservationId, {
        include: [{ model: Equipment, as: 'equipment' }],
      });

      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      if (reservation.equipment.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to release this equipment' });
      }
      if (reservation.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: `Reservation must be confirmed before release. Current status: ${reservation.status}`,
        });
      }

      // Check no existing transaction for this reservation
      const existing = await Transaction.findOne({ where: { reservationId } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A transaction already exists for this reservation' });
      }

      const releaseImages = req.files ? req.files.map((f) => `/uploads/transactions/${f.filename}`) : [];

      const transaction = await Transaction.create({
        reservationId,
        releaseDate: new Date(),
        releaseNotes: releaseNotes?.trim() || null,
        releaseImages,
        status: 'released',
      });

      await reservation.update({ status: 'active' });
      await reservation.equipment.update({ status: 'rented' });

      const io = req.app.get('io');
      await createNotification(
        reservation.farmerId,
        'Equipment Released',
        `"${reservation.equipment.name}" has been released to you. Rental period has started.`,
        'transaction',
        { transactionId: transaction.id, reservationId },
        io
      );

      res.status(201).json({ success: true, transaction });
    } catch (error) {
      next(error);
    }
  }
);

// ── PUT /api/transactions/:id ── owner records return ────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('owner'),
  uploadTransactionImages,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('returnNotes').optional().trim().isLength({ max: 1000 }).withMessage('Return notes must be 1000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const transaction = await Transaction.findByPk(req.params.id, {
        include: [{
          model: Reservation, as: 'reservation',
          include: [{ model: Equipment, as: 'equipment' }],
        }],
      });

      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

      if (transaction.reservation.equipment.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to record return for this transaction' });
      }
      if (transaction.status === 'returned') {
        return res.status(400).json({ success: false, message: 'Equipment has already been returned' });
      }

      const { returnNotes } = req.body;
      const returnImages = req.files ? req.files.map((f) => `/uploads/transactions/${f.filename}`) : [];

      await transaction.update({
        returnDate: new Date(),
        returnNotes: returnNotes?.trim() || null,
        returnImages,
        status: 'returned',
      });
      await transaction.reservation.update({ status: 'completed' });
      await transaction.reservation.equipment.update({ status: 'available' });

      const io = req.app.get('io');
      await createNotification(
        transaction.reservation.farmerId,
        'Rental Completed',
        `Your rental of "${transaction.reservation.equipment.name}" has been completed. Thank you!`,
        'transaction',
        { transactionId: transaction.id },
        io
      );

      res.json({ success: true, transaction });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
