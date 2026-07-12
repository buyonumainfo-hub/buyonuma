import express from 'express';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import Seller from '../models/Seller.js';
import { protect, protectSeller } from '../middleware/auth.js';
import { writeLimiter, broadcastLimiter } from '../middleware/rateLimiter.js';
import { notificationPushValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { createNotification, broadcastNotificationToSellers, sendPushToSeller, sendPushToAllSellers } from '../utils/notify.js';
import { logActivity } from '../utils/activityLog.js';
import { body } from 'express-validator';

const router = express.Router();

// ── Seller: fetch my notifications ──────────────────────────────────────
router.get('/seller', protectSeller, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { recipientType: 'seller', seller: req.seller.id };
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Notification.countDocuments({ ...query, read: false }),
      Notification.countDocuments(query),
    ]);
    res.json({ success: true, notifications, unreadCount, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Seller: mark one notification as read ────────────────────────────────
router.patch('/seller/:id/read', protectSeller, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, seller: req.seller.id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Seller: mark all as read ──────────────────────────────────────────────
router.patch('/seller/read-all', protectSeller, async (req, res) => {
  try {
    await Notification.updateMany({ seller: req.seller.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Seller: register a push subscription ─────────────────────────────────
router.post('/seller/push-subscribe', protectSeller, writeLimiter,
  body('endpoint').isURL().withMessage('Invalid subscription endpoint'),
  body('keys.p256dh').notEmpty(),
  body('keys.auth').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      await PushSubscription.findOneAndUpdate(
        { endpoint },
        { seller: req.seller.id, endpoint, keys },
        { upsert: true, new: true }
      );
      await Seller.findByIdAndUpdate(req.seller.id, { pushEnabled: true });
      res.json({ success: true, message: 'Push notifications enabled' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Seller: unsubscribe from push ────────────────────────────────────────
router.post('/seller/push-unsubscribe', protectSeller,
  body('endpoint').isURL(),
  validate,
  async (req, res) => {
    try {
      await PushSubscription.deleteOne({ endpoint: req.body.endpoint, seller: req.seller.id });
      const remaining = await PushSubscription.countDocuments({ seller: req.seller.id });
      if (remaining === 0) await Seller.findByIdAndUpdate(req.seller.id, { pushEnabled: false });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Admin: send a notification (in-app + push) to all sellers or one seller ──
router.post('/admin/send', protect, broadcastLimiter, notificationPushValidators, validate, async (req, res) => {
  try {
    const { title, message, sellerId, sendPush = true } = req.body;

    let count;
    if (sellerId) {
      await createNotification({ recipientType: 'seller', seller: sellerId, title, message, type: 'broadcast' });
      count = 1;
      if (sendPush) await sendPushToSeller(sellerId, { title, message });
    } else {
      count = await broadcastNotificationToSellers({ title, message, type: 'broadcast' }, Seller);
      if (sendPush) await sendPushToAllSellers({ title, message }, Seller);
    }

    await logActivity({
      type: 'notification_sent',
      seller: sellerId || null,
      meta: { title, targetAll: !sellerId, recipientCount: count },
    });

    res.json({ success: true, message: `Notification sent to ${count} seller${count !== 1 ? 's' : ''}`, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Public: expose the VAPID public key for the frontend push subscribe flow ──
router.get('/vapid-public-key', (req, res) => {
  res.json({ success: true, key: process.env.VAPID_PUBLIC_KEY || null });
});

export default router;
