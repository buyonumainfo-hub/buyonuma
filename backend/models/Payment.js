import mongoose from 'mongoose';

// One row per Opay checkout attempt for a seller plan upgrade. Created
// as 'pending' when the seller starts checkout, flipped to 'success' by
// the Opay webhook (source of truth) — never trust the client-side
// redirect alone to grant the upgrade.
const paymentSchema = new mongoose.Schema({
  seller:      { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  reference:   { type: String, required: true, unique: true }, // our own generated reference, sent to Opay
  opayOrderNo: { type: String, default: '' }, // Opay's own order/txn id, filled in once known
  amount:      { type: Number, required: true }, // in NGN (kobo handled at the Opay-call boundary, see utils/opay.js)
  plan:        { type: String, required: true }, // e.g. 'plus', 'pro' — see utils/plans.js for what each grants
  status:      { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
  rawWebhook:  { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
