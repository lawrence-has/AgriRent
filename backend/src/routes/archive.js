/**
 * Archive Routes — admin-only endpoints for viewing, restoring,
 * and permanently deleting archived records.
 *
 * Base path: /api/archive
 */
const express = require('express');
const { Op } = require('sequelize');
const { param } = require('express-validator');
const { Reservation, Transaction, Equipment, User, ChatMessage } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const {
  archiveReservation, restoreReservation,
  archiveTransaction, restoreTransaction,
  getArchiveSummary,
} = require('../services/archiveService');

const router = express.Router();

// All archive routes require admin
router.use(requireAuth, requireRole('admin'));

// ── GET /api/archive/summary ─────────────────────────────────────
// Count of archived records across all models
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await getArchiveSummary();
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/archive/reservations ────────────────────────────────
// List soft-deleted (archived) reservations
router.get('/reservations', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { deletedAt: { [Op.ne]: null } };
    if (status) where.status = status;

    const { count, rows } = await Reservation.findAndCountAll({
      paranoid: false,
      where,
      include: [
        {
          model: Equipment,
          as: 'equipment',
          paranoid: false, // show even if equipment is also soft-deleted
          attributes: ['id', 'name', 'category'],
        },
        {
          model: User,
          as: 'farmer',
          paranoid: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      limit: limitNum,
      offset,
      order: [['deletedAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, reservations: rows });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/archive/reservations/:id ───────────────────────────
// Archive (soft-delete) a reservation
router.post('/reservations/:id', validateId, async (req, res, next) => {
  try {
    const reservation = await archiveReservation(req.params.id);
    res.json({ success: true, message: 'Reservation archived successfully', reservation });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
});

// ── POST /api/archive/reservations/:id/restore ───────────────────
// Restore a soft-deleted reservation
router.post('/reservations/:id/restore', validateId, async (req, res, next) => {
  try {
    const reservation = await restoreReservation(req.params.id);
    res.json({ success: true, message: 'Reservation restored successfully', reservation });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
});

// ── DELETE /api/archive/reservations/:id ─────────────────────────
// HARD delete — permanently removes reservation (admin only, irreversible)
// Only allowed if already soft-deleted
router.delete('/reservations/:id', validateId, async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id },
      paranoid: false,
    });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });
    if (!reservation.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Reservation must be archived (soft-deleted) before permanent deletion',
      });
    }
    await reservation.destroy({ force: true }); // permanent
    res.json({ success: true, message: 'Reservation permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/archive/transactions ────────────────────────────────
// List soft-deleted (archived) transactions
router.get('/transactions', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Transaction.findAndCountAll({
      paranoid: false,
      where: { deletedAt: { [Op.ne]: null } },
      include: [{
        model: Reservation,
        as: 'reservation',
        paranoid: false,
        include: [
          { model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name'] },
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name'] },
        ],
      }],
      limit: limitNum,
      offset,
      order: [['deletedAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, transactions: rows });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/archive/transactions/:id ───────────────────────────
// Archive (soft-delete) a transaction
router.post('/transactions/:id', validateId, async (req, res, next) => {
  try {
    const transaction = await archiveTransaction(req.params.id);
    res.json({ success: true, message: 'Transaction archived successfully', transaction });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
});

// ── POST /api/archive/transactions/:id/restore ───────────────────
// Restore a soft-deleted transaction
router.post('/transactions/:id/restore', validateId, async (req, res, next) => {
  try {
    const transaction = await restoreTransaction(req.params.id);
    res.json({ success: true, message: 'Transaction restored successfully', transaction });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
});

// ── GET /api/archive/equipment ────────────────────────────────────
// List soft-deleted equipment
router.get('/equipment', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Equipment.findAndCountAll({
      paranoid: false,
      where: { deletedAt: { [Op.ne]: null } },
      include: [{
        model: User,
        as: 'owner',
        paranoid: false,
        attributes: ['id', 'name', 'email'],
      }],
      limit: limitNum,
      offset,
      order: [['deletedAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, equipment: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/archive/users ────────────────────────────────────────
// List soft-deleted users
router.get('/users', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await User.findAndCountAll({
      paranoid: false,
      where: { deletedAt: { [Op.ne]: null } },
      limit: limitNum,
      offset,
      order: [['deletedAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, users: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/archive/chat-messages ───────────────────────────────
// List soft-deleted chat messages (admin view only)
router.get('/chat-messages', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await ChatMessage.findAndCountAll({
      paranoid: false,
      where: { deletedAt: { [Op.ne]: null } },
      include: [
        { model: User, as: 'sender', paranoid: false, attributes: ['id', 'name'] },
        { model: User, as: 'receiver', paranoid: false, attributes: ['id', 'name'] },
      ],
      limit: limitNum,
      offset,
      order: [['deletedAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, messages: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
