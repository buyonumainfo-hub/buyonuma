import express from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import Affiliate from '../models/Affiliate.js';
import { protectAffiliate, JWT_SECRET_GETTER } from '../middleware/auth.js';
import { authLimiter, writeLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { generateUniqueReferralCode } from '../utils/affiliateCode.js';

const router = express.Router();

const affiliateToPublic = (a) => ({
  _id: a._id,
  name: a.name,
  email: a.email,
  phone: a.phone,
  referralCode: a.referralCode,
  status: a.status,
  createdAt: a.createdAt,
});

const signAffiliateToken = (a) =>
  jwt.sign({ id: a._id, name: a.name, role: 'affiliate' }, JWT_SECRET_GETTER(), { expiresIn: '30d' });

// ─── POST /api/affiliate-auth/register ──────────────────────────────────────
router.post('/register', authLimiter,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6, max: 200 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isLength({ max: 30 }),
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      const exists = await Affiliate.findOne({ email });
      if (exists) {
        return res.status(400).json({ success: false, message: 'An affiliate account with this email already exists. Try logging in instead.' });
      }

      const referralCode = await generateUniqueReferralCode();
      const affiliate = new Affiliate({ name, email, password, phone: phone || '', referralCode });
      await affiliate.save();

      const token = signAffiliateToken(affiliate);
      res.status(201).json({ success: true, token, affiliate: affiliateToPublic(affiliate) });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/affiliate-auth/login ─────────────────────────────────────────
router.post('/login', authLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const affiliate = await Affiliate.findOne({ email });
      if (!affiliate) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const match = await affiliate.comparePassword(password);
      if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      if (affiliate.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Your affiliate account has been suspended. Contact the BuyOnUma team if you think this is a mistake.',
        });
      }

      const token = signAffiliateToken(affiliate);
      res.json({ success: true, token, affiliate: affiliateToPublic(affiliate) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── GET /api/affiliate-auth/verify ─────────────────────────────────────────
router.get('/verify', protectAffiliate, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliate.id);
    if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
    if (affiliate.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your affiliate account has been suspended.' });
    }
    res.json({ success: true, affiliate: affiliateToPublic(affiliate) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/affiliate-auth/profile ────────────────────────────────────────
router.put('/profile', protectAffiliate, writeLimiter,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().isLength({ max: 30 }),
  validate,
  async (req, res) => {
    try {
      const allowed = ['name', 'phone'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      const affiliate = await Affiliate.findByIdAndUpdate(req.affiliate.id, update, { new: true, runValidators: true });
      if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });
      res.json({ success: true, affiliate: affiliateToPublic(affiliate) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/affiliate-auth/settings/password ──────────────────────────────
router.put('/settings/password', protectAffiliate, writeLimiter,
  body('currentPassword').notEmpty().withMessage('Enter your current password'),
  body('newPassword').isLength({ min: 6, max: 200 }).withMessage('New password must be at least 6 characters'),
  validate,
  async (req, res) => {
    try {
      const affiliate = await Affiliate.findById(req.affiliate.id);
      if (!affiliate) return res.status(404).json({ success: false, message: 'Affiliate not found' });

      const match = await affiliate.comparePassword(req.body.currentPassword);
      if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

      affiliate.password = req.body.newPassword;
      await affiliate.save();
      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
