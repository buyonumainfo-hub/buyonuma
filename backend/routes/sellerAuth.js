import express from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import { protectSeller } from '../middleware/auth.js';
import { sendSellerWelcomeEmail } from '../utils/mailer.js';
import cache from '../utils/cache.js';

const router = express.Router();

// POST /api/seller-auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      username, email, password, store_name, category,
      description, contact, whatsapp, website, social_media_handle,
      profile_picture, banner
    } = req.body;

    if (!username || !email || !password || !store_name || !category)
      return res.status(400).json({ success: false, message: 'Username, email, password, store name and category are required' });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email address' });

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
      isApproved:          false,
      token_expires_at:    null,
      token_duration_hours:null,
      
    });
    await seller.save();

    // Invalidate sellers cache so admin panel shows the new pending seller
   await cache.delPrefix('sellers:');

    // Send welcome email (non-blocking — won't crash registration if it fails)
    sendSellerWelcomeEmail({ to: email, store_name, username });

    res.status(201).json({
      success: true,
      message: 'Account created! Check your email and wait for admin approval.'
    });
  } catch (err) {
    //if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username or email already taken' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/seller-auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required' });

    const seller = await Seller.findOne({ username });
    if (!seller) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await seller.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: seller._id, username: seller.username, store_name: seller.store_name, role: 'seller' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    const hasActiveToken = seller.token_expires_at && new Date(seller.token_expires_at) > new Date();

    res.json({
      success: true,
      token,
      seller: {
        _id:               seller._id,
        username:          seller.username,
        email:             seller.email,
        store_name:        seller.store_name,
        category:          seller.category,
        profile_picture:   seller.profile_picture,
        isApproved:        seller.isApproved,
        token_expires_at:  seller.token_expires_at,
        hasActiveToken,
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
router.put('/profile', protectSeller, async (req, res) => {
  try {
    const allowed = ['store_name','description','contact','whatsapp','website','social_media_handle','profile_picture','banner'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const seller = await Seller.findByIdAndUpdate(req.seller.id, update, { new: true }).select('-password');
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

// In-memory OTP store: { email -> { code, expiresAt } }
// For production, replace with Redis or a DB collection
const otpStore = new Map();

// POST /api/seller-auth/forgot-password
// Body: { email }
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const seller = await Seller.findOne({ email: email});
    // Always return success so we don't leak which emails exist
    if (!seller) {
      return res.json({ success: false, message: 'If that email is registered, a code has been sent.' });
    }

    // Generate 5-digit code
    const code = String(Math.floor(10000 + Math.random() * 90000));
    otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    const { sendPasswordResetEmail } = await import('../utils/mailer.js');
    await sendPasswordResetEmail({ to: email, store_name: seller.store_name, code });

    res.json({ success: true, message: 'Reset code sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send reset email. Try again.' });
  }
});

// POST /api/seller-auth/verify-reset-code
// Body: { email, code }
router.post('/verify-reset-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code required' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return res.status(400).json({ success: false, message: 'No reset code found. Request a new one.' });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'Code has expired. Request a new one.' });
  }
  if (entry.code !== String(code)) {
    return res.status(400).json({ success: false, message: 'Incorrect code. Try again.' });
  }

  // Code valid — issue a short-lived reset token (just mark in the OTP store)
  entry.verified = true;
  res.json({ success: true, message: 'Code verified. You may now set a new password.' });
});

// POST /api/seller-auth/reset-password
// Body: { email, code, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, code and new password required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const entry = otpStore.get(email.toLowerCase());
    if (!entry || !entry.verified || entry.code !== String(code) || Date.now() > entry.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset session. Start over.' });
    }

    const seller = await Seller.findOne({ email: email.toLowerCase() });
    if (!seller) return res.status(404).json({ success: false, message: 'Account not found' });

    seller.password = newPassword;
    await seller.save();
    otpStore.delete(email.toLowerCase());

    res.json({ success: true, message: 'Password reset successfully! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
