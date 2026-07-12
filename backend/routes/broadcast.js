import express from 'express';
import Seller from '../models/Seller.js';
import { protect } from '../middleware/auth.js';
import { broadcastLimiter } from '../middleware/rateLimiter.js';
import { broadcastEmailValidators } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { sendBroadcastEmail } from '../utils/mailer.js';
import { logActivity } from '../utils/activityLog.js';

const router = express.Router();

/**
 * POST /api/broadcast/email — admin sends an email to every seller.
 * Runs asynchronously in the background and responds immediately with
 * a job-accepted message, since emailing hundreds of sellers can take
 * well over the typical serverless function timeout. The admin can see
 * the outcome logged in ActivityLog / the monitoring dashboard.
 *
 * ⚠️ DEPLOYMENT NOTE: on Vercel serverless, a function is frozen/killed
 * shortly after the response is sent — "background work after res.json()"
 * is not reliably guaranteed to finish there. This pattern works as-is on
 * a long-running Node process (Render, Railway, a VPS, Docker). If you
 * deploy this specific route on Vercel, either (a) await the send before
 * responding and accept the longer request time (fine for smaller seller
 * counts), or (b) push the job onto a queue (e.g. Upstash QStash) and have
 * a separate endpoint process it — ask if you'd like that wired in.
 */
router.post('/email', protect, broadcastLimiter, broadcastEmailValidators, validate, async (req, res) => {
  try {
    const { subject, message, audience = 'all' } = req.body;

    const query = audience === 'approved' ? { isApproved: true, isActive: true } : { isActive: true };
    const sellers = await Seller.find(query).select('email');
    const recipients = [...new Set(sellers.map((s) => s.email).filter(Boolean))];

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found for this audience' });
    }

    // Respond immediately — don't make the admin wait on hundreds of sends.
    res.json({
      success: true,
      message: `Broadcast started for ${recipients.length} recipient(s). This runs in the background.`,
      recipientCount: recipients.length,
    });

    // Fire the actual send after responding (best-effort background job).
    sendBroadcastEmail({ recipients, subject, message })
      .then((result) => {
        logActivity({
          type: 'broadcast_email_sent',
          meta: { subject, ...result },
        });
      })
      .catch((err) => {
        console.error('Broadcast email job failed:', err.message);
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
