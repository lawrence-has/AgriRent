const express = require('express');
const { Op } = require('sequelize');
const { body, param } = require('express-validator');
const { Equipment, User, Reservation } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation, validateId, validatePagination } = require('../middleware/validate');
const { uploadEquipmentImages } = require('../middleware/upload');
const { getBookedDates } = require('../services/availabilityService');

const router = express.Router();

const VALID_CATEGORIES = ['tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];
const VALID_STATUSES = ['available', 'rented', 'maintenance', 'archived'];
const VALID_SORT_FIELDS = ['createdAt', 'dailyRate', 'name'];
const VALID_SORT_ORDERS = ['ASC', 'DESC'];

// ── GET /api/equipment/owner/me ── owner — own equipment list ─────
// Dedicated endpoint so owners don't need to filter the public list
router.get('/owner/me', requireAuth, requireRole('owner', 'admin'), validatePagination, async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20, search } = req.query;
    const ownerId = req.user.role === 'admin' && req.query.ownerId
      ? parseInt(req.query.ownerId)
      : req.user.id;

    const where = { ownerId };

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

    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Equipment.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, total: count, page: pageNum, equipment: rows });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/equipment ── public ─────────────────────────────────
// IMPORTANT: archived equipment is hidden from the public list by default.
// Only authenticated owners/admins see their own archived equipment via /owner/me.
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const {
      category, location, minRate, maxRate,
      status, page = 1, limit = 12, search,
      sortBy = 'createdAt', sortOrder = 'DESC',
    } = req.query;

    const where = {};

    // Public listing: exclude archived by default unless a valid non-archived status is requested
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      // Don't allow public filtering for archived — that's internal only
      if (status === 'archived') {
        return res.status(400).json({ success: false, message: 'Archived equipment is not publicly accessible' });
      }
      where.status = status;
    } else {
      // Default: exclude archived from public view
      where.status = { [Op.ne]: 'archived' };
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      where.category = category;
    }

    if (location && location.trim()) {
      where.location = { [Op.like]: `%${location.trim()}%` };
    }

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
      if (minRate && maxRate && parseFloat(minRate) > parseFloat(maxRate)) {
        return res.status(400).json({ success: false, message: 'minRate cannot be greater than maxRate' });
      }
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
        { location: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    // Validate sort params
    const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = VALID_SORT_ORDERS.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'address'] }],
      limit: limitNum,
      offset,
      order: [[sortField, sortDir]],
    });

    res.json({
      success: true,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      equipment: rows,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/equipment/:id ── public ─────────────────────────────
// Archived equipment is accessible by ID (for owner/admin use) but
// we return a flag so the frontend can show an appropriate message.
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
    // Confirm equipment exists
    const equipment = await Equipment.findByPk(req.params.id, { attributes: ['id', 'status'] });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

    const bookedDates = await getBookedDates(req.params.id);
    res.json({ success: true, equipmentStatus: equipment.status, bookedDates });
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
      .isLength({ min: 3, max: 150 }).withMessage('Name must be between 3 and 150 characters'),
    body('category').isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('dailyRate').isFloat({ min: 1, max: 999999 })
      .withMessage('Daily rate must be a number between 1 and 999,999'),
    body('location').optional().trim()
      .isLength({ max: 200 }).withMessage('Location must be 200 characters or less'),
    body('description').optional().trim()
      .isLength({ max: 2000 }).withMessage('Description must be 2000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, category, description, dailyRate, specifications, location } = req.body;

      let parsedSpecs = {};
      if (specifications) {
        try {
          parsedSpecs = typeof specifications === 'string'
            ? JSON.parse(specifications)
            : specifications;
          // Specs must be a plain object, not an array or primitive
          if (typeof parsedSpecs !== 'object' || Array.isArray(parsedSpecs)) {
            return res.status(400).json({ success: false, message: 'specifications must be a JSON object' });
          }
        } catch {
          return res.status(400).json({ success: false, message: 'specifications must be valid JSON' });
        }
      }

      const images = req.files ? req.files.map((f) => `/uploads/equipment/${f.filename}`) : [];

      // Admin creating equipment can specify ownerId; owner always uses their own id
      const ownerId = req.user.role === 'admin' && req.body.ownerId
        ? parseInt(req.body.ownerId)
        : req.user.id;

      const equipment = await Equipment.create({
        ownerId,
        name: name.trim(),
        category,
        description: description?.trim() || null,
        dailyRate: parseFloat(dailyRate),
        images,
        specifications: parsedSpecs,
        location: location?.trim() || null,
        status: 'available',
      });

      // Reload with owner association
      const created = await Equipment.findByPk(equipment.id, {
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }],
      });

      res.status(201).json({ success: true, equipment: created });
    } catch (error) {
      next(error);
    }
  }
);

// ── PUT /api/equipment/:id ── owner/admin — full update ──────────
router.put(
  '/:id',
  requireAuth,
  requireRole('owner', 'admin'),
  uploadEquipmentImages,
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ min: 3, max: 150 }).withMessage('Name must be between 3 and 150 characters'),
    body('category').optional().isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('dailyRate').optional().isFloat({ min: 1, max: 999999 })
      .withMessage('Daily rate must be a number between 1 and 999,999'),
    body('status').optional().isIn(VALID_STATUSES)
      .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('location').optional().trim()
      .isLength({ max: 200 }).withMessage('Location must be 200 characters or less'),
    body('description').optional().trim()
      .isLength({ max: 2000 }).withMessage('Description must be 2000 characters or less'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const equipment = await Equipment.findByPk(req.params.id);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

      if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not own this equipment' });
      }

      // Prevent status change to 'available' if currently rented
      const { status } = req.body;
      if (status === 'available' && equipment.status === 'rented') {
        return res.status(400).json({
          success: false,
          message: 'Cannot manually set status to available while equipment is rented. Complete the rental transaction first.',
        });
      }

      const { name, category, description, dailyRate, specifications, location } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name.trim();
      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description?.trim() || null;
      if (dailyRate !== undefined) updates.dailyRate = parseFloat(dailyRate);
      if (location !== undefined) updates.location = location?.trim() || null;
      if (status !== undefined) updates.status = status;

      if (specifications !== undefined) {
        try {
          const parsed = typeof specifications === 'string'
            ? JSON.parse(specifications)
            : specifications;
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            return res.status(400).json({ success: false, message: 'specifications must be a JSON object' });
          }
          updates.specifications = parsed;
        } catch {
          return res.status(400).json({ success: false, message: 'specifications must be valid JSON' });
        }
      }

      if (req.files && req.files.length > 0) {
        updates.images = req.files.map((f) => `/uploads/equipment/${f.filename}`);
      }

      await equipment.update(updates);

      const updated = await Equipment.findByPk(equipment.id, {
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone'] }],
      });

      res.json({ success: true, equipment: updated });
    } catch (error) {
      next(error);
    }
  }
);

// ── PATCH /api/equipment/:id/status ── owner/admin — status only ─
// Dedicated endpoint for changing just the status
// (archive, set to maintenance, mark available)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('owner', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('status').isIn(VALID_STATUSES)
      .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const equipment = await Equipment.findByPk(req.params.id);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

      if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You do not own this equipment' });
      }

      const { status } = req.body;

      // Business rules for status transitions
      if (equipment.status === 'rented' && status === 'available') {
        return res.status(400).json({
          success: false,
          message: 'Complete the active rental transaction before marking equipment as available.',
        });
      }
      if (equipment.status === 'rented' && status === 'archived') {
        return res.status(400).json({
          success: false,
          message: 'Cannot archive equipment that is currently rented.',
        });
      }

      await equipment.update({ status });
      res.json({ success: true, message: `Equipment status updated to "${status}"`, equipment });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/equipment/:id ── owner/admin — soft delete ────────
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), validateId, async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

    if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this equipment' });
    }

    // Prevent deleting currently rented equipment
    if (equipment.status === 'rented') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete equipment that is currently rented. Complete the rental first.',
      });
    }

    await equipment.destroy(); // paranoid soft delete
    res.json({ success: true, message: 'Equipment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/equipment/:id/restore ── admin only ─────────────────
router.post('/:id/restore', requireAuth, requireRole('admin'), validateId, async (req, res, next) => {
  try {
    const equipment = await Equipment.findOne({
      where: { id: req.params.id },
      paranoid: false,
    });

    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    if (!equipment.deletedAt) {
      return res.status(400).json({ success: false, message: 'Equipment is not deleted' });
    }

    await equipment.restore();
    await equipment.update({ status: 'available' }); // restore to available
    res.json({ success: true, message: 'Equipment restored successfully', equipment });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
