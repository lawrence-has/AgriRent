const express = require('express');
const { Transaction, Reservation, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadTransactionImages } = require('../middleware/upload');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// GET /api/transactions — admin/owner
router.get('/', requireAuth, requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Transaction.findAndCountAll({
      include: [{
        model: Reservation,
        as: 'reservation',
        include: [
          { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'ownerId'] },
          { model: User, as: 'farmer', attributes: ['id', 'name', 'phone'] },
        ],
      }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ total: count, page: parseInt(page), transactions: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/transactions/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{
        model: Reservation,
        as: 'reservation',
        include: [
          { model: Equipment, as: 'equipment' },
          { model: User, as: 'farmer', attributes: ['id', 'name', 'phone'] },
        ],
      }],
    });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions — owner releases equipment
router.post('/', requireAuth, requireRole('owner'), uploadTransactionImages, async (req, res, next) => {
  try {
    const { reservationId, releaseNotes } = req.body;
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Equipment, as: 'equipment' }],
    });

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.equipment.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (reservation.status !== 'confirmed') {
      return res.status(400).json({ message: 'Reservation must be confirmed before release' });
    }

    const releaseImages = req.files ? req.files.map((f) => `/uploads/transactions/${f.filename}`) : [];

    const transaction = await Transaction.create({
      reservationId,
      releaseDate: new Date(),
      releaseNotes,
      releaseImages,
      status: 'released',
    });

    // Update reservation and equipment status
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

    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

// PUT /api/transactions/:id — owner records return
router.put('/:id', requireAuth, requireRole('owner'), uploadTransactionImages, async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{
        model: Reservation,
        as: 'reservation',
        include: [{ model: Equipment, as: 'equipment' }],
      }],
    });

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.reservation.equipment.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (transaction.status === 'returned') {
      return res.status(400).json({ message: 'Equipment already returned' });
    }

    const { returnNotes } = req.body;
    const returnImages = req.files ? req.files.map((f) => `/uploads/transactions/${f.filename}`) : [];

    await transaction.update({ returnDate: new Date(), returnNotes, returnImages, status: 'returned' });
    await transaction.reservation.update({ status: 'completed' });
    await transaction.reservation.equipment.update({ status: 'available' });

    const io = req.app.get('io');
    await createNotification(
      transaction.reservation.farmerId,
      'Rental Completed',
      `Your rental of "${transaction.reservation.equipment.name}" has been completed.`,
      'transaction',
      { transactionId: transaction.id },
      io
    );

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
