const express = require('express');
const { Op } = require('sequelize');
const { User, Equipment, Reservation, Transaction } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — admin
router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [totalUsers, totalEquipment, totalReservations, activeRentals] = await Promise.all([
      User.count(),
      Equipment.count(),
      Reservation.count(),
      Reservation.count({ where: { status: 'active' } }),
    ]);

    const recentReservations = await Reservation.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Equipment, as: 'equipment', attributes: ['id', 'name'] },
        { model: User, as: 'farmer', attributes: ['id', 'name'] },
      ],
    });

    res.json({ totalUsers, totalEquipment, totalReservations, activeRentals, recentReservations });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/owner-stats — equipment owner
router.get('/owner-stats', requireAuth, requireRole('owner'), async (req, res, next) => {
  try {
    const myEquipment = await Equipment.findAll({ where: { ownerId: req.user.id }, attributes: ['id'] });
    const equipmentIds = myEquipment.map((e) => e.id);

    const [totalEquipment, activeRentals, pendingRequests, completedRentals] = await Promise.all([
      Equipment.count({ where: { ownerId: req.user.id } }),
      Reservation.count({ where: { equipmentId: { [Op.in]: equipmentIds }, status: 'active' } }),
      Reservation.count({ where: { equipmentId: { [Op.in]: equipmentIds }, status: 'pending' } }),
      Reservation.count({ where: { equipmentId: { [Op.in]: equipmentIds }, status: 'completed' } }),
    ]);

    const revenueResult = await Reservation.findAll({
      where: { equipmentId: { [Op.in]: equipmentIds }, status: 'completed' },
      attributes: ['totalCost'],
    });
    const totalRevenue = revenueResult.reduce((sum, r) => sum + parseFloat(r.totalCost), 0);

    const recentReservations = await Reservation.findAll({
      where: { equipmentId: { [Op.in]: equipmentIds } },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Equipment, as: 'equipment', attributes: ['id', 'name'] },
        { model: User, as: 'farmer', attributes: ['id', 'name'] },
      ],
    });

    res.json({ totalEquipment, activeRentals, pendingRequests, completedRentals, totalRevenue, recentReservations });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/farmer-stats — farmer
router.get('/farmer-stats', requireAuth, requireRole('farmer'), async (req, res, next) => {
  try {
    const [totalReservations, activeRentals, pendingReservations, completedRentals] = await Promise.all([
      Reservation.count({ where: { farmerId: req.user.id } }),
      Reservation.count({ where: { farmerId: req.user.id, status: 'active' } }),
      Reservation.count({ where: { farmerId: req.user.id, status: 'pending' } }),
      Reservation.count({ where: { farmerId: req.user.id, status: 'completed' } }),
    ]);

    const spentResult = await Reservation.findAll({
      where: { farmerId: req.user.id, status: 'completed' },
      attributes: ['totalCost'],
    });
    const totalSpent = spentResult.reduce((sum, r) => sum + parseFloat(r.totalCost), 0);

    const recentReservations = await Reservation.findAll({
      where: { farmerId: req.user.id },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: Equipment, as: 'equipment', attributes: ['id', 'name', 'category'] }],
    });

    res.json({ totalReservations, activeRentals, pendingReservations, completedRentals, totalSpent, recentReservations });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
