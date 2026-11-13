const express = require('express');
const { Notification } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validate');

const router = express.Router();

// ── GET /api/notifications ───────────────────────────────────────
router.get('/', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId: req.user.id },
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ success: true, total: count, unreadCount, page: pageNum, notifications: rows });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/notifications/read-all ─────────────────────────────
// Must be before /:id to avoid route conflict
router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/notifications/:id/read ─────────────────────────────
router.put('/:id/read', requireAuth, validateId, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

    await notification.update({ isRead: true });
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /api/notifications/:id ───────────────────────────────
router.delete('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

    await notification.destroy();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
