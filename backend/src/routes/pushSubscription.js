const express = require('express');
const { body } = require('express-validator');
const { PushSubscription } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

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

      // Upsert: update keys if same endpoint already exists for this user
      const [sub, created] = await PushSubscription.findOrCreate({
        where: { userId: req.user.id, endpoint },
        defaults: { userId: req.user.id, endpoint, keys },
      });

      if (!created) {
        await sub.update({ keys });
      }

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
