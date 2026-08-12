import mongoose from 'mongoose';

// A buyer's rating + review of a seller (post-transaction feedback, not
// tied to a formal "order" since this app doesn't process orders/payments
// between buyer and seller — see the safety banner requirement). One
// review per buyer per seller; editing re-submits the same document.
const reviewSchema = new mongoose.Schema({
  seller:  { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  buyer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 1000, trim: true },
  // Seller can post one public reply to a review.
  sellerReply: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

reviewSchema.index({ seller: 1, buyer: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
