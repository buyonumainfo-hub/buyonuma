import express from 'express';
import { body } from 'express-validator';
import Plan from '../models/Plan.js';
import Seller from '../models/Seller.js';
import { protect, requirePermission } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { loadPlansCache } from '../utils/plans.js';

const router = express.Router();

const planValidators = [
  body('key').trim().toLowerCase().matches(/^[a-z0-9_-]+$/).withMessage('Key must be lowercase letters, numbers, - or _ only'),
  body('label').trim().isLength({ min: 1, max: 40 }),
  body('productLimit').isInt({ min: 1 }).withMessage('Product limit must be at least 1'),
  body('pinLimit').isInt({ min: 0 }),
  body('priceNGN').isFloat({ min: 0 }),
  body('benefits').optional().isArray(),
  body('benefits.*').optional().isLength({ max: 120 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
];

// ─── GET /api/admin-plans — admin: every plan, including inactive ones ─────
router.get('/', protect, requirePermission('plans.manage'), async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1, priceNGN: 1 });
    // How many sellers currently sit on each plan — informs the admin
    // before they try to delete or deactivate one.
    const counts = await Seller.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));
    res.json({
      success: true,
      plans: plans.map(p => ({ ...p.toObject(), sellerCount: countMap[p.key] || 0 })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/admin-plans — create a new plan ──────────────────────────────
router.post('/', protect, requirePermission('plans.manage'), writeLimiter, planValidators, validate, async (req, res) => {
  try {
    const { key, label, productLimit, pinLimit, priceNGN, benefits, isActive, sortOrder } = req.body;
    const plan = await Plan.create({
      key, label, productLimit, pinLimit, priceNGN,
      benefits: benefits || [],
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    });
    await loadPlansCache();
    res.status(201).json({ success: true, plan });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: `A plan with the key "${req.body.key}" already exists` });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/admin-plans/:id — edit a plan's price/limits/benefits ────────
// The plan's `key` is intentionally NOT editable here — it's what every
// existing Seller.plan and Payment.plan value already points to;
// renaming it would silently orphan those records. Delete and recreate
// under a new key instead if a rename is genuinely needed.
router.put('/:id', protect, requirePermission('plans.manage'), writeLimiter, mongoIdParam('id'),
  body('label').optional().trim().isLength({ min: 1, max: 40 }),
  body('productLimit').optional().isInt({ min: 1 }),
  body('pinLimit').optional().isInt({ min: 0 }),
  body('priceNGN').optional().isFloat({ min: 0 }),
  body('benefits').optional().isArray(),
  body('benefits.*').optional().isLength({ max: 120 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
  validate,
  async (req, res) => {
    try {
      const allowed = ['label', 'productLimit', 'pinLimit', 'priceNGN', 'benefits', 'isActive', 'sortOrder'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

      const plan = await Plan.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

      await loadPlansCache();
      res.json({ success: true, plan });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/admin-plans/:id ────────────────────────────────────────────
router.delete('/:id', protect, requirePermission('plans.manage'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (plan.key === 'free') {
      return res.status(400).json({ success: false, message: 'The free plan can\'t be deleted — every new seller defaults to it.' });
    }

    const inUse = await Seller.countDocuments({ plan: plan.key });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `${inUse} seller(s) are currently on this plan. Move them to another plan first, or deactivate this plan instead of deleting it.`,
      });
    }

    await Plan.findByIdAndDelete(req.params.id);
    await loadPlansCache();
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
