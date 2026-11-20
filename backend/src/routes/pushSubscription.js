const express = require('express');
const webpush = require('web-push');
const { Op } = require('sequelize');
const { body } = require('express-validator');
const { PushSubscription } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
const pendingSubscriptions = new Map();

const pushPayload = (title, message, data = {}) =>
  JSON.stringify({ title, message, data });

router.post('/test', requireAuth, async (req, res, next) => {
  try {
    const where = { userId: req.user.id };
    // A targeted repair test proves this specific browser endpoint works,
    // instead of succeeding because another device on the account worked.
    if (req.body?.endpoint) where.endpoint = req.body.endpoint;
    const subscriptions = await PushSubscription.findAll({
      where,
    });

    if (!subscriptions.length) {
      return res.status(404).json({
        success: false,
        message: 'No push subscription is registered for this device',
      });
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications are not configured on the server',
      });
    }

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@agrirent.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const payload = pushPayload(
      'AgriRent push test',
      'Push notifications are working!',
      { type: 'system' }
    );
    let sent = 0;
    const failures = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'high' }
        );
        sent += 1;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await subscription.destroy();
        }
        failures.push(error.statusCode || error.message);
      }
    }

    if (!sent) {
      return res.status(502).json({
        success: false,
        message: 'Push delivery failed',
        failures,
      });
    }

    res.json({
      success: true,
      message: `Test notification sent to ${sent} device${sent === 1 ? '' : 's'}`,
      sent,
      failures,
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/push/subscribe ─────────────────────────────────────
// Register or update a push subscription for the authenticated user.
// Called after Notification.requestPermission() is granted.
router.post(
  '/subscribe',
  requireAuth,
  [
    body('endpoint')
      .notEmpty().withMessage('endpoint is required')
      .isURL({ require_tld: false }).withMessage('endpoint must be a valid URL'),
    body('keys').notEmpty().withMessage('keys are required'),
    body('keys.p256dh')
      .notEmpty().withMessage('keys.p256dh is required')
      .isString().isLength({ min: 10 }).withMessage('keys.p256dh is invalid'),
    body('keys.auth')
      .notEmpty().withMessage('keys.auth is required')
      .isString().isLength({ min: 10 }).withMessage('keys.auth is invalid'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { endpoint, keys } = req.body;
      const lockKey = `${req.user.id}:${endpoint}`;
      let operation = pendingSubscriptions.get(lockKey);
      if (!operation) {
        operation = (async () => {
          const existing = await PushSubscription.findAll({
            where: { userId: req.user.id, endpoint },
            order: [['id', 'ASC']],
          });
          const sub = existing[0];
          const created = !sub;
          if (sub) {
            await sub.update({ keys });
            // Earlier concurrent registration attempts could have left duplicate
            // rows. Keep one row per account and browser endpoint.
            if (existing.length > 1) {
              await PushSubscription.destroy({
                where: { userId: req.user.id, endpoint, id: { [Op.ne]: sub.id } },
              });
            }
          } else {
            await PushSubscription.create({ userId: req.user.id, endpoint, keys });
          }
          return created;
        })().finally(() => pendingSubscriptions.delete(lockKey));
        pendingSubscriptions.set(lockKey, operation);
      }
      const created = await operation;

      res.status(created ? 201 : 200).json({
        success: true,
        message: created ? 'Push subscription registered' : 'Push subscription updated',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── DELETE /api/push/unsubscribe ──────────────────────────────────
// Remove a push subscription (user opted out).
router.delete(
  '/unsubscribe',
  requireAuth,
  [
    body('endpoint').notEmpty().withMessage('endpoint is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { endpoint } = req.body;
      const deleted = await PushSubscription.destroy({
        where: { userId: req.user.id, endpoint },
      });

      res.json({
        success: true,
        message: deleted > 0 ? 'Unsubscribed successfully' : 'No subscription found to remove',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/push/vapid-public-key ── public ─────────────────────
// Returns the VAPID public key needed by the browser to subscribe.
// This is public information — safe to expose.
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications are not configured on this server',
    });
  }
  res.json({ success: true, publicKey });
});

// ── GET /api/push/status ── authenticated ────────────────────────
// Returns how many active push subscriptions the user has.
// Useful for the frontend to sync subscription state on login.
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const count = await PushSubscription.count({ where: { userId: req.user.id } });
    res.json({ success: true, subscriptionCount: count, hasSubscription: count > 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
