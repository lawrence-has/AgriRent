const express = require('express');
const { PushSubscription } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/push/subscribe
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys) {
      return res.status(400).json({ message: 'endpoint and keys are required' });
    }

    // Upsert subscription
    const [sub, created] = await PushSubscription.findOrCreate({
      where: { userId: req.user.id, endpoint },
      defaults: { userId: req.user.id, endpoint, keys },
    });

    if (!created) await sub.update({ keys });

    res.status(created ? 201 : 200).json({ message: 'Subscription saved' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.destroy({ where: { userId: req.user.id, endpoint } });
    res.json({ message: 'Unsubscribed' });
  } catch (error) {
    next(error);
  }
});

// GET /api/push/vapid-public-key — public
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
