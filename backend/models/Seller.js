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
  isActive:            { type: Boolean, default: true },
  isApproved:          { type: Boolean, default: false },
  
  // Token tracking on the seller — single source of truth
  token_expires_at:       { type: Date, default: null },
  token_duration_hours:   { type: Number, default: null },
}, { timestamps: true });

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

export default mongoose.model('Seller', sellerSchema);
