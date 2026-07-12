import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import webpush from 'web-push';

const vapidConfigured = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@buyonuma.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID keys not set — web push notifications disabled (in-app notifications still work).');
}

/**
 * Create a single in-app notification row. Does NOT send a push —
 * call sendPushToSeller separately if you want both (createNotification
 * is cheap/always-safe; push requires the seller to have opted in and a
 * subscription on file).
 */
export const createNotification = async ({ recipientType, seller = null, title, message, type = 'info', link = '' }) => {
  try {
    return await Notification.create({ recipientType, seller, title, message, type, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Broadcast an in-app notification to every approved, active seller.
 * Uses insertMany for efficiency — this can be hundreds/thousands of rows.
 */
export const broadcastNotificationToSellers = async ({ title, message, type = 'broadcast', link = '' }, Seller) => {
  const sellers = await Seller.find({ isActive: true }).select('_id');
  if (sellers.length === 0) return 0;

  const docs = sellers.map((s) => ({
    recipientType: 'seller',
    seller: s._id,
    title,
    message,
    type,
    link,
  }));

  await Notification.insertMany(docs, { ordered: false });
  return docs.length;
};

/**
 * Send a real browser push notification to every device a seller has
 * registered. Silently drops subscriptions that are no longer valid
 * (expired/unsubscribed — status 410/404 from the push service) so the
 * table stays clean.
 */
export const sendPushToSeller = async (sellerId, { title, message, url = '/' }) => {
  if (!vapidConfigured) return { sent: 0 };

  const subs = await PushSubscription.find({ seller: sellerId });
  if (subs.length === 0) return { sent: 0 };

  const payload = JSON.stringify({ title, body: message, url });
  let sent = 0;
  const stale = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(sub._id);
        } else {
          console.error('Push send error:', err.message);
        }
      }
    })
  );

  if (stale.length) {
    await PushSubscription.deleteMany({ _id: { $in: stale } });
  }

  return { sent };
};

/**
 * Push to every seller who has push enabled. Batches to avoid opening
 * too many concurrent connections at once on a large seller base.
 */
export const sendPushToAllSellers = async ({ title, message, url = '/' }, Seller) => {
  if (!vapidConfigured) return { sent: 0 };

  const sellers = await Seller.find({ isActive: true, pushEnabled: true }).select('_id');
  const BATCH_SIZE = 50;
  let totalSent = 0;

  for (let i = 0; i < sellers.length; i += BATCH_SIZE) {
    const batch = sellers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((s) => sendPushToSeller(s._id, { title, message, url }))
    );
    totalSent += results.reduce((sum, r) => sum + r.sent, 0);
  }

  return { sent: totalSent };
};
