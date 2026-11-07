const jwt = require('jsonwebtoken');
const { User, ChatMessage } = require('../models');

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    // Join personal room for targeted notifications
    socket.join(`user_${userId}`);

    // Emit online status
    io.emit('user_online', { userId });

    // Join a chat room with another user
    socket.on('join_chat', ({ withUserId }) => {
      const roomId = [userId, withUserId].sort().join('_');
      socket.join(`chat_${roomId}`);
    });

    // Handle sending a chat message
    socket.on('send_message', async ({ receiverId, message, reservationId }) => {
      try {
        const chatMessage = await ChatMessage.create({
          senderId: userId,
          receiverId,
          message,
          reservationId: reservationId || null,
        });

        const roomId = [userId, receiverId].sort().join('_');
        io.to(`chat_${roomId}`).emit('new_message', {
          ...chatMessage.toJSON(),
          sender: {
            id: socket.user.id,
            name: socket.user.name,
            profilePicture: socket.user.profilePicture,
          },
        });

        // Notify receiver if not in the room
        io.to(`user_${receiverId}`).emit('message_notification', {
          senderId: userId,
          senderName: socket.user.name,
          preview: message.substring(0, 50),
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async ({ withUserId }) => {
      try {
        await ChatMessage.update(
          { isRead: true },
          { where: { senderId: withUserId, receiverId: userId, isRead: false } }
        );
        const roomId = [userId, withUserId].sort().join('_');
        io.to(`chat_${roomId}`).emit('message_read', { byUserId: userId });
      } catch (err) {
        console.error('mark_read error:', err);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
    });
  });
};

const getOnlineUsers = () => onlineUsers;

module.exports = { initSocket, getOnlineUsers };
