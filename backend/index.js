import './loadEnv.js'; // MUST be the first import — see loadEnv.js for why

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';

import authRoutes         from './routes/auth.js';
import sellerAuthRoutes   from './routes/sellerAuth.js';
import buyerAuthRoutes    from './routes/buyerAuth.js';
import sellerRoutes       from './routes/sellers.js';
import productRoutes      from './routes/products.js';
import adminRoutes        from './routes/admin.js';
import adminRolesRoutes   from './routes/adminRoles.js';
import sellerProductRoutes from './routes/sellerProducts.js';
import viewsRoutes        from './routes/views.js';
import verificationRoutes from './routes/verification.js';
import notificationRoutes from './routes/notifications.js';
import broadcastRoutes    from './routes/broadcast.js';
import aiChatRoutes       from './routes/aiChat.js';
import monitoringRoutes   from './routes/monitoring.js';
import metaRoutes         from './routes/meta.js';
import contactRoutes      from './routes/contact.js';
import reviewRoutes       from './routes/reviews.js';
import messageRoutes      from './routes/messages.js';
import paymentRoutes      from './routes/payments.js';
import adminPlansRoutes   from './routes/adminPlans.js';
import affiliateAuthRoutes   from './routes/affiliateAuth.js';
import affiliateRoutes       from './routes/affiliates.js';
import adminAffiliatesRoutes from './routes/adminAffiliates.js';

import cookieParser from 'cookie-parser';

import { generalLimiter } from './middleware/rateLimiter.js';
//import { sanitizeInput, preventNoSQLInjection } from './middleware/sanitize.js';
import { connectToDatabase, ensureDbConnected } from './lib/mongodb.js';

const app = express();

// Trust the load balancer / reverse proxy in front of us (Vercel, Netlify,
// nginx, etc.) so req.ip reflects the real client IP — this matters for
// rate limiting to be per-client instead of per-proxy.
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images/API to be fetched cross-origin by the frontend
}));

// ── CORS ──────────────────────────────────────────────────────────────────
// Restrict to known frontend origins in production; wide open in dev.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (server-to-server, curl, mobile apps) and
    // any explicitly whitelisted origin. If no origins are configured
    // (e.g. local dev), allow all — but warn so it isn't silently open
    // in a production deploy that forgot to set CORS_ORIGINS.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ CORS_ORIGINS is not set in production — CORS is currently open to all origins. Set CORS_ORIGINS to a comma-separated list of your frontend URL(s).');
}

// ── Compression + logging ───────────────────────────────────────────────
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────────────────────
// The `verify` callback stashes the exact raw request bytes on
// `req.rawBody`. Needed by routes/payments.js' Opay webhook, which must
// verify an HMAC signature against the EXACT bytes the sender signed —
// re-serializing the already-parsed `req.body` back to JSON is NOT
// guaranteed to reproduce those bytes (see utils/opay.js for the bug
// this fixed). Cheap to capture for every request, only used by that
// one route.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Needed for the anonymous cookie-based recommendation signal (see
// utils/recommend.js) — first-party, non-sensitive, category counts only.
app.use(cookieParser());

// ── Input hardening ──────────────────────────────────────────────────────
// Order matters: sanitize HTML/XSS first, then strip Mongo operator
// injection, then hpp guards against HTTP parameter pollution
// (?category=A&category=B tricks on array-unaware handlers).
//app.use(sanitizeInput);
//app.use(preventNoSQLInjection);
app.use(hpp());

// ── General rate limiting (per-route limiters layer on top of this) ─────
app.use('/api/', generalLimiter);

// ── Routes that must NOT depend on the database ──────────────────────────
// Registered before the DB-connection middleware below, so they're
// reachable (and stay fast/cheap to poll) even if MongoDB is briefly
// unreachable — useful for load balancer health checks across the 3
// load-balanced instances.
app.get('/', (_, res) => res.json({ status: 'ok', message: 'buy on uma api running' }));
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() }));

// ── Ensure a ready, cached DB connection before any route that needs one ──
// See lib/mongodb.js for why this is cached rather than reconnecting on
// every request — this middleware just makes sure that cached connection
// (fresh or reused) is ready before proceeding, and returns a clean 503
// instead of letting a route crash if the database is genuinely unreachable.
app.use(ensureDbConnected);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/seller-auth',   sellerAuthRoutes);
app.use('/api/buyer-auth',    buyerAuthRoutes);
app.use('/api/sellers',       sellerRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/admin-roles',   adminRolesRoutes);
app.use('/api/seller',        sellerProductRoutes);
app.use('/api/views',         viewsRoutes);
app.use('/api/verification',  verificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/broadcast',     broadcastRoutes);
app.use('/api/ai-chat',       aiChatRoutes);
app.use('/api/monitoring',    monitoringRoutes);
app.use('/api/meta',          metaRoutes);
app.use('/api/contact',       contactRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/admin-plans',   adminPlansRoutes);
app.use('/api/affiliate-auth',   affiliateAuthRoutes);
app.use('/api/affiliates',       affiliateRoutes);
app.use('/api/admin-affiliates', adminAffiliatesRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────────────
// Catches anything that slips past individual route try/catch blocks
// (e.g. malformed JSON body) so the process never crashes on a bad request.
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
});

// ── Local/traditional server startup ─────────────────────────────────────
// On Vercel, this whole block is skipped: @vercel/node wraps the exported
// `app` directly and handles incoming requests itself — it never calls
// app.listen(), and the DB connection is instead established lazily (and
// cached) by the ensureDbConnected middleware above on each invocation.
//
// Locally (or on any traditional/long-running host), we still want the
// familiar "connect once, then start listening" startup sequence — this
// now goes through the SAME cached connectToDatabase() used per-request
// above, so there's only one connection code path in the whole app, not
// two different ones for local vs. serverless.
//
// BUG FIX: this previously called `process.exit(1)` directly inside the
// Vercel-served request path (there was no guard separating "local
// startup" from "how the app boots on Vercel"), which meant a MongoDB
// hiccup during a cold start could kill the entire serverless function
// invocation outright instead of returning a clean error response. Now
// that path only exists here, guarded to local/non-Vercel environments —
// on Vercel, a connection failure is handled per-request by
// ensureDbConnected's try/catch instead, which returns a normal 503.
if (!process.env.VERCEL) {
  connectToDatabase()
    .then(() => {
      console.log('✅ Connected to MongoDB');
      const port = process.env.PORT || 5000;
      app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
    })
    .catch((err) => {
      console.error('❌ MongoDB connection failed at startup:', err.message);
      process.exit(1);
    });
}

// Surface otherwise-silent crashes instead of the process dying with no trace —
// important on a long-running instance (not needed per-invocation on Vercel,
// but harmless there either).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

export default app;
