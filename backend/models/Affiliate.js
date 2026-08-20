import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// An affiliate marketer account — separate from Seller/Buyer/Admin, with
// its own login (see routes/affiliateAuth.js). An affiliate gets a unique
// referralCode that plugs into the seller registration link
// (/seller/register?ref=<code>, see routes/sellerAuth.js) and earns a
// commission (admin-controlled %, see utils/affiliateSettings.js) whenever
// a seller they referred upgrades their plan — see routes/payments.js'
// Opay webhook for where that commission is actually calculated and
// recorded (models/AffiliateEarning.js).
const affiliateSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:     { type: String, required: true },
  phone:        { type: String, default: '' },

  // Short, unique, human-shareable code — see utils/affiliateCode.js.
  referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },

  // A banned affiliate can't log in and stops earning new commissions,
  // but their history (referrals + earnings already on record) is kept
  // for the admin's books — see routes/adminAffiliates.js DELETE for the
  // separate "actually erase everything" action.
  status:       { type: String, enum: ['active', 'banned'], default: 'active', index: true },
  bannedReason: { type: String, default: '', maxlength: 300 },
}, { timestamps: true });

affiliateSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

affiliateSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

affiliateSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; return ret; },
});

export default mongoose.model('Affiliate', affiliateSchema);
