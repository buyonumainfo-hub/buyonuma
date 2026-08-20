import mongoose from 'mongoose';

// The fixed set of things an admin dashboard action can require. Kept as
// a flat list (rather than nested resource:action objects) so it's cheap
// to check ("does this role include 'products.delete'?") and easy to
// render as a checklist in the "create role" UI.
export const ADMIN_PERMISSIONS = [
  'sellers.view', 'sellers.create', 'sellers.edit', 'sellers.approve', 'sellers.delete',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'verification.review',
  'broadcast.send',
  'monitoring.view',
  'payments.view',
  'plans.manage',
  'affiliates.manage',
  'settings.edit',
  'roles.manage', // can create/edit other admin roles & assign them — gate this carefully
];

const adminRoleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [], enum: ADMIN_PERMISSIONS },
  isSuperAdmin: { type: Boolean, default: false }, // bypasses permission checks entirely; only the seeded first admin should have this
}, { timestamps: true });

export default mongoose.model('AdminRole', adminRoleSchema);
