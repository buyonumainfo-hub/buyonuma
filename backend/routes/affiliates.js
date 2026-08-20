import express from 'express';
import Affiliate from '../models/Affiliate.js';
import AffiliateReferral from '../models/AffiliateReferral.js';
import AffiliateEarning from '../models/AffiliateEarning.js';
import { protectAffiliate } from '../middleware/auth.js';
import { getAffiliateSettings } from '../utils/affiliateSettings.js';

const router = express.Router();

// ─── GET /api/affiliates/me — overview stats for the dashboard home tab ────
router.get('/me', protectAffiliate, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliate.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });

    const [referralStats] = await AffiliateReferral.aggregate([
      { $match: { affiliate: affiliate._id } },
      { $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalUpgraded: { $sum: { $cond: [{ $eq: ['$status', 'upgraded'] }, 1, 0] } },
        } },
    ]);

    const [earningStats] = await AffiliateEarning.aggregate([
      { $match: { affiliate: affiliate._id } },
      { $group: {
          _id: null,
          totalEarned: { $sum: '$commissionAmount' },
          totalPaid: { $sum: { $cond: ['$paid', '$commissionAmount', 0] } },
          totalUnpaid: { $sum: { $cond: ['$paid', 0, '$commissionAmount'] } },
        } },
    ]);

    const { commissionPercent, whatsappNumber } = getAffiliateSettings();
    const referralLink = `${process.env.FRONTEND_PUBLIC_URL || ''}/seller/register?ref=${affiliate.referralCode}`;

    res.json({
      success: true,
      affiliate: {
        _id: affiliate._id,
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
        createdAt: affiliate.createdAt,
      },
      referralLink,
      commissionPercent,
      whatsappNumber,
      stats: {
        totalReferrals: referralStats?.totalReferrals || 0,
        totalUpgraded: referralStats?.totalUpgraded || 0,
        totalEarned: earningStats?.totalEarned || 0,
        totalPaid: earningStats?.totalPaid || 0,
        totalUnpaid: earningStats?.totalUnpaid || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/affiliates/referrals — sellers this affiliate has referred ───
router.get('/referrals', protectAffiliate, async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const [referrals, total] = await Promise.all([
      AffiliateReferral.find({ affiliate: req.affiliate.id })
        .populate('seller', 'store_name username email isApproved createdAt profile_picture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateReferral.countDocuments({ affiliate: req.affiliate.id }),
    ]);

    res.json({
      success: true,
      referrals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/affiliates/earnings — commission history ─────────────────────
router.get('/earnings', protectAffiliate, async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const { paid } = req.query;

    const filter = { affiliate: req.affiliate.id };
    if (paid === 'true') filter.paid = true;
    if (paid === 'false') filter.paid = false;

    const [earnings, total] = await Promise.all([
      AffiliateEarning.find(filter)
        .populate('seller', 'store_name username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AffiliateEarning.countDocuments(filter),
    ]);

    res.json({
      success: true,
      earnings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
