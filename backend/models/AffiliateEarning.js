import mongoose from 'mongoose';

// One row per commission an affiliate earned. Most come from a seller
// they referred successfully paying for a plan upgrade (see
// routes/payments.js Opay webhook) — `payment` is set and the partial
// unique index below (on `payment`) guards against a retried webhook
// delivery ever generating two rows for the same payment.
//
// An admin can also manually change a referred seller's plan from the
// admin panel (routes/sellers.js PUT /admin/:id) — when that happens
// (and the toggle in AffiliateSettings.creditAdminPlanChanges is on),
// it's treated exactly like the seller paid for it themselves and
// credits a `source: 'admin_grant'` row here, with no `payment` behind
// it. Both kinds go through the same shared helper — see
// utils/affiliateCommission.js — so the math and referral bookkeeping
// stay identical either way.
//
// There's no withdrawal flow: affiliates are told (in their dashboard)
// to screenshot their totals and send them to an admin WhatsApp number
// for manual payout — see AffiliateSettings.whatsappNumber. `paid` is
// only ever flipped by an admin (routes/adminAffiliates.js), once they've
// actually sent the money.
const affiliateEarningSchema = new mongoose.Schema({
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  referral:  { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateReferral', required: true },
  seller:    { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },

  // Only set for source: 'payment'. Left null for an admin-granted plan
  // change — see the partial unique index below, which only enforces
  // uniqueness where `payment` actually exists, so multiple admin
  // grants (which have no payment) never collide with each other.
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

  source: { type: String, enum: ['payment', 'admin_grant'], default: 'payment', index: true },
  // Which admin granted this, when source is 'admin_grant' — kept for
  // an audit trail, not used anywhere else.
  grantedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },

  plan:      { type: String, required: true }, // plan key the seller upgraded to, e.g. 'plus'
  amount:    { type: Number, required: true }, // the plan's price (NGN) this commission was computed from

  // Snapshot of the admin-set percentage AT THE TIME this was earned —
  // if the admin changes the global rate later, past earnings keep the
  // rate they were actually calculated under.
  commissionPercent: { type: Number, required: true, min: 0, max: 100 },
  commissionAmount:  { type: Number, required: true }, // in NGN

  paid:   { type: Boolean, default: false, index: true },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

affiliateEarningSchema.index({ affiliate: 1, createdAt: -1 });
affiliateEarningSchema.index(
  { payment: 1 },
  { unique: true, partialFilterExpression: { payment: { $type: 'objectId' } } }
);

export default mongoose.model('AffiliateEarning', affiliateEarningSchema);
