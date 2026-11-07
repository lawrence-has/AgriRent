const express = require('express');
const { Op } = require('sequelize');
const { Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadEquipmentImages } = require('../middleware/upload');
const { getBookedDates } = require('../services/availabilityService');

const router = express.Router();

// GET /api/equipment — public
router.get('/', async (req, res, next) => {
  try {
    const { category, location, minRate, maxRate, status = 'available', page = 1, limit = 12, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (minRate || maxRate) {
      where.dailyRate = {};
      if (minRate) where.dailyRate[Op.gte] = minRate;
      if (maxRate) where.dailyRate[Op.lte] = maxRate;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'address'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ total: count, page: parseInt(page), equipment: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id — public
router.get('/:id', async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'address'] }],
    });
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id/availability — public
router.get('/:id/availability', async (req, res, next) => {
  try {
    const bookedDates = await getBookedDates(req.params.id);
    res.json({ bookedDates });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment — owner only
router.post('/', requireAuth, requireRole('owner', 'admin'), uploadEquipmentImages, async (req, res, next) => {
  try {
    const { name, category, description, dailyRate, specifications, location } = req.body;
    const images = req.files ? req.files.map((f) => `/uploads/equipment/${f.filename}`) : [];

    const equipment = await Equipment.create({
      ownerId: req.user.id,
      name,
      category,
      description,
      dailyRate,
      images,
      specifications: specifications ? JSON.parse(specifications) : {},
      location,
    });

    res.status(201).json({ equipment });
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipment/:id — owner/admin
router.put('/:id', requireAuth, requireRole('owner', 'admin'), uploadEquipmentImages, async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    // Owners can only update their own equipment
    if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this equipment' });
    }

    const { name, category, description, dailyRate, specifications, location, status } = req.body;
    const updates = { name, category, description, dailyRate, location, status };
    if (specifications) updates.specifications = JSON.parse(specifications);
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map((f) => `/uploads/equipment/${f.filename}`);
    }

    await equipment.update(updates);
    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/:id — owner/admin (soft delete)
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    if (req.user.role === 'owner' && equipment.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this equipment' });
    }

    await equipment.destroy();
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
