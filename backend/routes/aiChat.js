import express from 'express';
import { getAIChatReply } from '../utils/groqChat.js';
import { aiChatLimiter } from '../middleware/rateLimiter.js';
import { aiChatValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';

const router = express.Router();

/**
 * POST /api/ai-chat
 * Body: { message, history?: [{role, content}], productId? }
 *
 * Public — anyone browsing the site can use the chat widget, logged in
 * or not. history is passed from the frontend (kept in local component
 * state / localStorage) rather than stored server-side per session,
 * which keeps this endpoint stateless and simple to scale horizontally.
 */
router.post('/', aiChatLimiter, aiChatValidators, validate, async (req, res) => {
  try {
    const { message, history, productId } = req.body;

    const safeHistory = Array.isArray(history)
      ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-8)
      : [];

    const reply = await getAIChatReply({ message, history: safeHistory, productId });

    logActivity({ type: 'ai_chat_message', product: productId || null, ip: req.ip }).catch(() => {});

    res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({
      success: false,
      message: 'The assistant is temporarily unavailable. Please try again in a moment.',
    });
  }
});

export default router;
