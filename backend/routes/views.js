import express from 'express';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import { logActivity } from '../utils/activityLog.js';
import { viewTrackLimiter } from '../middleware/rateLimiter.js';
import { viewTrackValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();

/**
 * POST /api/views/track
 * Body: { sellerId, type: 'store_view' | 'whatsapp_click' | 'product_page_view' | 'add_to_cart', productId? }
 *
 * Public endpoint hit from the frontend whenever a buyer:
 *  - opens a seller's store page (/username)  -> store_view
 *  - clicks "Chat on WhatsApp"                -> whatsapp_click
 *  - opens a product detail view              -> product_page_view (also bumps Product.viewCount)
 *  - adds a product to their cart             -> add_to_cart
 *
 * If the request is authenticated as the seller themselves (optionalAuth),
 * we skip incrementing — sellers checking their own store shouldn't inflate
 * their own analytics.
 */
router.post('/track', async (req, res) => {
  try {
    const { sellerId, type, productId } = req.body;

    // Don't count a seller viewing their own store/products
    if (req.seller && req.seller.id === sellerId) {
      return res.json({ success: true, counted: false });
    }

    const seller = await Seller.findById(sellerId).select('_id');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    const counterField =
      type === 'store_view' ? 'viewCounts.storeViews' :
      type === 'whatsapp_click' ? 'viewCounts.whatsappClicks' :
      type === 'add_to_cart' ? 'viewCounts.addToCartClicks' :
      'viewCounts.productPageViews';

    await Seller.updateOne({ _id: sellerId }, { $inc: { [counterField]: 1 } });

    if (type === 'product_page_view' && productId) {
      await Product.updateOne({ _id: productId }, { $inc: { viewCount: 1 } });
    }

    await logActivity({
      type,
      seller: sellerId,
      product: productId || null,
      ip: req.ip,
    });

    // BUG FIX: this previously invalidated a cache key
    // (`seller:analytics:${sellerId}`) that nothing ever read — the
    // seller monitoring dashboard actually caches under
    // `monitoring:seller:${sellerId}` (see routes/monitoring.js). That
    // mismatch meant a fresh view/click never actually cleared the
    // dashboard cache, so sellers could see stale numbers for up to the
    // full cache TTL. Using the correct key here.
    await cache.del(`monitoring:seller:${sellerId}`);

    res.json({ success: true, counted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
