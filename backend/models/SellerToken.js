import mongoose from 'mongoose';

const sellerTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  label: { type: String, default: '' },           // admin note e.g. "For TechHub seller"
  duration_hours: { type: Number, required: true }, // how long products will show
  used: { type: Boolean, default: false },
  used_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
  used_at: { type: Date, default: null },
  expires_at: { type: Date, required: true }       // token itself expires if unused
}, { timestamps: true });

export default mongoose.model('SellerToken', sellerTokenSchema);
