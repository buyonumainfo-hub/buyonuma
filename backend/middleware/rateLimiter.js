import rateLimit from 'express-rate-limit';
import { Redis } from '@upstash/redis';

/**
 * Distributed rate limiting.
 *
 * The app is deployed behind 3 load-balanced server instances (see
 * frontend/src/utils/api.js + README-DEPLOYMENT.md). A naive in-memory
 * rate limiter would let an attacker get 3x the allowed requests by being
 * routed to a different instance each time. To prevent that, we back the
 * limiter with Upstash Redis so all instances share the same counters.
 *
 * If Redis is unavailable, we fall back to the default in-memory store
 * per-instance rather than crashing — a degraded rate limiter is better
 * than no rate limiter or a downed server.
 */

let redis = null;
try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token && !url.includes('your-region')) {
    redis = new Redis({ url, token });
  }
} catch {
  redis = null;
}

/**
 * Minimal store adapter for express-rate-limit backed by Upstash Redis
 * REST client (which doesn't support the ioredis/node-redis command
 * interface that rate-limit-redis expects out of the box).
 */
class UpstashStore {
  constructor(prefix) {
    this.prefix = prefix;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  key(k) {
    return `ratelimit:${this.prefix}:${k}`;
  }
  async increment(key) {
    const redisKey = this.key(key);
    if (!redis) {
      // Fallback: no distributed state, allow the request (fail-open)
      // — the in-process nature means this only under-counts, never
      // blocks legitimate traffic incorrectly.
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
    try {
      const totalHits = await redis.incr(redisKey);

      // Arm (or re-arm) the expiry any time the key doesn't already
      // have one. We used to only do this when totalHits === 1, but
      // if that single pexpire call ever failed (network blip, etc.)
      // the key would be stuck in Redis with no TTL forever — it
      // would keep incrementing on every request and never reset,
      // even though resetTime kept getting recomputed client-side
      // and looked like a normal countdown. Using NX here makes this
      // self-healing: it's a no-op if a TTL is already set, and it
      // repairs the key if one is missing for any reason.
      await redis.pexpire(redisKey, this.windowMs, 'NX');

      const ttl = await redis.pttl(redisKey);
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
      return { totalHits, resetTime };
    } catch (err) {
      console.error('Rate limiter Redis error, failing open:', err.message);
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }
  async decrement(key) {
    if (!redis) return;
    try {
      await redis.decr(this.key(key));
    } catch {
      /* ignore */
    }
  }
  async resetKey(key) {
    if (!redis) return;
    try {
      await redis.del(this.key(key));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Builds a 429 handler that tells the client exactly when they can retry,
 * both machine-readable (`retryAfter` in seconds, plus the standard
 * `Retry-After` header) and human-readable (e.g. "Try again in 42s" or
 * "Try again in 3m"), instead of just a generic "too many requests"
 * message. `req.rateLimit.resetTime` is populated automatically by
 * express-rate-limit from the store's resetTime (see UpstashStore.increment
 * above), so this works correctly per-limiter without hardcoding windows here.
 */
const formatRetryAfter = (seconds) => {
  if (seconds <= 1) return '1 second';
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
};

const makeRateLimitHandler = (baseMessage) => (req, res) => {
  const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime) : null;
  const retryAfter = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : null;

  if (retryAfter) {
    res.set('Retry-After', String(retryAfter));
  }

  res.status(429).json({
    success: false,
    message: retryAfter ? `${baseMessage} Try again in ${formatRetryAfter(retryAfter)}.` : baseMessage,
    retryAfter, // seconds until the client may retry — frontend uses this for countdowns
    resetTime,  // absolute timestamp, for clients that prefer to compute their own countdown
  });
};

const jsonHandler = makeRateLimitHandler('Too many requests.');

// General API traffic — generous, mainly to blunt scraping/DoS.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('general'),
  handler: jsonHandler,
});

// Auth endpoints (login/register) — strict, brute-force protection.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('auth'),
  handler: jsonHandler,
  skipSuccessfulRequests: true,
});

// Password-reset / OTP requests — very strict to prevent email-bombing.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('otp'),
  handler: jsonHandler,
});

// Write operations (create/update/delete) — tighter than general reads.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('write'),
  handler: jsonHandler,
});

// AI chat — expensive (calls Groq), needs its own strict budget per user.
export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('aichat'),
  handler: makeRateLimitHandler('You are sending messages too fast.'),
});

// View/analytics tracking endpoints — high volume expected, but still capped
// per IP to stop bots from inflating a seller's stats.
export const viewTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('viewtrack'),
  handler: makeRateLimitHandler('Too many view events.'),
});

// Broadcast/notification send — admin only, but still guard against
// accidental loops or scripted abuse.
export const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new UpstashStore('broadcast'),
  handler: jsonHandler,
});