const webpush = require('web-push');
const { Notification, PushSubscription } = require('../models');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@agrirent.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Create a DB notification and optionally send a web push.
 */
const createNotification = async (userId, title, message, type = 'system', data = {}, io = null) => {
  try {
    const notification = await Notification.create({ userId, title, message, type, data });

    // Emit via socket.io if available
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        title,
        message,
        type,
        data,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    // Send web push notification
    const subscriptions = await PushSubscription.findAll({ where: { userId } });
    const pushPayload = JSON.stringify({ title, message, data });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          pushPayload
        );
      } catch (pushError) {
        // Remove invalid subscriptions
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await sub.destroy();
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };
