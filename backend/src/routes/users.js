const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search — any authenticated user can search other users by name
// Used by chat to find people to message
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const where = {
      id: { [Op.ne]: req.user.id }, // exclude self
    };
    if (q.trim()) {
      where.name = { [Op.like]: `%${q.trim()}%` };
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'role', 'profilePicture'],
      limit: parseInt(limit),
      order: [['name', 'ASC']],
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;

    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({ total: count, page: parseInt(page), users: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id — admin only
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, address, role } = req.body;
    await user.update({ name, phone, address, role });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id — admin only (soft delete)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.destroy(); // paranoid soft delete
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
