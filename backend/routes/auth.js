import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { protect, JWT_SECRET_GETTER } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { adminLoginValidators, adminChangePasswordValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';

const router = express.Router();

// Init default admin.
// SECURITY: refuse to boot with a guessable default password in production —
// this previously silently created "admin / admin123" if env vars were unset.
const initAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD;
      if (!password) {
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ FATAL: ADMIN_PASSWORD env var is required in production to create the initial admin account.');
          process.exit(1);
        }
        console.warn('⚠️ ADMIN_PASSWORD not set — using dev-only default "admin123". DO NOT use this in production.');
      }
      const admin = new Admin({ username, password: password || 'admin123' });
      await admin.save();
      console.log(`✅ Default admin created — username: ${username}`);
    }
  } catch (err) { console.error('Error initializing admin:', err); }
};
initAdmin();

// POST /api/auth/login — admin login
router.post('/login', authLimiter, adminLoginValidators, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      await logActivity({ type: 'admin_login_failed', meta: { username, reason: 'not_found' }, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await logActivity({ type: 'admin_login_failed', meta: { username, reason: 'bad_password' }, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      JWT_SECRET_GETTER(),
      { expiresIn: '24h' }
    );

    await logActivity({ type: 'admin_login', meta: { username }, ip: req.ip });
    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, adminChangePasswordValidators, validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin.id);
    if (!await admin.comparePassword(currentPassword))
      return res.status(401).json({ success: false, message: 'Current password incorrect' });

    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/verify
router.get('/verify', protect, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

export default router;
