import mongoose from 'mongoose';

/**
 * Browser Push API subscription, one per device/browser a seller has
 * opted into notifications on. Standard Web Push (VAPID) shape.
 */
const pushSubscriptionSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { timestamps: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
