const express = require('express');
const { Op } = require('sequelize');
const { body, param, query } = require('express-validator');
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');

const router = express.Router();

const VALID_ROLES = ['farmer', 'owner', 'admin'];

// ── GET /api/users/search ── any authenticated user ──────────────
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const where = { id: { [Op.ne]: req.user.id } };
    if (q.trim()) {
      where.name = { [Op.like]: `%${q.trim().substring(0, 100)}%` };
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'role', 'profilePicture'],
      limit,
      order: [['name', 'ASC']],
    });

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/users ── admin only ─────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), validatePagination, async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: `role must be one of: ${VALID_ROLES.join(', ')}` });
      }
      where.role = role;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, users: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/users/:id ───────────────────────────────────────────
// Users can view their own profile (full).
// Authenticated users can view another user's public profile (limited fields).
// Admins can view any profile in full.
router.get('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const requestedId = parseInt(req.params.id);
    const isSelf = requestedId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    const user = await User.findByPk(requestedId, {
      // Always exclude password (handled by toJSON), but also limit fields for non-owners
      attributes: isAdmin || isSelf
        ? ['id', 'name', 'email', 'role', 'phone', 'address', 'profilePicture', 'createdAt']
        : ['id', 'name', 'role', 'profilePicture'], // public profile — no email/phone/address
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/users/:id ── admin only ─────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 100 }).withMessage('Name must be 100 characters or less'),
    body('phone').optional().trim()
      .isLength({ max: 20 }).withMessage('Phone must be 20 characters or less'),
    body('address').optional().trim(),
    body('role').optional().isIn(VALID_ROLES)
      .withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const { name, phone, address, role } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone?.trim() || null;
      if (address !== undefined) updates.address = address?.trim() || null;
      if (role !== undefined) updates.role = role;

      await user.update(updates);
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/users/:id ── admin only ──────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
