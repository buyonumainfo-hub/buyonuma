import mongoose from 'mongoose';

// Singleton document (exactly one row ever exists — see
// utils/affiliateSettings.js seedAffiliateSettingsIfEmpty) holding the
// admin-controlled affiliate program settings. Mirrors how Plan pricing
// works: DB is the source of truth, an in-memory cache is what request
// handlers actually read from for speed (see utils/affiliateSettings.js).
const affiliateSettingsSchema = new mongoose.Schema({
  // % of a seller's upgrade payment the referring affiliate earns.
  // Admin-editable from /admin/affiliates — see routes/adminAffiliates.js.
  commissionPercent: { type: Number, required: true, min: 0, max: 100, default: 10 },

  // Plain phone number in international format (e.g. "2348012345678"),
  // no leading +. Used on the affiliate's Earnings page to build a
  // wa.me link — affiliates don't withdraw in-app; they screenshot their
  // dashboard totals and send it to this WhatsApp number, and the admin
  // pays them manually and marks the earning(s) as paid.
  whatsappNumber: { type: String, default: '', trim: true, maxlength: 30 },

  // One-switch toggle: when true (default), an admin manually changing a
  // referred seller's plan (routes/sellers.js PUT /admin/:id) credits
  // the referring affiliate a commission exactly as if that seller had
  // paid for the upgrade themselves — see utils/affiliateCommission.js.
  // Flip this off from the Affiliate Program Settings panel to disable
  // that behavior without touching any code.
  creditAdminPlanChanges: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('AffiliateSettings', affiliateSettingsSchema);
