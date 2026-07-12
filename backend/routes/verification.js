import express from 'express';
import Seller from '../models/Seller.js';
import { protect, protectSeller } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { ninSubmitValidators, ninReviewValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { createNotification } from '../utils/notify.js';
import { verifyNIN } from '../utils/ninProvider.js';
import cache from '../utils/cache.js';

const router = express.Router();

/**
 * POST /api/verification/nin — seller submits their NIN for the verified badge.
 *
 * Flow: seller submits -> we call the configured NIN verification provider
 * (utils/ninProvider.js) to validate the number is real and (where the
 * provider supports it) matches the seller's registered name -> we store
 * the result and set ninStatus accordingly. If the provider only confirms
 * "this NIN exists" without a fraud/identity check, we still route through
 * a `pending` state so an admin can do a final manual review before the
 * badge goes live — see /api/verification/nin/:id/review below.
 */
router.post('/nin', protectSeller, writeLimiter, ninSubmitValidators, validate, async (req, res) => {
  try {
    const { nin } = req.body;
    const seller = await Seller.findById(req.seller.id).select('+nin store_name username ninStatus');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    if (seller.ninStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'Your store is already verified' });
    }

    let providerResult;
    try {
      providerResult = await verifyNIN({ nin, fullName: seller.store_name });
    } catch (err) {
      console.error('NIN provider error:', err.message);
      return res.status(502).json({
        success: false,
        message: 'Could not reach the verification service right now. Please try again shortly.',
      });
    }

    if (providerResult.status === 'invalid') {
      seller.ninStatus = 'rejected';
      seller.ninRejectionReason = providerResult.reason || 'NIN could not be validated';
      await seller.save();
      await logActivity({ type: 'nin_rejected', seller: seller._id, meta: { reason: seller.ninRejectionReason } });
      return res.status(400).json({ success: false, message: seller.ninRejectionReason });
    }

    // Provider confirmed the NIN is real. We still hold in "pending" for a
    // human admin to give final sign-off before showing a public trust badge —
    // this avoids the badge being granted purely on an automated check.
    seller.nin = nin;
    seller.ninProviderRef = providerResult.reference || '';
    seller.ninStatus = 'pending';
    seller.ninRejectionReason = '';
    await seller.save();

    await logActivity({ type: 'nin_submitted', seller: seller._id });
    await cache.delPrefix('sellers:');
    await cache.del(`seller:${seller._id}`);

    res.json({
      success: true,
      message: 'NIN submitted. Your verified badge will appear once admin completes final review.',
      ninStatus: seller.ninStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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

// GET /api/verification/nin/pending — admin: list sellers awaiting review
router.get('/nin/pending', protect, async (req, res) => {
  try {
    const sellers = await Seller.find({ ninStatus: 'pending' })
      .select('store_name username email ninStatus createdAt')
      .sort({ createdAt: 1 });
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/verification/nin/:id/review — admin approves or rejects
router.patch('/nin/:id/review', protect, writeLimiter, ninReviewValidators, validate, async (req, res) => {
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

    await Promise.all([cache.delPrefix('sellers:'), cache.del(`seller:${seller._id}`)]);

    res.json({ success: true, seller: { _id: seller._id, ninStatus: seller.ninStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
