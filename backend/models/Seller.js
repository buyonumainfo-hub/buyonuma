import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({
  username:            { type: String, required: true, unique: true, trim: true },
  email:               { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:            { type: String, required: true },
  store_name:          { type: String, required: true, trim: true },
  description:         { type: String, default: '' },
  category: {
    type: String, required: true,
    enum: [
  'Food & Beverages & Cakes',
  "Jewelry & Accessories",
  "Clothing",
  "Shoes",
  "Perfumes",
  "Textbooks", 
  "Electronics", 
  "Services",
  "Phones & Accessories", 
  "Beauty & Skincare", 
  "Furniture & Home Decor", "Health & Fitness", 
  "Stationery & Supplies", "Event Tickets", "Art & Design", 
  "Rentals",
  'Other']
  },
  rating:              { type: Number, min: 0, max: 5, default: 0 },
  profile_picture:     { type: String, default: '' },
  banner:              { type: String, default: '' },
  contact:             { type: String, default: '' },
  website:             { type: String, default: '' },
  social_media_handle: { type: String, default: '' },
  whatsapp:            { type: String, default: '' },

  // ── Location (state + city/town) ────────────────────────────────────────
  // Powers location-based sort/filter on the public product & seller
  // listings, and lets buyers browsing from a given state/city see nearby
  // sellers first. `state` is validated against the fixed Nigeria state
  // list; `city` is freeform (see utils/nigeriaLocations.js) since we
  // can't exhaustively enumerate every town/ward.
  state:               { type: String, default: '', index: true },
  city:                { type: String, default: '', trim: true, index: true },

  isActive:            { type: Boolean, default: true },
  isApproved:          { type: Boolean, default: false },
  
  // Token tracking on the seller — single source of truth
  token_expires_at:       { type: Date, default: null },
  token_duration_hours:   { type: Number, default: null },

  // ── Verified badge (NIN verification) ──────────────────────────────────
  nin: { type: String, default: null, select: false }, // sensitive — never returned by default
  ninStatus: {
    type: String,
    enum: ['none', 'pending', 'verified', 'rejected'],
    default: 'none',
  },
  ninVerifiedAt: { type: Date, default: null },
  ninRejectionReason: { type: String, default: '' },
  ninProviderRef: { type: String, default: '', select: false }, // reference ID from the NIN verification provider

  // ── Analytics counters (fast reads for dashboards; source of truth is
  //     ActivityLog for time-series, these are running totals) ──────────
  viewCounts: {
    storeViews: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    productPageViews: { type: Number, default: 0 },
    addToCartClicks: { type: Number, default: 0 },
  },

  // ── Web push opt-in ──────────────────────────────────────────────────
  pushEnabled: { type: Boolean, default: false },
}, { timestamps: true });

// Speeds up "sellers in my state" / "sellers in my state+city" queries,
// which is the access pattern used by the location-based sort/filter.
sellerSchema.index({ state: 1, city: 1 });

sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

sellerSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Virtual: is the seller's token currently active?
sellerSchema.virtual('hasActiveToken').get(function() {
  return this.token_expires_at && new Date(this.token_expires_at) > new Date();
});

// Virtual: verified badge — true once admin/provider confirms the seller's NIN
sellerSchema.virtual('isVerified').get(function() {
  return this.ninStatus === 'verified';
});

sellerSchema.set('toJSON', { virtuals: true });
sellerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Seller', sellerSchema);
