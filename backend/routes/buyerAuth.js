import express from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import Buyer from '../models/Buyer.js';
import { protectBuyer, JWT_SECRET_GETTER } from '../middleware/auth.js';
import { authLimiter, writeLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { verifyGoogleToken, isGoogleAuthConfigured } from '../utils/googleAuth.js';
import cache from '../utils/cache.js';

const router = express.Router();

const buyerToPublic = (buyer) => ({
  _id: buyer._id,
  name: buyer.name,
  email: buyer.email,
  photo: buyer.photo,
  phone: buyer.phone,
  state: buyer.state,
  city: buyer.city,
  hasPassword: Boolean(buyer.password),
});

const signBuyerToken = (buyer) =>
  jwt.sign({ id: buyer._id, name: buyer.name, role: 'buyer' }, JWT_SECRET_GETTER(), { expiresIn: '30d' });

// ─── POST /api/buyer-auth/register ──────────────────────────────────────────
router.post('/register', authLimiter,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6, max: 200 }).withMessage('Password must be at least 6 characters'),
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone, state, city } = req.body;
      const exists = await Buyer.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'An account with this email already exists. Try logging in instead.' });

      const buyer = new Buyer({ name, email, password, phone: phone || '', state: state || '', city: city || '' });
      await buyer.save();

      const token = signBuyerToken(buyer);
      res.status(201).json({ success: true, token, buyer: buyerToPublic(buyer) });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/buyer-auth/login ─────────────────────────────────────────────
router.post('/login', authLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const buyer = await Buyer.findOne({ email }).select('+password');
      if (!buyer) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const match = await buyer.comparePassword(password);
      if (!match) {
        if (!buyer.password) {
          return res.status(401).json({ success: false, message: 'This account was created with Google. Sign in with Google, or set a password from your profile first.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signBuyerToken(buyer);
      res.json({ success: true, token, buyer: buyerToPublic(buyer) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/buyer-auth/google ────────────────────────────────────────────
// Shared handler shape reused by seller-auth's /google too (kept
// separate per-role so buyer and seller accounts never get conflated).
// Body: { credential: <Google ID token from the frontend Google button> }
router.post('/google', authLimiter,
  body('credential').notEmpty().withMessage('Missing Google credential'),
  validate,
  async (req, res) => {
    if (!isGoogleAuthConfigured()) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured on this server yet.' });
    }
    try {
      const profile = await verifyGoogleToken(req.body.credential);

      let buyer = await Buyer.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
      if (buyer) {
        if (!buyer.googleId) { buyer.googleId = profile.googleId; await buyer.save(); }
      } else {
        buyer = await Buyer.create({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          photo: profile.picture,
          password: null,
        });
      }

      const token = signBuyerToken(buyer);
      res.json({ success: true, token, buyer: buyerToPublic(buyer), isNewAccount: buyer.createdAt?.getTime() === buyer.updatedAt?.getTime() });
    } catch (err) {
      res.status(401).json({ success: false, message: 'Google sign-in failed: ' + err.message });
    }
  }
);

// ─── GET /api/buyer-auth/verify ─────────────────────────────────────────────
router.get('/verify', protectBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
    res.json({ success: true, buyer: buyerToPublic(buyer) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/buyer-auth/profile ────────────────────────────────────────────
router.put('/profile', protectBuyer, writeLimiter,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().isLength({ max: 30 }),
  body('photo').optional().isLength({ max: 500 }),
  validate,
  async (req, res) => {
    try {
      const allowed = ['name', 'phone', 'photo', 'state', 'city'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      const buyer = await Buyer.findByIdAndUpdate(req.buyer.id, update, { new: true, runValidators: true });
      if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
      res.json({ success: true, buyer: buyerToPublic(buyer) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/buyer-auth/settings/email ─────────────────────────────────────
router.put('/settings/email', protectBuyer, writeLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('currentPassword').notEmpty().withMessage('Enter your current password to confirm this change'),
  validate,
  async (req, res) => {
    try {
      const buyer = await Buyer.findById(req.buyer.id).select('+password');
      if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
      const match = await buyer.comparePassword(req.body.currentPassword);
      if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

      const taken = await Buyer.findOne({ email: req.body.email, _id: { $ne: buyer._id } });
      if (taken) return res.status(400).json({ success: false, message: 'That email is already in use' });

      buyer.email = req.body.email;
      await buyer.save();
      res.json({ success: true, buyer: buyerToPublic(buyer), message: 'Email updated' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
