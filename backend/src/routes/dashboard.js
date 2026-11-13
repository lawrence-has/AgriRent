const express = require('express');
const { Op } = require('sequelize');
const { User, Equipment, Reservation, Transaction } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/dashboard/stats — admin ─────────────────────────────
// OPTIMIZED: all counts run in parallel with Promise.all
router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const [
      totalUsers, totalEquipment, totalReservations,
      activeRentals, pendingReservations, completedRentals,
      recentReservations,
    ] = await Promise.all([
      User.count(),
      Equipment.count(),
      Reservation.count(),
      Reservation.count({ where: { status: 'active' } }),
      Reservation.count({ where: { status: 'pending' } }),
      Reservation.count({ where: { status: 'completed' } }),
      Reservation.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'status', 'totalCost', 'startDate', 'endDate', 'createdAt'],
        include: [
          { model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name'] },
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name'] },
        ],
      }),
    ]);

    res.json({
      success: true,
      totalUsers, totalEquipment, totalReservations,
      activeRentals, pendingReservations, completedRentals,
      recentReservations,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/dashboard/owner-stats — equipment owner ─────────────
// OPTIMIZED: equipment IDs fetched once; all counts run in parallel
router.get('/owner-stats', requireAuth, requireRole('owner'), async (req, res, next) => {
  try {
    // Fetch equipment IDs once
    const myEquipment = await Equipment.findAll({
      where: { ownerId: req.user.id },
      attributes: ['id'],
    });
    const equipmentIds = myEquipment.map((e) => e.id);

    if (!equipmentIds.length) {
      return res.json({
        success: true,
        totalEquipment: 0, activeRentals: 0, pendingRequests: 0,
        completedRentals: 0, totalRevenue: 0, recentReservations: [],
      });
    }

    const eqFilter = { equipmentId: { [Op.in]: equipmentIds } };

    // All DB calls run in parallel
    const [
      totalEquipment, activeRentals, pendingRequests, completedRentals,
      revenueResult, recentReservations,
    ] = await Promise.all([
      Equipment.count({ where: { ownerId: req.user.id } }),
      Reservation.count({ where: { ...eqFilter, status: 'active' } }),
      Reservation.count({ where: { ...eqFilter, status: 'pending' } }),
      Reservation.count({ where: { ...eqFilter, status: 'completed' } }),
      // Use SUM in DB instead of fetching all rows and reducing in JS
      Reservation.findOne({
        where: { ...eqFilter, status: 'completed' },
        attributes: [[require('sequelize').fn('SUM', require('sequelize').col('totalCost')), 'totalRevenue']],
        raw: true,
      }),
      Reservation.findAll({
        where: eqFilter,
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'status', 'totalCost', 'startDate', 'endDate', 'createdAt'],
        include: [
          { model: Equipment, as: 'equipment', paranoid: false, attributes: ['id', 'name'] },
          { model: User, as: 'farmer', paranoid: false, attributes: ['id', 'name'] },
        ],
      }),
    ]);

    const totalRevenue = parseFloat(revenueResult?.totalRevenue || 0);

    res.json({
      success: true,
      totalEquipment, activeRentals, pendingRequests,
      completedRentals, totalRevenue, recentReservations,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/dashboard/farmer-stats — farmer ─────────────────────
// OPTIMIZED: all counts run in parallel; SUM done in DB not JS
router.get('/farmer-stats', requireAuth, requireRole('farmer'), async (req, res, next) => {
  try {
    const farmerFilter = { farmerId: req.user.id };

    const [
      totalReservations, activeRentals, pendingReservations, completedRentals,
      spentResult, recentReservations,
    ] = await Promise.all([
      Reservation.count({ where: farmerFilter }),
      Reservation.count({ where: { ...farmerFilter, status: 'active' } }),
      Reservation.count({ where: { ...farmerFilter, status: 'pending' } }),
      Reservation.count({ where: { ...farmerFilter, status: 'completed' } }),
      // SUM in DB — avoids loading all completed reservation rows into Node memory
      Reservation.findOne({
        where: { ...farmerFilter, status: 'completed' },
        attributes: [[require('sequelize').fn('SUM', require('sequelize').col('totalCost')), 'totalSpent']],
        raw: true,
      }),
      Reservation.findAll({
        where: farmerFilter,
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'status', 'totalCost', 'startDate', 'endDate', 'createdAt'],
        include: [{
          model: Equipment, as: 'equipment',
          paranoid: false,
          attributes: ['id', 'name', 'category'],
        }],
      }),
    ]);

    const totalSpent = parseFloat(spentResult?.totalSpent || 0);

    res.json({
      success: true,
      totalReservations, activeRentals, pendingReservations,
      completedRentals, totalSpent, recentReservations,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
