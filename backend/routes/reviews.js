<<<<<<< HEAD
import mongoose from 'mongoose';
=======
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
import express from 'express';
import { body } from 'express-validator';
import Review from '../models/Review.js';
import Seller from '../models/Seller.js';
import { protectBuyer, protectSeller } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import cache from '../utils/cache.js';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

// Recomputes and persists a seller's average rating from their reviews.
// Called after every create/update/delete so Seller.rating (already used
// throughout the app for sorting/display) always stays in sync.
<<<<<<< HEAD
//
// BUG FIX: `sellerId` arrives here as a plain string (req.params.id) from
// the POST route below. Mongoose's aggregate() pipeline is sent to the
// driver as-is — unlike a normal query, it does NOT auto-cast a raw
// string against the `seller` field's ObjectId type. So `{ seller:
// sellerId }` was comparing a String to an ObjectId, which never
// matches, so `agg` always came back empty and every new review reset
// the seller's rating to 0 instead of raising it. Casting to
// mongoose.Types.ObjectId here makes the match actually work.
const recalcSellerRating = async (sellerId) => {
  const objectId = new mongoose.Types.ObjectId(sellerId);
  const agg = await Review.aggregate([
    { $match: { seller: objectId } },
    { $group: { _id: '$seller', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = agg[0]?.avg || 0;
  const seller = await Seller.findByIdAndUpdate(
    objectId,
    { rating: Math.round(rating * 10) / 10 },
    { new: true }
  ).select('username');
  await cache.delPrefix('sellers:');
  await cache.del(`seller:${sellerId}`);
  // GET /sellers/user/:username (what SellerDetailPage actually calls)
  // caches under the username, not the id — bust that key too or the
  // page keeps showing the old rating until the 30s TTL expires.
  if (seller?.username) await cache.del(`seller:${seller.username}`);
=======
const recalcSellerRating = async (sellerId) => {
  const agg = await Review.aggregate([
    { $match: { seller: sellerId } },
    { $group: { _id: '$seller', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = agg[0]?.avg || 0;
  await Seller.findByIdAndUpdate(sellerId, { rating: Math.round(rating * 10) / 10 });
  await cache.delPrefix('sellers:');
  await cache.del(`seller:${sellerId}`);
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
};

// ─── GET /api/reviews/seller/:id — public, paginated ───────────────────────
router.get('/seller/:id', mongoIdParam('id'), validate, async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const [reviews, total] = await Promise.all([
      Review.find({ seller: req.params.id })
        .populate('buyer', 'name photo')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ seller: req.params.id }),
    ]);

    res.json({
      success: true,
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/reviews/seller/:id — buyer leaves/updates a review ──────────
router.post('/seller/:id', protectBuyer, writeLimiter, mongoIdParam('id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().isLength({ max: 1000 }),
  validate,
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.params.id);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      const review = await Review.findOneAndUpdate(
        { seller: req.params.id, buyer: req.buyer.id },
        { rating: req.body.rating, comment: req.body.comment || '' },
        { new: true, upsert: true, runValidators: true }
      );

      await recalcSellerRating(req.params.id);

      await createNotification({
        recipientType: 'seller',
        seller: req.params.id,
        title: 'New review on your store',
        message: `A buyer left a ${req.body.rating}-star review.`,
        type: 'info',
        link: '/seller/dashboard',
      });

      res.json({ success: true, review, message: 'Review submitted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── DELETE /api/reviews/:id — buyer removes their own review ──────────────
router.delete('/:id', protectBuyer, writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, buyer: req.buyer.id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found or not yours' });
    await recalcSellerRating(review.seller);
    res.json({ success: true, message: 'Review removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/reviews/:id/reply — seller replies to a review on their store
router.post('/:id/reply', protectSeller, writeLimiter, mongoIdParam('id'),
  body('reply').trim().isLength({ min: 1, max: 500 }),
  validate,
  async (req, res) => {
    try {
      const review = await Review.findOneAndUpdate(
        { _id: req.params.id, seller: req.seller.id },
        { sellerReply: req.body.reply },
        { new: true }
      );
      if (!review) return res.status(404).json({ success: false, message: 'Review not found on your store' });
      res.json({ success: true, review });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

export default router;
