import express from 'express';
import { body } from 'express-validator';
import Affiliate from '../models/Affiliate.js';
import AffiliateReferral from '../models/AffiliateReferral.js';
import AffiliateEarning from '../models/AffiliateEarning.js';
import AffiliateSettings from '../models/AffiliateSettings.js';
import { protect, requirePermission } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { loadAffiliateSettingsCache, getAffiliateSettings } from '../utils/affiliateSettings.js';

const router = express.Router();

// ─── GET /api/admin-affiliates — every affiliate + earnings summary ────────
router.get('/', protect, requirePermission('affiliates.manage'), async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const { search, status } = req.query;

    const filter = {};
    if (status && ['active', 'banned'].includes(status)) filter.status = status;
    if (search) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }, { referralCode: re }];
    }

    const [affiliates, total] = await Promise.all([
      Affiliate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Affiliate.countDocuments(filter),
    ]);

    const ids = affiliates.map(a => a._id);

    const [referralCounts, earningTotals] = await Promise.all([
      AffiliateReferral.aggregate([
        { $match: { affiliate: { $in: ids } } },
        { $group: {
            _id: '$affiliate',
            totalReferrals: { $sum: 1 },
            totalUpgraded: { $sum: { $cond: [{ $eq: ['$status', 'upgraded'] }, 1, 0] } },
          } },
      ]),
      AffiliateEarning.aggregate([
        { $match: { affiliate: { $in: ids } } },
        { $group: {
            _id: '$affiliate',
            totalEarned: { $sum: '$commissionAmount' },
            totalPaid: { $sum: { $cond: ['$paid', '$commissionAmount', 0] } },
            totalUnpaid: { $sum: { $cond: ['$paid', 0, '$commissionAmount'] } },
          } },
      ]),
    ]);

    const refMap = Object.fromEntries(referralCounts.map(r => [String(r._id), r]));
    const earnMap = Object.fromEntries(earningTotals.map(e => [String(e._id), e]));

    const rows = affiliates.map(a => ({
      ...a.toObject(),
      totalReferrals: refMap[String(a._id)]?.totalReferrals || 0,
      totalUpgraded: refMap[String(a._id)]?.totalUpgraded || 0,
      totalEarned: earnMap[String(a._id)]?.totalEarned || 0,
      totalPaid: earnMap[String(a._id)]?.totalPaid || 0,
      totalUnpaid: earnMap[String(a._id)]?.totalUnpaid || 0,
    }));

    res.json({
      success: true,
      affiliates: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/admin-affiliates/settings — current global commission % ──────
// Registered BEFORE '/:id' so a request for the literal path "settings"
// doesn't get swallowed by the ':id' param route.
router.get('/settings', protect, requirePermission('affiliates.manage'), async (req, res) => {
  res.json({ success: true, settings: getAffiliateSettings() });
});

// ─── PUT /api/admin-affiliates/settings — set the global commission % ──────
router.put('/settings', protect, requirePermission('affiliates.manage'), writeLimiter,
  body('commissionPercent').isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100'),
  body('whatsappNumber').optional({ checkFalsy: true }).isLength({ max: 30 }),
  body('creditAdminPlanChanges').optional().isBoolean(),
  validate,
  async (req, res) => {
    try {
      const { commissionPercent, whatsappNumber, creditAdminPlanChanges } = req.body;
      let doc = await AffiliateSettings.findOne();
      if (!doc) doc = new AffiliateSettings();
      doc.commissionPercent = commissionPercent;
      if (whatsappNumber !== undefined) doc.whatsappNumber = whatsappNumber;
      if (creditAdminPlanChanges !== undefined) doc.creditAdminPlanChanges = creditAdminPlanChanges;
      await doc.save();
      await loadAffiliateSettingsCache();
      res.json({ success: true, settings: getAffiliateSettings() });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/admin-affiliates/:id — full detail (referrals + earnings) ────
router.get('/:id', protect, requirePermission('affiliates.manage'), mongoIdParam('id'), validate, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });

    const [referrals, earnings, totalsAgg] = await Promise.all([
      AffiliateReferral.find({ affiliate: affiliate._id })
        .populate('seller', 'store_name username email isApproved')
        .sort({ createdAt: -1 }),
      AffiliateEarning.find({ affiliate: affiliate._id })
        .populate('seller', 'store_name username')
        .sort({ createdAt: -1 }),
      AffiliateEarning.aggregate([
        { $match: { affiliate: affiliate._id } },
        { $group: {
            _id: null,
            totalEarned: { $sum: '$commissionAmount' },
            totalPaid: { $sum: { $cond: ['$paid', '$commissionAmount', 0] } },
            totalUnpaid: { $sum: { $cond: ['$paid', 0, '$commissionAmount'] } },
          } },
      ]),
    ]);

    res.json({
      success: true,
      affiliate,
      referrals,
      earnings,
      totals: totalsAgg[0] || { totalEarned: 0, totalPaid: 0, totalUnpaid: 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/admin-affiliates/:id/ban — ban or reinstate an affiliate ───
router.patch('/:id/ban', protect, requirePermission('affiliates.manage'), writeLimiter, mongoIdParam('id'),
  body('status').isIn(['active', 'banned']).withMessage('status must be active or banned'),
  body('reason').optional().isLength({ max: 300 }),
  validate,
  async (req, res) => {
    try {
      // Atomic update rather than find-then-save — avoids any chance of
      // this overwriting a concurrent change with a stale in-memory copy
      // of the document (e.g. two admins acting on the same affiliate at
      // once), and always returns the value that's actually now in the
      // database so the admin UI can't show a stale/incorrect status.
      const affiliate = await Affiliate.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: req.body.status,
            bannedReason: req.body.status === 'banned' ? (req.body.reason || '') : '',
          },
        },
        { new: true, runValidators: true }
      );
      if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });

      res.json({ success: true, affiliate });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/admin-affiliates/:id ───────────────────────────────────────
// Removes the affiliate account along with their referral/earnings
// tracking rows — mirrors how deleting a seller also removes their
// products (see routes/sellers.js admin delete). The sellers they
// referred are left completely untouched; only the affiliate-side
// tracking is erased. Ban instead of delete if you just want to stop
// them earning while keeping the paper trail.
router.delete('/:id', protect, requirePermission('affiliates.manage'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });

    await Promise.all([
      AffiliateReferral.deleteMany({ affiliate: affiliate._id }),
      AffiliateEarning.deleteMany({ affiliate: affiliate._id }),
      Affiliate.findByIdAndDelete(affiliate._id),
    ]);

    res.json({ success: true, message: 'Affiliate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/admin-affiliates/earnings/:earningId/paid — mark one paid ──
// Toggle so an accidental click can be undone.
router.patch('/earnings/:earningId/paid', protect, requirePermission('affiliates.manage'), writeLimiter, mongoIdParam('earningId'),
  body('paid').isBoolean(),
  validate,
  async (req, res) => {
    try {
      const earning = await AffiliateEarning.findById(req.params.earningId);
      if (!earning) return res.status(404).json({ success: false, message: 'Earning record not found' });

      earning.paid = req.body.paid;
      earning.paidAt = req.body.paid ? new Date() : null;
      await earning.save();

      res.json({ success: true, earning });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PATCH /api/admin-affiliates/:id/mark-all-paid — settle full balance ───
// Convenience for the common flow: affiliate sends one screenshot for
// their whole outstanding balance, admin pays it all in one WhatsApp
// transfer, and settles every unpaid earning row in one click.
router.patch('/:id/mark-all-paid', protect, requirePermission('affiliates.manage'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const result = await AffiliateEarning.updateMany(
      { affiliate: req.params.id, paid: false },
      { $set: { paid: true, paidAt: new Date() } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
