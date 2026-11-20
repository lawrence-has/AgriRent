const webpush = require('web-push');
const { Notification, PushSubscription, User } = require('../models');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@agrirent.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const sendWebPush = async (userId, notification, title, message, type, data) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys are not configured; web push was skipped');
    return;
  }

  const [subscriptions, recipient] = await Promise.all([
    PushSubscription.findAll({ where: { userId } }),
    User.findByPk(userId, { attributes: ['id', 'role'] }),
  ]);

  if (!subscriptions.length) return;

  const role = recipient?.role;
  let url = '/notifications';
  if (type === 'chat') url = '/chat';
  if (type === 'reservation') {
    if (role === 'farmer') url = data.reservationId
      ? `/farmer/reservations/${data.reservationId}`
      : '/farmer/reservations';
    else if (role === 'owner') url = '/owner/reservations';
    else if (role === 'admin') url = '/admin/reservations';
  }
  if (type === 'transaction') {
    if (role === 'farmer') url = '/farmer/rentals';
    else if (role === 'owner') url = '/owner/transactions';
    else if (role === 'admin') url = '/admin/reservations';
  }

  const pushPayload = JSON.stringify({
    title,
    message,
    notificationId: notification.id,
    type,
    data: { ...data, type, url },
  });

  // High urgency asks supported push services to deliver promptly. A 24-hour
  // TTL still lets a temporarily offline device receive the alert later.
  await Promise.all(subscriptions.map(async (sub) => {
    const startedAt = Date.now();
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        pushPayload,
        { TTL: 60 * 60 * 24, urgency: 'high' }
      );
      console.info(`[Push] Provider accepted notification ${notification.id} for user ${userId} in ${Date.now() - startedAt}ms`);
    } catch (pushError) {
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await sub.destroy();
      }
      console.error('[Push] Delivery failed:', pushError.statusCode || pushError.message || pushError);
    }
  }));
};

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

    // Start delivery now, but don't make reservation/chat actions wait for
    // push-service network latency before returning to the user.
    sendWebPush(userId, notification, title, message, type, data)
      .catch((error) => console.error('[Push] Could not dispatch notification:', error));

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };
