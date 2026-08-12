import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { protect, JWT_SECRET_GETTER } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { adminLoginValidators, adminChangePasswordValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { connectToDatabase } from '../lib/mongodb.js';

const router = express.Router();

// Init default admin.
// SECURITY: refuse to boot with a guessable default password in production —
// this previously silently created "admin / admin123" if env vars were unset.
const initAdmin = async () => {
  try {
    // BUG FIX: this runs at module import time — before any request has
    // come in, and therefore before the ensureDbConnected middleware in
    // index.js has ever run. It used to work anyway because Mongoose
    // buffers commands by default (queueing a query until a connection
    // becomes available), but lib/mongodb.js's cached connector sets
    // `bufferCommands: false` (deliberately — buffering hides connection
    // problems instead of surfacing them). So this needs to explicitly
    // wait for a ready connection itself rather than relying on that
    // implicit behavior.
    await connectToDatabase();

    const count = await Admin.countDocuments();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD;
      if (!password) {
        if (process.env.NODE_ENV === 'production') {
          // BUG FIX: this used to call process.exit(1) directly here.
          // Since initAdmin() runs at import time, that would kill the
          // ENTIRE serverless function — not just admin creation — on
          // every single cold start until ADMIN_PASSWORD is set, taking
          // the whole API down rather than just leaving "no admin
          // account exists yet" unresolved. Logging clearly and skipping
          // admin creation is a much safer failure mode: every other
          // route keeps working, and admin login simply won't succeed
          // until the env var is set and a fresh cold start runs this again.
          console.error('❌ ADMIN_PASSWORD env var is required in production to create the initial admin account. Skipping admin creation — set ADMIN_PASSWORD and redeploy.');
          return;
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
router.get('/verify', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password').populate('role', 'name permissions isSuperAdmin');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    // No role assigned = legacy full-access admin (see models/Admin.js).
    const isSuperAdmin = !admin.role || admin.role.isSuperAdmin;
    res.json({
      success: true,
      admin: { id: admin._id, username: admin.username, role: admin.role?.name || null },
      permissions: isSuperAdmin ? null : (admin.role.permissions || []), // null = unrestricted (super admin)
      isSuperAdmin,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
