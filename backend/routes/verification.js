import express from 'express';
import { body } from 'express-validator';
import Seller from '../models/Seller.js';
import { protect, protectSeller, requirePermission } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { ninReviewValidators, mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { createNotification } from '../utils/notify.js';
import cache from '../utils/cache.js';

const router = express.Router();

/**
 * Seller verification, human-review only — NO third-party identity API.
 *
 * A seller submits: their full legal name, their NIN, and a photo (of
 * themselves holding their ID, or the ID itself). That's it — nothing is
 * sent to any outside verification service. It goes straight into a
 * `pending` queue that only an admin can see (ninFullName/ninPhoto/nin
 * are `select: false` on the Seller model, so they never leak into any
 * public API response), and the verified badge only appears once an
 * admin has manually looked at the submission and approved it via
 * PATCH /nin/:id/review below.
 */
router.post('/nin', protectSeller, writeLimiter,
  body('nin').trim().matches(/^\d{11}$/).withMessage('NIN must be exactly 11 digits'),
  body('fullName').trim().isLength({ min: 3, max: 150 }).withMessage('Enter your full legal name as it appears on your ID'),
  body('photo').trim().notEmpty().withMessage('A photo is required for verification'),
  // BVN is optional — a seller may add it for extra confidence during
  // manual review, but verification never requires it.
  body('bvn').optional({ checkFalsy: true }).trim().matches(/^\d{11}$/).withMessage('BVN must be exactly 11 digits'),
  validate,
  async (req, res) => {
    try {
      const { nin, fullName, photo, bvn } = req.body;
      const seller = await Seller.findById(req.seller.id).select('+nin +ninFullName +ninPhoto +bvn ninStatus store_name username');
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      if (seller.ninStatus === 'verified') {
        return res.status(400).json({ success: false, message: 'Your store is already verified' });
      }

      seller.nin = nin;
      seller.ninFullName = fullName;
      seller.ninPhoto = photo;
      seller.bvn = bvn ? bvn.trim() : null;
      seller.ninStatus = 'pending';
      seller.ninRejectionReason = '';
      await seller.save();

      // The submitted details live on the Seller document itself
      // (nin/ninFullName/ninPhoto/bvn — all select:false, admin-only) and
      // this event is appended to the append-only ActivityLog, so every
      // verification submission is durably logged for the admin.
      await logActivity({ type: 'nin_submitted', seller: seller._id, meta: { hasBvn: Boolean(bvn) } });
      await cache.delPrefix('sellers:');
      await cache.del(`seller:${seller._id}`);
      await cache.del(`seller:${seller.username}`);

      res.json({
        success: true,
        message: 'Submitted for review. An admin will manually check your details and photo — this usually takes 1-2 business days.',
        ninStatus: seller.ninStatus,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/verification/nin/status — seller checks their own verification status
router.get('/nin/status', protectSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).select('ninStatus ninVerifiedAt ninRejectionReason');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, ...seller.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verification/nin/pending — admin: queue of submissions awaiting
// manual review. Kept lightweight (no NIN/BVN/photo) — the admin clicks a
// row in the UI, which calls GET /nin/:id/details below to pull the full
// submission on demand, rather than shipping every seller's sensitive
// verification data in one bulk list response.
router.get('/nin/pending', protect, requirePermission('verification.review'), async (req, res) => {
  try {
    const sellers = await Seller.find({ ninStatus: 'pending' })
      .select('store_name username email ninStatus createdAt')
      .sort({ createdAt: 1 });
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verification/nin/log — admin: every seller who has ever
// submitted for verification (pending, verified, or rejected), light
// fields only. This is the durable "verification log" the admin browses;
// clicking an entry calls GET /nin/:id/details for the full record.
router.get('/nin/log', protect, requirePermission('verification.review'), async (req, res) => {
  try {
    const sellers = await Seller.find({ ninStatus: { $in: ['pending', 'verified', 'rejected'] } })
      .select('store_name username email ninStatus ninVerifiedAt createdAt')
      .sort({ updatedAt: -1 });
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verification/nin/:id/details — admin: full verification
// submission for one seller (full legal name, NIN, BVN, photo) — only
// ever returned to an authenticated admin with the review permission,
// never surfaced on any public endpoint.
router.get('/nin/:id/details', protect, requirePermission('verification.review'), mongoIdParam('id'), validate, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id)
      .select('+nin +ninFullName +ninPhoto +bvn store_name username email ninStatus ninVerifiedAt ninRejectionReason createdAt');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/verification/nin/:id/review — admin manually approves or rejects
router.patch('/nin/:id/review', protect, requirePermission('verification.review'), writeLimiter, ninReviewValidators, validate, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    seller.ninStatus = status;
    if (status === 'verified') {
      seller.ninVerifiedAt = new Date();
      seller.ninRejectionReason = '';
    } else {
      seller.ninRejectionReason = rejectionReason || 'Did not pass verification review';
      seller.ninVerifiedAt = null;
    }
    await seller.save();

    await logActivity({
      type: status === 'verified' ? 'nin_verified' : 'nin_rejected',
      seller: seller._id,
      meta: { rejectionReason: seller.ninRejectionReason },
    });

    await createNotification({
      recipientType: 'seller',
      seller: seller._id,
      title: status === 'verified' ? 'You are now verified! ✅' : 'Verification not approved',
      message: status === 'verified'
        ? 'Congratulations — your store now shows the verified badge to buyers.'
        : `Your NIN verification was not approved: ${seller.ninRejectionReason}`,
      type: 'nin',
    });

    await Promise.all([
      cache.delPrefix('sellers:'),
      cache.del(`seller:${seller._id}`),
      cache.del(`seller:${seller.username}`),
    ]);

    res.json({ success: true, seller: { _id: seller._id, ninStatus: seller.ninStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
