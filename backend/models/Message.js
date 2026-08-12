import mongoose from 'mongoose';

// Polling-based chat between a buyer and a seller (see architecture note
// in routes/messages.js for why this is polling rather than a WebSocket).
// A "conversation" is uniquely identified by the (buyer, seller) pair.
const conversationSchema = new mongoose.Schema({
  buyer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  lastMessage:   { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  // Who sent the most recent message — powers the buyer/seller "yet to
  // reply" message filter (the other party is waiting on you when this
  // matches them, not you).
  lastMessageSender: { type: String, enum: ['buyer', 'seller', null], default: null },
  buyerUnread:   { type: Number, default: 0 },
  sellerUnread:  { type: Number, default: 0 },
  // Set true after the seller's first-ever email notification for this
  // buyer (see routes/messages.js). Buyers can send many messages in a
  // conversation — we only want to email the seller once per buyer, not
  // once per message, both to avoid spamming their inbox and to stay
  // under email-sending limits. In-app notifications still fire on every
  // message; only the email is capped to once.
  sellerNotifiedByEmail: { type: Boolean, default: false },
  // Optional product this conversation started from ("Chat about this item")
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
}, { timestamps: true });

conversationSchema.index({ buyer: 1, seller: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderType:   { type: String, enum: ['buyer', 'seller'], required: true },
  // Store both possible refs; only the one matching senderType is set.
  buyer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
  text:   { type: String, required: true, maxlength: 2000, trim: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
