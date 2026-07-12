import express from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import SellerToken from '../models/SellerToken.js';
import { protect } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const cacheKey = 'admin:stats';
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [totalSellers, totalProducts, pendingSellers, categorySellers] = await Promise.all([
      Seller.countDocuments(),
      Product.countDocuments(),
      Seller.countDocuments({ isApproved: false }),
      Seller.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const recentSellers  = await Seller.find().select('-password').sort({ createdAt: -1 }).limit(5);
    const recentProducts = await Product.find().populate('seller', 'store_name').sort({ createdAt: -1 }).limit(5);

    const result = { success: true, stats: { totalSellers, totalProducts, pendingSellers, categorySellers, recentSellers, recentProducts } };
   await cache.set(cacheKey, result, 30); // 30 s
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/admin/tokens — generate token ────────────────────────────────
router.post('/tokens', protect, writeLimiter,
  body('duration_hours').isFloat({ gt: 0, max: 8760 }).withMessage('duration_hours required and must be > 0'),
  body('label').optional().isLength({ max: 200 }),
  body('token_expires_hours').optional().isFloat({ gt: 0, max: 8760 }),
  validate,
  async (req, res) => {
  try {
    const { duration_hours, label, token_expires_hours = 72 } = req.body;

    const token = crypto.randomBytes(12).toString('hex').toUpperCase();
    const tokenDoc = new SellerToken({
      token,
      label:          label || '',
      duration_hours: Number(duration_hours),
      expires_at:     new Date(Date.now() + Number(token_expires_hours) * 3600000),
    });
    await tokenDoc.save();

   await cache.del('admin:tokens');
   await cache.del('admin:stats');
    res.status(201).json({ success: true, token: tokenDoc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/admin/tokens ───────────────────────────────────────────────────
router.get('/tokens', protect, async (req, res) => {
  try {
    const cacheKey = 'admin:tokens';
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const tokens = await SellerToken.find()
      .populate('used_by', 'store_name username')
      .sort({ createdAt: -1 });

    const result = { success: true, tokens };
   await cache.set(cacheKey, result, 15);
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DELETE /api/admin/tokens/:id ───────────────────────────────────────────
router.delete('/tokens/:id', protect, writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    await SellerToken.findByIdAndDelete(req.params.id);
  await cache.del('admin:tokens');
    res.json({ success: true, message: 'Token deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});


// ─── GET /api/admin/token-setting ────────────────────────────────────────────
router.get('/token-setting', protect, async (req, res) => {
  try {
    const cached = await cache.get('admin:token_required');
    // Default to true (tokens required) if not explicitly set
    const tokenRequired = cached === null ? true : cached;
    res.json({ success: true, tokenRequired });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PUT /api/admin/token-setting ────────────────────────────────────────────
router.put('/token-setting', protect, writeLimiter,
  body('tokenRequired').isBoolean().withMessage('tokenRequired must be true or false'),
  validate,
  async (req, res) => {
  try {
    const { tokenRequired } = req.body;
    // Store with no TTL (persist forever until changed again)
    await cache.set('admin:token_required', tokenRequired, 60 * 60 * 24 * 365);

    // When disabling tokens: activate ALL approved sellers' products
    if (!tokenRequired) {
      const approvedSellers = await Seller.find({ isApproved: true }).select('_id');
      const ids = approvedSellers.map(s => s._id);
      await Product.updateMany({ seller: { $in: ids } }, { $set: { isActive: true } });
    }

    // Bust all product and seller caches so changes reflect immediately
    await Promise.all([
      cache.delPrefix('products:'),
      cache.delPrefix('sellers:'),
      cache.del('admin:stats'),
    ]);

    res.json({
      success: true,
      tokenRequired,
      message: tokenRequired
        ? 'Token system enabled. Sellers must redeem a token for products to appear.'
        : 'Token system disabled. All approved sellers\' products are now visible.',
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});


export default router;
