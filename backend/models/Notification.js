import mongoose from 'mongoose';

/**
 * In-app notification, shown in the seller (or admin) notification bell.
 * `seller: null` + `audience: 'all_sellers'` means it was a broadcast to
 * every seller — we still create one row per seller so read-state is
 * per-recipient, which keeps the unread-count query trivial and indexed.
 */
const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['seller', 'admin'], required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'approval', 'token', 'broadcast', 'nin'],
    default: 'info',
  },
  link: { type: String, default: '' }, // optional in-app route to deep-link to
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 120 }, // 120-day TTL
});

notificationSchema.index({ seller: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
