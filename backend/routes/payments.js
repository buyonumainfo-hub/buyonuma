import express from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import Seller from '../models/Seller.js';
import Payment from '../models/Payment.js';
import { protectSeller, protect, requirePermission } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { getPlansCache, getPlan } from '../utils/plans.js';
import { initOpayCheckout, verifyOpayWebhookSignature, isOpayConfigured } from '../utils/opay.js';
import { creditAffiliateCommission } from '../utils/affiliateCommission.js';
import cache from '../utils/cache.js';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

// ─── GET /api/payments/plans — public: what each plan grants/costs ─────────
router.get('/plans', (req, res) => {
  const cache = getPlansCache();
  const plans = Object.entries(cache)
    .filter(([, def]) => def.isActive !== false)
    .map(([key, def]) => ({ key, ...def }));
  res.json({ success: true, plans, configured: isOpayConfigured() });
});

// ─── POST /api/payments/opay/checkout — seller starts an upgrade ───────────
router.post('/opay/checkout', protectSeller, writeLimiter,
  body('plan').trim().notEmpty().withMessage('plan is required'),
  validate,
  async (req, res) => {
    if (!isOpayConfigured()) {
      return res.status(503).json({ success: false, message: 'Payments are not configured yet. Add your Opay Business keys to enable plan upgrades.' });
    }
    const requestedKey = req.body.plan.trim().toLowerCase();
    if (requestedKey === 'free') {
      return res.status(400).json({ success: false, message: 'The free plan has no checkout — nothing to upgrade to.' });
    }
    const planDef = getPlansCache()[requestedKey];
    if (!planDef || planDef.isActive === false) {
      return res.status(400).json({ success: false, message: 'That plan is not available.' });
    }
    try {
      const seller = await Seller.findById(req.seller.id);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      const reference = `UMA-${seller._id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const payment = await Payment.create({
        seller: seller._id,
        reference,
        amount: planDef.priceNGN,
        plan: requestedKey,
        status: 'pending',
      });

      const { checkoutUrl, orderNo } = await initOpayCheckout({
        reference,
        amountNGN: planDef.priceNGN,
        sellerEmail: seller.email,
        sellerName: seller.store_name,
        callbackUrl: `${process.env.FRONTEND_PUBLIC_URL || ''}/seller/settings?upgrade=pending`,
      });

      payment.opayOrderNo = orderNo || '';
      await payment.save();

      res.json({ success: true, checkoutUrl, reference });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Could not start checkout: ' + err.message });
    }
  }
);

// ─── POST /api/payments/opay/webhook — Opay calls this on payment events ───
// Source of truth for granting the upgrade — never trust the browser
// redirect alone. Verifies the request actually came from Opay via HMAC
// signature before touching anything.
// NOTE: no extra `express.json()` here — the body is already parsed by
// the global parser in index.js, which (specifically for this route's
// signature check) also stashes the exact raw bytes on `req.rawBody`.
// See utils/opay.js for why verifying against the raw bytes, rather
// than a re-serialized copy of req.body, is the part that actually
// matters here (that mismatch was a real bug — see the BUG FIX note
// there).
router.post('/opay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-opay-signature'] || req.headers['signature'];
    if (!verifyOpayWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { reference, status, orderNo } = req.body || {};
    const payment = await Payment.findOne({ reference });
    if (!payment) return res.status(404).json({ success: false, message: 'Unknown reference' });

    payment.rawWebhook = req.body;
    payment.opayOrderNo = orderNo || payment.opayOrderNo;

    if (status === 'SUCCESS' && payment.status !== 'success') {
      payment.status = 'success';
      await payment.save();

      const seller = await Seller.findById(payment.seller);
      if (seller) {
        seller.plan = payment.plan;
        seller.planExpiresAt = null; // one-time upgrade; adjust here if you switch to a recurring/subscription model
        await seller.save();
        await cache.del(`seller:${seller._id}`);
        await createNotification({
          recipientType: 'seller',
          seller: seller._id,
          title: 'Plan upgraded! 🎉',
          message: `You're now on the ${getPlan(payment.plan).label} plan — ${getPlan(payment.plan).productLimit} products, ${getPlan(payment.plan).pinLimit} pins.`,
          type: 'approval',
          link: '/seller/settings',
        });

        // ── Affiliate commission ──────────────────────────────────────
        // If this seller was referred by an affiliate, credit them a
        // commission for this upgrade — see utils/affiliateCommission.js
        // (shared with routes/sellers.js, for when an admin grants a
        // plan change manually instead of the seller paying for it).
        await creditAffiliateCommission({
          seller,
          plan: payment.plan,
          amount: payment.amount,
          source: 'payment',
          paymentId: payment._id,
        });
      }
    } else if (status === 'FAILED') {
      payment.status = 'failed';
      await payment.save();
    } else {
      await payment.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/payments/opay/status/:reference — seller polls after redirect ─
router.get('/opay/status/:reference', protectSeller, async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference, seller: req.seller.id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, status: payment.status, plan: payment.plan });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/payments/admin/summary — admin: total revenue BuyOnUma has
// generated from plan upgrades ────────────────────────────────────────────
router.get('/admin/summary', protect, requirePermission('payments.view'), async (req, res) => {
  try {
    const [totals] = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalTransactions: { $sum: 1 } } },
    ]);

    const byPlan = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$plan', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const failedCount = await Payment.countDocuments({ status: 'failed' });

    res.json({
      success: true,
      totalRevenue: totals?.totalRevenue || 0,
      totalTransactions: totals?.totalTransactions || 0,
      byPlan,
      pendingCount,
      failedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/payments/admin/transactions — admin: every payment attempt,
// paginated, with the seller it belongs to ─────────────────────────────────
router.get('/admin/transactions', protect, requirePermission('payments.view'), async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const { status } = req.query;

    const filter = {};
    if (status && ['pending', 'success', 'failed'].includes(status)) filter.status = status;

    const [transactions, total] = await Promise.all([
      Payment.find(filter)
        .populate('seller', 'store_name username email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
