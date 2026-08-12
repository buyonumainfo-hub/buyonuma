import express from 'express';
import { body, query } from 'express-validator';
import Message, { Conversation } from '../models/Message.js';
import Seller from '../models/Seller.js';
import Buyer from '../models/Buyer.js';
import { protectAny } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { createNotification } from '../utils/notify.js';
import { sendNewMessageEmail } from '../utils/mailer.js';

// ── Architecture note ──────────────────────────────────────────────────
// This is a POLLING-based chat, not a WebSocket. The backend deploys to
// Vercel serverless functions, which don't hold a persistent connection
// open between requests — a `ws` server started inside a serverless
// function gets torn down between invocations, so a real WebSocket
// wouldn't reliably stay connected there. Polling trades a little
// latency (the frontend re-fetches every few seconds — see
// frontend/src/hooks/useMessagePolling.js) for something that works
// correctly on the current hosting. If the backend later moves to a
// host with persistent processes (Render/Railway/Fly/a VPS), this can
// be swapped for real Socket.IO/ws with the same route shapes below.

const router = express.Router();

const actorFromReq = (req) => {
  if (req.buyer) return { type: 'buyer', id: req.buyer.id };
  if (req.seller) return { type: 'seller', id: req.seller.id };
  return null;
};

// ─── GET /api/messages/conversations — list this buyer's/seller's threads ──
router.get('/conversations', protectAny, async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor || actor.type === 'admin') return res.status(403).json({ success: false, message: 'Buyers and sellers only' });

    const filter = actor.type === 'buyer' ? { buyer: actor.id } : { seller: actor.id };

    // Optional status filter for the inbox: unread | read | pending-reply
    // (pending-reply = the other party sent the last message and this
    // actor hasn't replied yet — distinct from "unread" once the thread
    // has been opened, since opening it clears the unread badge but you
    // may still owe a reply).
    const { status } = req.query;
    const unreadField = actor.type === 'buyer' ? 'buyerUnread' : 'sellerUnread';
    if (status === 'unread') filter[unreadField] = { $gt: 0 };
    else if (status === 'read') filter[unreadField] = 0;
    else if (status === 'pending-reply') filter.lastMessageSender = actor.type === 'buyer' ? 'seller' : 'buyer';

    const conversations = await Conversation.find(filter)
      .populate('buyer', 'name photo')
      .populate('seller', 'store_name username profile_picture')
      .populate('product', 'name product_image')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, conversations });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/messages/conversations — start (or resume) a conversation ───
// Called from the "Start chat" button on SellerDetailPage / product page.
// Only a buyer can initiate — a seller replies within an existing thread.
router.post('/conversations', protectAny, writeLimiter,
  body('sellerId').isMongoId(),
  body('productId').optional().isMongoId(),
  validate,
  async (req, res) => {
    try {
      const actor = actorFromReq(req);
      if (actor?.type !== 'buyer') return res.status(403).json({ success: false, message: 'Only buyers can start a conversation' });

      const seller = await Seller.findById(req.body.sellerId).select('_id');
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      const conversation = await Conversation.findOneAndUpdate(
        { buyer: actor.id, seller: req.body.sellerId },
        { $setOnInsert: { product: req.body.productId || null } },
        { new: true, upsert: true }
      );

      res.json({ success: true, conversation });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── GET /api/messages/conversations/:id — messages in a thread (polled) ───
router.get('/conversations/:id', protectAny, mongoIdParam('id'),
  query('after').optional().isISO8601(), // for lightweight polling: only fetch messages newer than this timestamp
  validate,
  async (req, res) => {
    try {
      const actor = actorFromReq(req);
      const conversation = await Conversation.findById(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

      const isParticipant =
        (actor.type === 'buyer' && conversation.buyer.toString() === actor.id) ||
        (actor.type === 'seller' && conversation.seller.toString() === actor.id);
      if (!isParticipant) return res.status(403).json({ success: false, message: 'Not your conversation' });

      const filter = { conversation: conversation._id };
      if (req.query.after) filter.createdAt = { $gt: new Date(req.query.after) };

      const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(200);

      // Mark the other party's messages as read + clear this actor's unread badge.
      const unreadField = actor.type === 'buyer' ? 'buyerUnread' : 'sellerUnread';
      await Conversation.findByIdAndUpdate(conversation._id, { [unreadField]: 0 });
      await Message.updateMany(
        { conversation: conversation._id, senderType: { $ne: actor.type }, readAt: null },
        { readAt: new Date() }
      );

      res.json({ success: true, messages, conversation });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── POST /api/messages/conversations/:id — send a message ─────────────────
router.post('/conversations/:id', protectAny, writeLimiter, mongoIdParam('id'),
  body('text').trim().isLength({ min: 1, max: 2000 }),
  validate,
  async (req, res) => {
    try {
      const actor = actorFromReq(req);
      const conversation = await Conversation.findById(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

      const isParticipant =
        (actor.type === 'buyer' && conversation.buyer.toString() === actor.id) ||
        (actor.type === 'seller' && conversation.seller.toString() === actor.id);
      if (!isParticipant) return res.status(403).json({ success: false, message: 'Not your conversation' });

      const message = await Message.create({
        conversation: conversation._id,
        senderType: actor.type,
        buyer: actor.type === 'buyer' ? actor.id : null,
        seller: actor.type === 'seller' ? actor.id : null,
        text: req.body.text,
      });

      const unreadField = actor.type === 'buyer' ? 'sellerUnread' : 'buyerUnread';
      conversation.lastMessage = req.body.text.slice(0, 200);
      conversation.lastMessageAt = new Date();
      conversation.lastMessageSender = actor.type;
      conversation[unreadField] += 1;
      await conversation.save();

      if (actor.type === 'buyer') {
        const [buyer, seller] = await Promise.all([
          (await import('../models/Buyer.js')).default.findById(actor.id).select('name'),
          Seller.findById(conversation.seller).select('store_name email'),
        ]);
        await createNotification({
          recipientType: 'seller',
          seller: conversation.seller,
          title: 'New message',
          message: req.body.text.slice(0, 100),
          type: 'info',
          link: '/seller/messages',
        });
        // Email cap: only the very first message from a given buyer
        // triggers an email to the seller. Every message still creates
        // the in-app notification above — this only limits the email,
        // so the seller isn't emailed once per message in a back-and-forth
        // conversation, and so we stay under email-sending limits.
        if (seller?.email && !conversation.sellerNotifiedByEmail) {
          conversation.sellerNotifiedByEmail = true;
          await conversation.save();
          // Fire-and-forget — a slow/failed email must never delay or
          // fail the actual message send.
          sendNewMessageEmail({
            to: seller.email,
            sellerName: seller.store_name,
            buyerName: buyer?.name || 'A buyer',
            preview: req.body.text,
            link: `${process.env.FRONTEND_PUBLIC_URL || ''}/seller/messages`,
          }).catch(() => {});
        }
      }

      res.status(201).json({ success: true, message });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── DELETE /api/messages/conversations/:id — delete a whole thread ────────
// Either participant (buyer or seller) can delete their conversation —
// this removes the Conversation doc and all its Messages entirely. Wired
// up to the long-press "Delete chat" gesture in
// components/messaging/MessagesPanel.jsx on both dashboards.
router.delete('/conversations/:id', protectAny, writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor || actor.type === 'admin') return res.status(403).json({ success: false, message: 'Buyers and sellers only' });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const isParticipant =
      (actor.type === 'buyer' && conversation.buyer.toString() === actor.id) ||
      (actor.type === 'seller' && conversation.seller.toString() === actor.id);
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not your conversation' });

    await Promise.all([
      Message.deleteMany({ conversation: conversation._id }),
      Conversation.findByIdAndDelete(conversation._id),
    ]);

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
