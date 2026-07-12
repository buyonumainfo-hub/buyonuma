import express from 'express';
import mongoose from 'mongoose';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import ActivityLog from '../models/ActivityLog.js';
import { protect, protectSeller } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build an array of { date: 'YYYY-MM-DD', count } for the last N days, zero-filled. */
const dailySeries = (rawCounts, days) => {
  const map = new Map(rawCounts.map((r) => [r._id, r.count]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) || 0 });
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/monitoring/admin — admin real-time dashboard
// Returns headline totals + time-series for charts (sellers registered,
// products added, views) over the last 14 days, plus a recent activity
// feed limited to the last 24 hours.
// ─────────────────────────────────────────────────────────────────────────
router.get('/admin', protect, async (req, res) => {
  try {
    const cacheKey = 'monitoring:admin';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const days = 14;
    const since = new Date(Date.now() - days * DAY_MS);

    const [
      totalSellers,
      approvedSellers,
      pendingSellers,
      verifiedSellers,
      totalProducts,
      activeProducts,
      sellersPerDay,
      productsPerDay,
      viewsPerDay,
      recentActivity,
      topSellersByViews,
    ] = await Promise.all([
      Seller.countDocuments(),
      Seller.countDocuments({ isApproved: true }),
      Seller.countDocuments({ isApproved: false }),
      Seller.countDocuments({ ninStatus: 'verified' }),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      ActivityLog.aggregate([
        { $match: { type: 'seller_registered', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([
        { $match: { type: 'product_added', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([
        { $match: { type: { $in: ['store_view', 'product_page_view'] }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      // Recent Activity feed: only the last 24 hours. The underlying
      // ActivityLog documents are NOT deleted after 24h (they're kept for
      // the 14-day trend charts above), but the visible admin activity
      // feed intentionally only shows the last day so it stays a
      // genuinely "recent" feed rather than an ever-growing history list.
      ActivityLog.find({ createdAt: { $gte: new Date(Date.now() - DAY_MS) } })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('seller', 'store_name username')
        .populate('product', 'name'),
      Seller.find({ isActive: true }).select('store_name username viewCounts').sort({ 'viewCounts.storeViews': -1 }).limit(5),
    ]);

    const result = {
      success: true,
      totals: {
        totalSellers,
        approvedSellers,
        pendingSellers,
        verifiedSellers,
        totalProducts,
        activeProducts,
      },
      charts: {
        sellersRegisteredDaily: dailySeries(sellersPerDay, days),
        productsAddedDaily: dailySeries(productsPerDay, days),
        viewsDaily: dailySeries(viewsPerDay, days),
      },
      recentActivity,
      topSellersByViews,
      generatedAt: new Date(),
    };

    await cache.set(cacheKey, result, 20); // 20s — "real-time-ish" without hammering Mongo on every dashboard poll
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/monitoring/seller — seller's own dashboard (views, products,
// how visitors found their store)
// ─────────────────────────────────────────────────────────────────────────
router.get('/seller', protectSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const cacheKey = `monitoring:seller:${sellerId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const days = 14;
    const since = new Date(Date.now() - days * DAY_MS);
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const [seller, totalProducts, activeProducts, viewsPerDay, eventBreakdown, topProducts] = await Promise.all([
      Seller.findById(sellerId).select('viewCounts store_name'),
      Product.countDocuments({ seller: sellerId }),
      Product.countDocuments({ seller: sellerId, isActive: true }),
      ActivityLog.aggregate([
        { $match: { seller: sellerObjectId, type: { $in: ['store_view', 'whatsapp_click', 'product_page_view', 'add_to_cart'] }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      ActivityLog.aggregate([
        { $match: { seller: sellerObjectId, createdAt: { $gte: since } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Product.find({ seller: sellerId }).select('name viewCount').sort({ viewCount: -1 }).limit(5),
    ]);

    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    const result = {
      success: true,
      totals: {
        totalProducts,
        activeProducts,
        storeViews: seller.viewCounts?.storeViews || 0,
        whatsappClicks: seller.viewCounts?.whatsappClicks || 0,
        productPageViews: seller.viewCounts?.productPageViews || 0,
        addToCartClicks: seller.viewCounts?.addToCartClicks || 0,
      },
      charts: {
        visitsDaily: dailySeries(viewsPerDay, days),
        eventBreakdown: eventBreakdown.map((e) => ({ type: e._id, count: e.count })),
      },
      topProducts,
      generatedAt: new Date(),
    };

    await cache.set(cacheKey, result, 20);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
