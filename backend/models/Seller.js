import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getPlansCache } from '../utils/plans.js';

const sellerSchema = new mongoose.Schema({
  username:            { type: String, required: true, unique: true, trim: true },
  // Last time the seller changed their username — used to enforce a
  // 7-day cooldown between changes (see PUT /api/seller-auth/username).
  // Left null until the first change so a seller who has never renamed
  // themselves isn't blocked.
  usernameChangedAt:   { type: Date, default: null },
  email:               { type: String, required: true, unique: true, trim: true, lowercase: true },
  // Optional because a seller who signs up via Google never sets one —
  // see routes/sellerAuth.js `/google`. Any seller can still add a
  // password later from Settings to also enable username/password login.
  password:            { type: String, required: false, default: null },
  googleId:            { type: String, default: null, index: true, sparse: true },
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

  // ── Street address ───────────────────────────────────────────────────
  // Freeform street/building address, separate from state/city (which
  // power location search/filter). Not required — many sellers only
  // want to show a general area. `showAddress` lets the seller decide
  // whether this is shown publicly on SellerDetailPage; it's always
  // visible to the seller themselves and to admins regardless.
  address:             { type: String, default: '', trim: true, maxlength: 200 },
  showAddress:         { type: Boolean, default: false },

  isActive:            { type: Boolean, default: true },
  isApproved:          { type: Boolean, default: false },
  
  // Token tracking on the seller — single source of truth
  token_expires_at:       { type: Date, default: null },
  token_duration_hours:   { type: Number, default: null },

  // ── Verified badge (NIN verification) ──────────────────────────────────
  nin: { type: String, default: null, select: false }, // sensitive — never returned by default
  // Full legal name as the seller typed it on their ID — shown to the
  // admin alongside the photo for manual comparison. Intentionally
  // separate from store_name (a store's display name is often a brand,
  // not a person's legal name).
  ninFullName: { type: String, default: '', select: false },
  // A photo of the seller (holding their ID, or the ID itself) that the
  // seller uploads for the admin to visually check against the NIN and
  // name. No third-party identity-verification API is used anywhere in
  // this flow — see routes/verification.js: submission goes straight to
  // an admin queue for manual human review and approval.
  ninPhoto: { type: String, default: '', select: false },
  ninStatus: {
    type: String,
    enum: ['none', 'pending', 'verified', 'rejected'],
    default: 'none',
  },
  ninVerifiedAt: { type: Date, default: null },
  ninRejectionReason: { type: String, default: '' },
  ninProviderRef: { type: String, default: '', select: false }, // reference ID from the NIN verification provider

  // Optional — a seller may include their BVN alongside NIN verification
  // for extra confidence during manual admin review. Never required,
  // never shown publicly, select:false like the other verification
  // fields above.
  bvn: { type: String, default: null, select: false },

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

  // ── Store customization (Shopify-style storefront editor) ─────────────
  // Rendered on SellerDetailPage. Kept as a small flat object rather than
  // a free-form theme builder — enough to feel personalized without
  // letting a seller break the page layout.
  storeTheme: {
    primaryColor:   { type: String, default: '#b8923a' },   // accent color for the store page
    layout:         { type: String, enum: ['grid', 'list'], default: 'grid' },
    bannerHeadline: { type: String, default: '', maxlength: 120 },
    bannerSubtext:  { type: String, default: '', maxlength: 200 },
    darkMode:       { type: Boolean, default: false },
  },

  // Up to `pinLimit` products shown first, in this order, on the
  // seller's store page — see routes/sellers.js PUT /:id/pins.
  pinnedProducts: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    default: [],
  },

  // ── Plan / listing limits ──────────────────────────────────────────────
  // Free plan: 50 products, 5 pins. Paid plans raise both — see
  // utils/plans.js (DB-backed, admin-editable via routes/adminPlans.js)
  // for what each plan grants, and routes/payments.js for how a seller
  // upgrades via Opay. No enum here — the admin can add/rename plans
  // from the dashboard, so this just stores whatever Plan.key was
  // current at signup/upgrade time; a plan later deleted still leaves
  // this value in place (see getPlan()'s fallback behavior).
  plan: {
    type: String,
    default: 'free',
    trim: true,
    lowercase: true,
  },
  planExpiresAt: { type: Date, default: null }, // null = free plan (never expires) or a lifetime paid plan

  // ── Account settings ────────────────────────────────────────────────
  themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },

  // ── Profile "about" content (shown on the seller's public about tab) ──
  aboutText: { type: String, default: '', maxlength: 2000 },

  // ── Affiliate referral ──────────────────────────────────────────────
  // Set once, at registration, if the seller signed up via an affiliate's
  // referral link (/seller/register?ref=<code> — see
  // routes/sellerAuth.js /register). Never changes afterwards: an
  // affiliate is only ever credited for sellers they personally brought
  // in. The richer tracking record (status, plan, timestamps) lives in
  // AffiliateReferral; this is just the fast denormalized pointer the
  // Opay webhook (routes/payments.js) reads to know who to pay a
  // commission to when this seller upgrades.
  referredByAffiliate: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', default: null, index: true },
}, { timestamps: true });

// Speeds up "sellers in my state" / "sellers in my state+city" queries,
// which is the access pattern used by the location-based sort/filter.
sellerSchema.index({ state: 1, city: 1 });

sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

sellerSchema.methods.comparePassword = async function(candidate) {
  if (!this.password) return false; // Google-only account, no password set
  return bcrypt.compare(candidate, this.password);
};

// Virtual: product posting limit for this seller's current plan.
sellerSchema.virtual('productLimit').get(function() {
  const plans = getPlansCache();
  const plan = plans[this.plan];
  return plan ? plan.productLimit : (plans.free ? plans.free.productLimit : 50);
});

// Virtual: how many products this seller may pin to the top of their store.
sellerSchema.virtual('pinLimit').get(function() {
  const plans = getPlansCache();
  const plan = plans[this.plan];
  return plan ? plan.pinLimit : (plans.free ? plans.free.pinLimit : 5);
});

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
