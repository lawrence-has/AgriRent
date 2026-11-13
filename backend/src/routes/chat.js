const express = require('express');
const { Op } = require('sequelize');
const { body, param } = require('express-validator');
const { ChatMessage, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation, validatePagination } = require('../middleware/validate');

const router = express.Router();

// ── GET /api/chat/conversations ──────────────────────────────────
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const sent = await ChatMessage.findAll({
      where: { senderId: userId },
      attributes: ['receiverId'],
      group: ['receiverId'],
    });
    const received = await ChatMessage.findAll({
      where: { receiverId: userId },
      attributes: ['senderId'],
      group: ['senderId'],
    });

    const partnerIds = new Set([
      ...sent.map((m) => m.receiverId).filter((id) => id !== userId),
      ...received.map((m) => m.senderId).filter((id) => id !== userId),
    ]);

    const conversations = await Promise.all(
      [...partnerIds].map(async (partnerId) => {
        const partner = await User.findByPk(partnerId, {
          attributes: ['id', 'name', 'profilePicture', 'role'],
        });
        // Skip deleted users
        if (!partner) return null;

        const lastMessage = await ChatMessage.findOne({
          where: {
            [Op.or]: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          },
          order: [['createdAt', 'DESC']],
        });
        const unreadCount = await ChatMessage.count({
          where: { senderId: partnerId, receiverId: userId, isRead: false },
        });
        return { partner, lastMessage, unreadCount };
      })
    );

    res.json({ success: true, conversations: conversations.filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/chat/:userId ────────────────────────────────────────
router.get(
  '/:userId',
  requireAuth,
  [
    param('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer'),
  ],
  handleValidation,
  validatePagination,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const myId = req.user.id;
      const otherId = parseInt(req.params.userId);

      // Prevent fetching messages with yourself
      if (otherId === myId) {
        return res.status(400).json({ success: false, message: 'Cannot fetch messages with yourself' });
      }

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      const { count, rows } = await ChatMessage.findAndCountAll({
        where: {
          [Op.or]: [
            { senderId: myId, receiverId: otherId },
            { senderId: otherId, receiverId: myId },
          ],
        },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'profilePicture'] },
        ],
        limit: limitNum,
        offset,
        order: [['createdAt', 'ASC']],
      });

      // Mark received messages as read
      await ChatMessage.update(
        { isRead: true },
        { where: { senderId: otherId, receiverId: myId, isRead: false } }
      );

      res.json({ success: true, total: count, page: pageNum, messages: rows });
    } catch (error) {
      next(error);
    }
  }
);

// ── POST /api/chat ── REST fallback ──────────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('receiverId').isInt({ min: 1 }).withMessage('receiverId must be a positive integer'),
    body('message').trim().notEmpty().withMessage('Message cannot be empty')
      .isLength({ max: 2000 }).withMessage('Message must be 2000 characters or less'),
    body('reservationId').optional().isInt({ min: 1 }).withMessage('reservationId must be a positive integer'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { receiverId, message, reservationId } = req.body;

      // Prevent messaging yourself
      if (parseInt(receiverId) === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot send a message to yourself' });
      }

      const receiver = await User.findByPk(receiverId);
      if (!receiver) return res.status(404).json({ success: false, message: 'Recipient not found' });

      const chatMessage = await ChatMessage.create({
        senderId: req.user.id,
        receiverId,
        message: message.trim(),
        reservationId: reservationId || null,
      });

      const io = req.app.get('io');
      if (io) {
        const roomId = [req.user.id, receiverId].sort().join('_');
        io.to(`chat_${roomId}`).emit('new_message', {
          ...chatMessage.toJSON(),
          sender: {
            id: req.user.id,
            name: req.user.name,
            profilePicture: req.user.profilePicture,
          },
        });
      }

      res.status(201).json({ success: true, message: chatMessage });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
