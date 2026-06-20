import express from 'express';
import crypto from 'crypto';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import SellerToken from '../models/SellerToken.js';
import { protect } from '../middleware/auth.js';
import cache from '../utils/cache.js';

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
router.post('/tokens', protect, async (req, res) => {
  try {
    const { duration_hours, label, token_expires_hours = 72 } = req.body;
    if (!duration_hours || Number(duration_hours) <= 0)
      return res.status(400).json({ success: false, message: 'duration_hours required and must be > 0' });

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
router.delete('/tokens/:id', protect, async (req, res) => {
  try {
    await SellerToken.findByIdAndDelete(req.params.id);
  await cache.del('admin:tokens');
    res.json({ success: true, message: 'Token deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
