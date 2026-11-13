const express = require('express');
const { Op, literal, fn, col } = require('sequelize');
const { body, param } = require('express-validator');
const { ChatMessage, User, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation, validatePagination } = require('../middleware/validate');

const router = express.Router();

// ── GET /api/chat/conversations ──────────────────────────────────
// OPTIMIZED: replaced N+1 pattern (1 query per partner) with
// a single raw query that gets partners + lastMessage + unreadCount
// in one pass using GROUP BY + subquery.
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Step 1: Get all unique partner IDs in one query (no N+1)
    const [sentRows] = await sequelize.query(
      `SELECT DISTINCT receiverId AS partnerId FROM ChatMessages
       WHERE senderId = :userId AND deletedAt IS NULL AND receiverId != :userId`,
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
    );
    const [receivedRows] = await sequelize.query(
      `SELECT DISTINCT senderId AS partnerId FROM ChatMessages
       WHERE receiverId = :userId AND deletedAt IS NULL AND senderId != :userId`,
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
    );

    // Merge unique partner IDs
    const partnerIdSet = new Set();
    if (Array.isArray(sentRows)) sentRows.forEach((r) => r && partnerIdSet.add(r.partnerId));
    else if (sentRows) partnerIdSet.add(sentRows.partnerId);

    if (Array.isArray(receivedRows)) receivedRows.forEach((r) => r && partnerIdSet.add(r.partnerId));
    else if (receivedRows) partnerIdSet.add(receivedRows.partnerId);

    const partnerIds = [...partnerIdSet].filter(Boolean);

    if (!partnerIds.length) {
      return res.json({ success: true, conversations: [] });
    }

    // Step 2: Fetch all partners in ONE query
    const partners = await User.findAll({
      where: { id: { [Op.in]: partnerIds } },
      attributes: ['id', 'name', 'profilePicture', 'role'],
      paranoid: false,
    });

    // Step 3: Fetch last message per conversation in ONE query using subquery
    const lastMessages = await ChatMessage.findAll({
      where: {
        id: {
          [Op.in]: literal(`(
            SELECT MAX(id) FROM ChatMessages
            WHERE deletedAt IS NULL
            AND (
              (senderId = ${userId} AND receiverId IN (${partnerIds.join(',')}))
              OR
              (receiverId = ${userId} AND senderId IN (${partnerIds.join(',')}))
            )
            GROUP BY
              LEAST(senderId, receiverId),
              GREATEST(senderId, receiverId)
          )`),
        },
      },
      attributes: ['id', 'senderId', 'receiverId', 'message', 'isRead', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Step 4: Count unread per partner in ONE query
    const [unreadRows] = await sequelize.query(
      `SELECT senderId, COUNT(*) AS unreadCount
       FROM ChatMessages
       WHERE receiverId = :userId AND isRead = false AND deletedAt IS NULL
         AND senderId IN (:partnerIds)
       GROUP BY senderId`,
      {
        replacements: { userId, partnerIds },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Build unread map
    const unreadMap = {};
    const unreadArr = Array.isArray(unreadRows) ? unreadRows : (unreadRows ? [unreadRows] : []);
    unreadArr.forEach((r) => { if (r) unreadMap[r.senderId] = parseInt(r.unreadCount); });

    // Build last message map
    const lastMessageMap = {};
    lastMessages.forEach((m) => {
      const pid = m.senderId === userId ? m.receiverId : m.senderId;
      lastMessageMap[pid] = m;
    });

    // Assemble conversations
    const conversations = partners.map((partner) => ({
      partner,
      lastMessage: lastMessageMap[partner.id] || null,
      unreadCount: unreadMap[partner.id] || 0,
    }));

    // Sort by last message time descending
    conversations.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
      return bTime - aTime;
    });

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/chat/:userId ────────────────────────────────────────
router.get(
  '/:userId',
  requireAuth,
  [param('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer')],
  handleValidation,
  validatePagination,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const myId = req.user.id;
      const otherId = parseInt(req.params.userId);

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
          { model: User, as: 'sender', paranoid: false, attributes: ['id', 'name', 'profilePicture'] },
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

      if (parseInt(receiverId) === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot send a message to yourself' });
      }

      const receiver = await User.findByPk(receiverId, { attributes: ['id'] });
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
