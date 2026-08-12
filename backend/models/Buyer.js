import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Buyer accounts. Buyers can browse fully anonymously (cart already works
// without an account), but an account is required for: messaging sellers,
// leaving reviews/ratings, and a personalized dashboard. Password is
// optional because a Google-only account never sets one.
const buyerSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true, maxlength: 100 },
  email:           { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:        { type: String, default: null, select: false },
  googleId:        { type: String, default: null, index: true, sparse: true },
  photo:           { type: String, default: '' },
  phone:           { type: String, default: '' },
  state:           { type: String, default: '' },
  city:            { type: String, default: '' },
  isActive:        { type: Boolean, default: true },

  // ── Cookie-linked recommendation profile ──────────────────────────────
  // Mirrors the anonymous cookie-based tracking (see utils/recommend.js)
  // but persisted once a buyer has an account, so recommendations survive
  // across devices too. Just a running tally of viewed categories.
  categoryInterests: { type: Map, of: Number, default: {} },
}, { timestamps: true });

buyerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

buyerSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

buyerSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; return ret; },
});

export default mongoose.model('Buyer', buyerSchema);
