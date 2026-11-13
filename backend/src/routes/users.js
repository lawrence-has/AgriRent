const express = require('express');
const { Op } = require('sequelize');
const { body, param } = require('express-validator');
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');

const router = express.Router();

const VALID_ROLES = ['farmer', 'owner', 'admin'];

// ── GET /api/users/search ── any authenticated user ──────────────
// Used by chat to find users by name
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

// ── GET /api/users/stats ── admin only ───────────────────────────
// Summary counts used by admin dashboard
router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [totalFarmers, totalOwners, totalAdmins, total] = await Promise.all([
      User.count({ where: { role: 'farmer' } }),
      User.count({ where: { role: 'owner' } }),
      User.count({ where: { role: 'admin' } }),
      User.count(),
    ]);

    // Count soft-deleted users (paranoid scope off)
    const deletedCount = await User.count({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } });

    res.json({
      success: true,
      stats: { total, totalFarmers, totalOwners, totalAdmins, deletedCount },
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/users/deleted ── admin only — list soft-deleted users
router.get('/deleted', requireAuth, requireRole('admin'), validatePagination, async (req, res, next) => {
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

// ── GET /api/users ── admin only ─────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), validatePagination, async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `role must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }
      where.role = role;
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
      ];
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
// Own profile or admin → full details. Others → public fields only.
router.get('/:id', requireAuth, validateId, async (req, res, next) => {
  try {
    const requestedId = parseInt(req.params.id);
    const isSelf = requestedId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    const user = await User.findByPk(requestedId, {
      attributes: isAdmin || isSelf
        ? ['id', 'name', 'email', 'role', 'phone', 'address', 'profilePicture', 'createdAt']
        : ['id', 'name', 'role', 'profilePicture'],
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/users ── admin only — create a user directly ───────
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').normalizeEmail().isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .isLength({ max: 128 }).withMessage('Password must be less than 128 characters'),
    body('role').isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be 20 characters or less'),
    body('address').optional().trim(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, email, password, role, phone, address } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }

      const user = await User.create({
        name: name.trim(),
        email,
        password, // hashed by model hook
        role,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      });

      res.status(201).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// ── PUT /api/users/:id ── admin only ─────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 100 }).withMessage('Name must be 100 characters or less'),
    body('email').optional().normalizeEmail().isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be 20 characters or less'),
    body('address').optional().trim(),
    body('role').optional().isIn(VALID_ROLES)
      .withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const { name, email, phone, address, role } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone?.trim() || null;
      if (address !== undefined) updates.address = address?.trim() || null;
      if (role !== undefined) updates.role = role;

      // Admin can update email but must check uniqueness
      if (email !== undefined && email !== user.email) {
        const conflict = await User.findOne({ where: { email } });
        if (conflict) {
          return res.status(409).json({ success: false, message: 'Email is already in use by another account' });
        }
        updates.email = email;
      }

      await user.update(updates);
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/users/:id ── admin only — soft delete ────────────
router.delete('/:id', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await user.destroy(); // paranoid soft delete — sets deletedAt
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/users/:id/restore ── admin only — restore soft-deleted
router.post('/:id/restore', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      paranoid: false, // include soft-deleted
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.deletedAt) {
      return res.status(400).json({ success: false, message: 'User is not deactivated' });
    }

    await user.restore();
    res.json({ success: true, message: 'User restored successfully', user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
