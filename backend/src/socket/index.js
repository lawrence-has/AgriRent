const jwt = require('jsonwebtoken');
const { User, ChatMessage } = require('../models');

const onlineUsers = new Map(); // userId -> Set of socketIds (user can have multiple tabs)

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

    // Track multiple sockets per user (multiple tabs/devices)
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join personal notification room
    socket.join(`user_${userId}`);

    // Broadcast online status to everyone
    io.emit('user_online', { userId });

    console.log(`[Socket] User ${socket.user.name} (${userId}) connected — ${socket.id}`);

    // ── Join a chat room ──────────────────────────────────────────
    socket.on('join_chat', ({ withUserId }) => {
      if (!withUserId) return;
      const roomId = getRoomId(userId, withUserId);
      socket.join(`chat_${roomId}`);
    });

    // ── Send a message ────────────────────────────────────────────
    socket.on('send_message', async ({ receiverId, message, reservationId }) => {
      try {
        if (!receiverId || !message?.trim()) return;

        // Authorization: users can only send to others, not themselves
        if (parseInt(receiverId) === userId) {
          return socket.emit('error', { message: 'Cannot message yourself' });
        }

        // Verify receiver exists
        const receiver = await User.findByPk(receiverId, { attributes: ['id'] });
        if (!receiver) return socket.emit('error', { message: 'Recipient not found' });

        const chatMessage = await ChatMessage.create({
          senderId: userId,
          receiverId: parseInt(receiverId),
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

        // Emit to the shared chat room (both users if both are in it)
        const roomId = getRoomId(userId, parseInt(receiverId));
        io.to(`chat_${roomId}`).emit('new_message', payload);

        // Notify receiver's personal room (for unread badge / toast)
        // even if they haven't opened the chat room
        io.to(`user_${receiverId}`).emit('message_notification', {
          senderId: userId,
          senderName: socket.user.name,
          preview: message.trim().substring(0, 60),
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

        await ChatMessage.update(
          { isRead: true },
          {
            where: {
              senderId: parseInt(withUserId),
              receiverId: userId,
              isRead: false,
            },
          }
        );

        // Tell the sender their messages were read
        const roomId = getRoomId(userId, parseInt(withUserId));
        io.to(`chat_${roomId}`).emit('message_read', {
          byUserId: userId,
          withUserId: parseInt(withUserId),
        });

        // Also emit directly to sender's personal room in case they're not in the room
        io.to(`user_${withUserId}`).emit('message_read', {
          byUserId: userId,
          withUserId: parseInt(withUserId),
        });

      } catch (err) {
        console.error('[Socket] mark_read error:', err);
      }
    });

    // ── Typing indicator ──────────────────────────────────────────
    socket.on('typing', ({ toUserId, isTyping }) => {
      if (!toUserId) return;
      const roomId = getRoomId(userId, parseInt(toUserId));
      socket.to(`chat_${roomId}`).emit('typing', {
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
      console.log(`[Socket] User ${socket.user.name} (${userId}) disconnected — ${reason}`);
    });
  });
};

// Deterministic room ID: always same regardless of who initiates
const getRoomId = (a, b) => [a, b].sort((x, y) => x - y).join('_');

const getOnlineUsers = () => onlineUsers;

module.exports = { initSocket, getOnlineUsers };
