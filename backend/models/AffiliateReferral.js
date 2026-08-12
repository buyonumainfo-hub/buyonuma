import mongoose from 'mongoose';

// One row per seller a given affiliate referred. Created at seller
// registration time when a valid ?ref=<code> was present (see
// routes/sellerAuth.js /register), then flipped to 'upgraded' the first
// time that seller pays for a plan (see routes/payments.js webhook).
//
// `seller` is unique — a seller can only ever have been referred by one
// affiliate (whichever code was present the moment they signed up), so
// there's exactly one referral row per seller, not one per affiliate visit.
const affiliateReferralSchema = new mongoose.Schema({
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  seller:    { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, unique: true },
  status:    { type: String, enum: ['registered', 'upgraded'], default: 'registered', index: true },
  // The most recent plan the seller upgraded to — kept here (in addition
  // to the full history in AffiliateEarning) so the affiliate's "my
  // referred sellers" list can show it without a join.
  plan:          { type: String, default: '' },
  lastUpgradeAt: { type: Date, default: null },
}, { timestamps: true });

affiliateReferralSchema.index({ affiliate: 1, createdAt: -1 });

export default mongoose.model('AffiliateReferral', affiliateReferralSchema);
