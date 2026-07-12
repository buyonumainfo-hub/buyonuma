import express from 'express';
import { sendContactEmail } from '../utils/mailer.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { contactFormValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * POST /api/contact — public "Contact Us" form submission.
 * Reuses the auth rate limit budget (strict) since this is an unauthenticated
 * public endpoint that sends an email on every hit — a natural spam target.
 */
router.post('/', authLimiter, contactFormValidators, validate, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await sendContactEmail({ name, email, message });
    res.json({ success: true, message: 'Thanks for reaching out — we will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not send your message right now. Please try again shortly.' });
  }
});

export default router;
