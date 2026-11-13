const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, ChatMessage } = require('../models');

const onlineUsers = new Map(); // userId -> Set of socketIds

// Deterministic room ID — always same regardless of who initiates
const getRoomId = (a, b) => [Number(a), Number(b)].sort((x, y) => x - y).join('_');

/**
 * Verify that a user is authorized to be in a chat with another user.
 * Currently allows any two authenticated users to chat.
 * Extend this if you want to restrict chat to users with shared reservations.
 */
const canChat = async (userId, withUserId) => {
  if (userId === withUserId) return false;
  // Both users must exist and not be soft-deleted
  const [user, other] = await Promise.all([
    User.findByPk(userId, { attributes: ['id'] }),
    User.findByPk(withUserId, { attributes: ['id'] }),
  ]);
  return !!(user && other);
};

const initSocket = (io) => {

  // ── Auth middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'role', 'profilePicture'],
      });
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // ── Connection ──────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user_${userId}`);
    io.emit('user_online', { userId });

    console.log(`[Socket] ${socket.user.name} (${userId}) connected — ${socket.id}`);

    // ── Join a chat room (with authorization check) ───────────────
    socket.on('join_chat', async ({ withUserId }) => {
      try {
        if (!withUserId) return;
        const targetId = Number(withUserId);

        // SECURITY: verify both users exist and are allowed to chat
        const authorized = await canChat(userId, targetId);
        if (!authorized) {
          socket.emit('error', { message: 'Not authorized to join this chat' });
          return;
        }

        const roomId = getRoomId(userId, targetId);
        socket.join(`chat_${roomId}`);

        // Sync: send any messages missed since last seen
        // Find the last message this socket received for this conversation
        // by looking at the last message ID the client has
      } catch (err) {
        console.error('[Socket] join_chat error:', err);
      }
    });

    // ── Sync missed messages after reconnect ──────────────────────
    socket.on('sync_messages', async ({ withUserId, lastMessageId }) => {
      try {
        if (!withUserId) return;
        const targetId = Number(withUserId);

        const authorized = await canChat(userId, targetId);
        if (!authorized) return;

        const where = {
          [Op.or]: [
            { senderId: userId, receiverId: targetId },
            { senderId: targetId, receiverId: userId },
          ],
        };

        // Only fetch messages newer than the last known one
        if (lastMessageId) {
          where.id = { [Op.gt]: lastMessageId };
        }

        const missed = await ChatMessage.findAll({
          where,
          include: [{ model: User, as: 'sender', paranoid: false, attributes: ['id', 'name', 'profilePicture'] }],
          order: [['createdAt', 'ASC']],
          limit: 50,
        });

        if (missed.length > 0) {
          socket.emit('missed_messages', { withUserId: targetId, messages: missed.map(m => m.toJSON()) });
        }
      } catch (err) {
        console.error('[Socket] sync_messages error:', err);
      }
    });

    // ── Send a message ────────────────────────────────────────────
    socket.on('send_message', async ({ receiverId, message, reservationId }) => {
      try {
        if (!receiverId || !message?.trim()) return;

        const targetId = Number(receiverId);

        // SECURITY: never trust client-supplied user IDs for sender
        // Always use socket.user.id as the senderId
        if (targetId === userId) {
          return socket.emit('error', { message: 'Cannot message yourself' });
        }

        // Verify receiver exists
        const receiver = await User.findByPk(targetId, { attributes: ['id'] });
        if (!receiver) return socket.emit('error', { message: 'Recipient not found' });

        const chatMessage = await ChatMessage.create({
          senderId: userId,       // ALWAYS from server — never from client payload
          receiverId: targetId,
          message: message.trim(),
          reservationId: reservationId || null,
          isRead: false,
        });

        const payload = {
          ...chatMessage.toJSON(),
          sender: {
            id: socket.user.id,
            name: socket.user.name,
            profilePicture: socket.user.profilePicture,
          },
        };

        // Emit to receiver's personal room (always reaches them)
        io.to(`user_${targetId}`).emit('new_message', payload);

        // Emit to sender's other tabs
        socket.to(`user_${userId}`).emit('new_message', payload);

        // Confirm back to this sender socket (replaces optimistic)
        socket.emit('message_sent', payload);

        // Toast notification for receiver if they're not in the chat
        io.to(`user_${targetId}`).emit('message_notification', {
          senderId: userId,
          senderName: socket.user.name,
          preview: message.trim().substring(0, 60),
          messageId: chatMessage.id,
        });

      } catch (err) {
        console.error('[Socket] send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Mark messages as read ─────────────────────────────────────
    socket.on('mark_read', async ({ withUserId }) => {
      try {
        if (!withUserId) return;
        const targetId = Number(withUserId);

        // SECURITY: only mark messages sent TO this user as read
        await ChatMessage.update(
          { isRead: true },
          {
            where: {
              senderId: targetId,
              receiverId: userId, // must be this user's received messages
              isRead: false,
            },
          }
        );

        const roomId = getRoomId(userId, targetId);
        io.to(`chat_${roomId}`).emit('message_read', {
          byUserId: userId,
          withUserId: targetId,
        });
        io.to(`user_${targetId}`).emit('message_read', {
          byUserId: userId,
          withUserId: targetId,
        });

      } catch (err) {
        console.error('[Socket] mark_read error:', err);
      }
    });

    // ── Typing indicator ──────────────────────────────────────────
    socket.on('typing', ({ toUserId, isTyping }) => {
      if (!toUserId) return;
      const targetId = Number(toUserId);
      const roomId = getRoomId(userId, targetId);
      // Emit to the room AND directly to receiver's personal room
      // (in case they haven't joined the chat room yet)
      socket.to(`chat_${roomId}`).emit('typing', {
        fromUserId: userId,
        fromName: socket.user.name,
        isTyping,
      });
      socket.to(`user_${targetId}`).emit('typing', {
        fromUserId: userId,
        fromName: socket.user.name,
        isTyping,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
        }
      }
      console.log(`[Socket] ${socket.user.name} (${userId}) disconnected — ${reason}`);
    });
  });
};

const getOnlineUsers = () => onlineUsers;

module.exports = { initSocket, getOnlineUsers };
