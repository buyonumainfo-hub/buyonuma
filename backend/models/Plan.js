import mongoose from 'mongoose';

// Seller subscription plans — fully admin-editable (see
// routes/adminPlans.js). Replaces what used to be a hardcoded object in
// utils/plans.js so an admin can change prices, limits, or add/remove
// plans without a code deploy.
//
// `key` is the stable identifier stored on Seller.plan and Payment.plan —
// changing a plan's price/limits later never breaks existing sellers or
// payment records, since those only reference the key, not a copy of the
// values. Deleting a plan a seller is currently on, or the 'free' plan
// itself (every new seller defaults to it), is blocked — see the DELETE
// route for the actual guard.
const planSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-z0-9_-]+$/ },
  label:        { type: String, required: true, trim: true, maxlength: 40 },
  productLimit: { type: Number, required: true, min: 1 },
  pinLimit:     { type: Number, required: true, min: 0 },
  priceNGN:     { type: Number, required: true, min: 0 },
  // Short bullet points shown on the seller-facing plan page (see
  // frontend SellerPlan.jsx) — e.g. "Priority support". Kept separate
  // from the raw limits so the admin can phrase benefits in plain
  // language rather than the UI inferring them from numbers.
  benefits:     { type: [String], default: [] },
  // Inactive plans stop appearing as an upgrade option and can't be
  // newly assigned, but are NOT deleted — sellers already on one keep
  // their limits untouched.
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);
