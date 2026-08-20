import express from 'express';
import { body } from 'express-validator';
import AdminRole, { ADMIN_PERMISSIONS } from '../models/AdminRole.js';
import Admin from '../models/Admin.js';
import { protect, requirePermission } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// ─── GET /api/admin-roles/permissions — the fixed list, for building the
// "create role" checklist UI ─────────────────────────────────────────────
router.get('/permissions', protect, (req, res) => {
  res.json({ success: true, permissions: ADMIN_PERMISSIONS });
});

// ─── GET /api/admin-roles — list roles ──────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const roles = await AdminRole.find().sort({ createdAt: -1 });
    res.json({ success: true, roles });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/admin-roles — create a role (requires roles.manage) ─────────
router.post('/', protect, requirePermission('roles.manage'), writeLimiter,
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('permissions').isArray(),
  body('permissions.*').isIn(ADMIN_PERMISSIONS),
  validate,
  async (req, res) => {
    try {
      const role = await AdminRole.create({
        name: req.body.name,
        description: req.body.description || '',
        permissions: req.body.permissions,
      });
      res.status(201).json({ success: true, role });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ success: false, message: 'A role with that name already exists' });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/admin-roles/:id — edit a role's permissions ──────────────────
router.put('/:id', protect, requirePermission('roles.manage'), writeLimiter, mongoIdParam('id'),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isIn(ADMIN_PERMISSIONS),
  validate,
  async (req, res) => {
    try {
      const allowed = ['name', 'description', 'permissions'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      const role = await AdminRole.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
      res.json({ success: true, role });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── DELETE /api/admin-roles/:id ────────────────────────────────────────────
router.delete('/:id', protect, requirePermission('roles.manage'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const inUse = await Admin.countDocuments({ role: req.params.id });
    if (inUse > 0) return res.status(400).json({ success: false, message: `${inUse} admin(s) still have this role. Reassign them first.` });
    await AdminRole.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/admin-roles/team — list admin accounts + their roles ─────────
router.get('/team', protect, requirePermission('roles.manage'), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').populate('role', 'name isSuperAdmin');
    res.json({ success: true, admins });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/admin-roles/team — create a new admin account with a role ───
router.post('/team', protect, requirePermission('roles.manage'), writeLimiter,
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('password').isLength({ min: 6, max: 200 }),
  body('roleId').isMongoId(),
  validate,
  async (req, res) => {
    try {
      const role = await AdminRole.findById(req.body.roleId);
      if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

      const admin = await Admin.create({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email || '',
        role: role._id,
      });
      const out = admin.toObject(); delete out.password;
      res.status(201).json({ success: true, admin: out });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username already taken' });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/admin-roles/team/:id/role — reassign an admin's role ─────────
router.put('/team/:id/role', protect, requirePermission('roles.manage'), writeLimiter, mongoIdParam('id'),
  body('roleId').isMongoId(),
  validate,
  async (req, res) => {
    try {
      const admin = await Admin.findByIdAndUpdate(req.params.id, { role: req.body.roleId }, { new: true }).select('-password').populate('role', 'name');
      if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
      res.json({ success: true, admin });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

export default router;
