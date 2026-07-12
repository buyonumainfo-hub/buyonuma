import mongoose from 'mongoose';

/**
 * A single append-only event stream backing the real-time monitoring
 * dashboards (admin + seller). Kept intentionally generic (type + meta)
 * so new event types can be added without a schema migration.
 *
 * Indexed on (type, createdAt) and (seller, createdAt) since those are
 * the two access patterns: "all events of type X recently" (admin feed)
 * and "all events for seller Y recently" (seller feed).
 *
 * A TTL index automatically prunes events after 90 days so this
 * collection doesn't grow unbounded — dashboards only need recent history,
 * and long-term aggregate counts live on the Seller/Product documents
 * themselves (view counters), not in this log.
 */
const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'seller_registered',
      'seller_approved',
      'seller_suspended',
      'product_added',
      'product_updated',
      'product_deleted',
      'store_view',
      'whatsapp_click',
      'product_page_view',
      'add_to_cart',
      'token_redeemed',
      'admin_login',
      'admin_login_failed',
      'seller_login',
      'seller_login_failed',
      'nin_submitted',
      'nin_verified',
      'nin_rejected',
      'broadcast_email_sent',
      'notification_sent',
      'ai_chat_message',
    ],
    index: true,
  },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // 90-day TTL
});

activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
