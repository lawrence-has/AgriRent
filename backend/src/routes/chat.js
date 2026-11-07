const express = require('express');
const { Op } = require('sequelize');
const { ChatMessage, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/conversations — list unique conversation partners
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all unique users this user has chatted with
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
      ...sent.map((m) => m.receiverId),
      ...received.map((m) => m.senderId),
    ]);

    const conversations = await Promise.all(
      [...partnerIds].map(async (partnerId) => {
        const partner = await User.findByPk(partnerId, {
          attributes: ['id', 'name', 'profilePicture', 'role'],
        });
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

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/:userId — get messages between current user and another user
router.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const myId = req.user.id;
    const otherId = parseInt(req.params.userId);
    const offset = (parseInt(page) - 1) * parseInt(limit);

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
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'ASC']],
    });

    // Mark received messages as read
    await ChatMessage.update(
      { isRead: true },
      { where: { senderId: otherId, receiverId: myId, isRead: false } }
    );

    res.json({ total: count, page: parseInt(page), messages: rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat — send a message (REST fallback; primary is socket.io)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { receiverId, message, reservationId } = req.body;
    if (!receiverId || !message) {
      return res.status(400).json({ message: 'receiverId and message are required' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) return res.status(404).json({ message: 'Recipient not found' });

    const chatMessage = await ChatMessage.create({
      senderId: req.user.id,
      receiverId,
      message,
      reservationId: reservationId || null,
    });

    const io = req.app.get('io');
    if (io) {
      const roomId = [req.user.id, receiverId].sort().join('_');
      io.to(`chat_${roomId}`).emit('new_message', {
        ...chatMessage.toJSON(),
        sender: { id: req.user.id, name: req.user.name, profilePicture: req.user.profilePicture },
      });
    }

    res.status(201).json({ message: chatMessage });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
