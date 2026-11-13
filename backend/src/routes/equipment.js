const express = require('express');
const { Op } = require('sequelize');
const { body, param, query } = require('express-validator');
const { Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const { uploadEquipmentImages } = require('../middleware/upload');
const { getBookedDates } = require('../services/availabilityService');

const router = express.Router();

const VALID_CATEGORIES = ['tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];
const VALID_STATUSES = ['available', 'rented', 'maintenance', 'archived'];

// ── GET /api/equipment ── public ─────────────────────────────────
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const {
      category, location, minRate, maxRate,
      status, page = 1, limit = 12, search,
    } = req.query;

    const where = {};

    // Validate & apply filters
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
    }
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      where.category = category;
    }
    if (location) where.location = { [Op.like]: `%${location}%` };

    if (minRate !== undefined && isNaN(parseFloat(minRate))) {
      return res.status(400).json({ success: false, message: 'minRate must be a number' });
    }
    if (maxRate !== undefined && isNaN(parseFloat(maxRate))) {
      return res.status(400).json({ success: false, message: 'maxRate must be a number' });
    }
    if (minRate || maxRate) {
      where.dailyRate = {};
      if (minRate) where.dailyRate[Op.gte] = parseFloat(minRate);
      if (maxRate) where.dailyRate[Op.lte] = parseFloat(maxRate);
    }
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'address'] }],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, equipment: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/equipment/:id ── public ─────────────────────────────
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'address'] }],
    });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, equipment });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/equipment/:id/availability ── public ────────────────
router.get('/:id/availability', validateId, async (req, res, next) => {
  try {
    const bookedDates = await getBookedDates(req.params.id);
    res.json({ success: true, bookedDates });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/equipment ── owner/admin ───────────────────────────
router.post(
  '/',
  requireAuth,
  requireRole('owner', 'admin'),
  uploadEquipmentImages,
  [
    body('name').trim().notEmpty().withMessage('Equipment name is required')
      .isLength({ max: 150 }).withMessage('Name must be 150 characters or less'),
    body('category').isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('dailyRate').isFloat({ min: 1 })
      .withMessage('Daily rate must be a number greater than 0'),
    body('location').optional().trim()
      .isLength({ max: 200 }).withMessage('Location must be 200 characters or less'),
    body('description').optional().trim(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, category, description, dailyRate, specifications, location } = req.body;

      // Safely parse JSON specifications
      let parsedSpecs = {};
      if (specifications) {
        try {
          parsedSpecs = typeof specifications === 'string'
            ? JSON.parse(specifications)
            : specifications;
        } catch {
          return res.status(400).json({ success: false, message: 'specifications must be valid JSON' });
        }
      }

      const images = req.files ? req.files.map((f) => `/uploads/equipment/${f.filename}`) : [];

      const equipment = await Equipment.create({
        ownerId: req.user.id,
        name: name.trim(),
        category,
        description: description?.trim() || null,
        dailyRate: parseFloat(dailyRate),
        images,
        specifications: parsedSpecs,
        location: location?.trim() || null,
      });

      res.status(201).json({ success: true, equipment });
    } catch (error) {
      next(error);
    }
  }
);

// ── PUT /api/equipment/:id ── owner/admin ────────────────────────
router.put(
  '/:id',
  requireAuth,
  requireRole('owner', 'admin'),
  uploadEquipmentImages,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 150 }).withMessage('Name must be 150 characters or less'),
    body('category').optional().isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('dailyRate').optional().isFloat({ min: 1 })
      .withMessage('Daily rate must be a number greater than 0'),
    body('status').optional().isIn(VALID_STATUSES)
      .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('location').optional().trim()
      .isLength({ max: 200 }).withMessage('Location must be 200 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const equipment = await Equipment.findByPk(req.params.id);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

      if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this equipment' });
      }

      const { name, category, description, dailyRate, specifications, location, status } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name.trim();
      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description?.trim() || null;
      if (dailyRate !== undefined) updates.dailyRate = parseFloat(dailyRate);
      if (location !== undefined) updates.location = location?.trim() || null;
      if (status !== undefined) updates.status = status;

      if (specifications !== undefined) {
        try {
          updates.specifications = typeof specifications === 'string'
            ? JSON.parse(specifications)
            : specifications;
        } catch {
          return res.status(400).json({ success: false, message: 'specifications must be valid JSON' });
        }
      }

      if (req.files && req.files.length > 0) {
        updates.images = req.files.map((f) => `/uploads/equipment/${f.filename}`);
      }

      await equipment.update(updates);
      res.json({ success: true, equipment });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/equipment/:id ── owner/admin ─────────────────────
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), validateId, async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

    if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this equipment' });
    }

    await equipment.destroy();
    res.json({ success: true, message: 'Equipment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
