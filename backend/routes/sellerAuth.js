import express from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import { protectSeller, JWT_SECRET_GETTER } from '../middleware/auth.js';
import { sendSellerWelcomeEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import cache from '../utils/cache.js';
import { authLimiter, otpLimiter, writeLimiter } from '../middleware/rateLimiter.js';
import {
  sellerRegisterValidators,
  sellerLoginValidators,
  sellerProfileValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { createNotification } from '../utils/notify.js';
import { body } from 'express-validator';

const router = express.Router();

// POST /api/seller-auth/register
router.post('/register', authLimiter, sellerRegisterValidators, validate, async (req, res) => {
  try {
    const {
      username, email, password, store_name, category,
      description, contact, whatsapp, website, social_media_handle,
      profile_picture, banner, state, city
    } = req.body;

    const exists = await Seller.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      const field = exists.username === username ? 'Username' : 'Email';
      return res.status(400).json({ success: false, message: `${field} already taken` });
    }

    const seller = new Seller({
      username, email, password, store_name, category,
      description:         description         || '',
      contact:             contact             || '',
      whatsapp:            whatsapp            || '',
      website:             website             || '',
      social_media_handle: social_media_handle || '',
      profile_picture:     profile_picture     || '',
      banner:              banner              || '',
      state:               state               || '',
      city:                city                || '',
      isApproved:          false,
      token_expires_at:    null,
      token_duration_hours:null,
    });
    await seller.save();

    // Invalidate sellers cache so admin panel shows the new pending seller
    await cache.delPrefix('sellers:');

    await logActivity({ type: 'seller_registered', seller: seller._id, meta: { store_name, username, state, city }, ip: req.ip });

    // Send welcome email (non-blocking — won't crash registration if it fails)
    sendSellerWelcomeEmail({ to: email, store_name, username });

    res.status(201).json({
      success: true,
      message: 'Account created! Check your email and wait for admin approval.'
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username or email already taken' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seller-auth/login
router.post('/login', authLimiter, sellerLoginValidators, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    const seller = await Seller.findOne({ username });
    if (!seller) {
      await logActivity({ type: 'seller_login_failed', meta: { username, reason: 'not_found' }, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await seller.comparePassword(password);
    if (!isMatch) {
      await logActivity({ type: 'seller_login_failed', seller: seller._id, meta: { reason: 'bad_password' }, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: seller._id, username: seller.username, store_name: seller.store_name, role: 'seller' },
      JWT_SECRET_GETTER(),
      { expiresIn: '7d' }
    );

    const hasActiveToken = seller.token_expires_at && new Date(seller.token_expires_at) > new Date();

    await logActivity({ type: 'seller_login', seller: seller._id, ip: req.ip });

    res.json({
      success: true,
      token,
      seller: {
        _id:               seller._id,
        username:          seller.username,
        email:             seller.email,
        store_name:        seller.store_name,
        category:          seller.category,
        state:             seller.state,
        city:              seller.city,
        profile_picture:   seller.profile_picture,
        isApproved:        seller.isApproved,
        token_expires_at:  seller.token_expires_at,
        hasActiveToken,
        ninStatus:         seller.ninStatus,
        isVerified:        seller.ninStatus === 'verified',
        pushEnabled:       seller.pushEnabled,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seller-auth/me
router.get('/me', protectSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/seller-auth/profile
router.put('/profile', protectSeller, writeLimiter, sellerProfileValidators, validate, async (req, res) => {
  try {
    const allowed = ['store_name','description','contact','whatsapp','website','social_media_handle','profile_picture','banner','state','city'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const seller = await Seller.findByIdAndUpdate(req.seller.id, update, { new: true, runValidators: true }).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    // Invalidate caches that reference this seller
    await cache.delPrefix('sellers:');
    await cache.delPrefix(`seller:${req.seller.id}`);
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/seller-auth/verify
router.get('/verify', protectSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

// ── Password reset (OTP) ────────────────────────────────────────────────
//
// SCALABILITY FIX: this previously used an in-memory `Map` to store OTP
// codes. With 3 load-balanced server instances behind a load balancer,
// each instance has its OWN memory — a code generated on Server A would
// not exist on Server B, so a user's "verify code" or "reset password"
// request could randomly fail ~2/3 of the time depending on which
// instance handled it. OTPs now live in Redis (already used elsewhere in
// this app for caching), which is shared across all instances.
//
// Falls back to returning a clear error if Redis is unavailable rather
// than silently using per-instance memory again.

const otpKey = (email) => `otp:seller-reset:${email.toLowerCase()}`;

// POST /api/seller-auth/forgot-password
router.post('/forgot-password', otpLimiter, forgotPasswordValidators, validate, async (req, res) => {
  try {
    const { email } = req.body;

    const seller = await Seller.findOne({ email });
    // Always return success so we don't leak which emails exist
    if (!seller) {
      return res.json({ success: true, message: 'If that email is registered, a code has been sent.' });
    }

    const code = String(Math.floor(10000 + Math.random() * 90000));
    await cache.set(otpKey(email), { code, verified: false }, 10 * 60); // 10 min TTL

    await sendPasswordResetEmail({ to: email, store_name: seller.store_name, code });

    res.json({ success: true, message: 'Reset code sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send reset email. Try again.' });
  }
});

// POST /api/seller-auth/verify-reset-code
router.post('/verify-reset-code', otpLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('code').trim().isLength({ min: 5, max: 5 }).isNumeric(),
  validate,
  async (req, res) => {
    try {
      const { email, code } = req.body;
      const entry = await cache.get(otpKey(email));
      if (!entry) return res.status(400).json({ success: false, message: 'No reset code found or it has expired. Request a new one.' });
      if (entry.code !== String(code)) {
        return res.status(400).json({ success: false, message: 'Incorrect code. Try again.' });
      }

      entry.verified = true;
      await cache.set(otpKey(email), entry, 10 * 60);
      res.json({ success: true, message: 'Code verified. You may now set a new password.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/seller-auth/reset-password
router.post('/reset-password', otpLimiter, resetPasswordValidators, validate, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const entry = await cache.get(otpKey(email));
    if (!entry || !entry.verified || entry.code !== String(code)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset session. Start over.' });
    }

    const seller = await Seller.findOne({ email });
    if (!seller) return res.status(404).json({ success: false, message: 'Account not found' });

    seller.password = newPassword;
    await seller.save();
    await cache.del(otpKey(email));

    res.json({ success: true, message: 'Password reset successfully! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
