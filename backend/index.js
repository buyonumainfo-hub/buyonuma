import './loadEnv.js'; // MUST be the first import — see loadEnv.js for why

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';

import authRoutes         from './routes/auth.js';
import sellerAuthRoutes   from './routes/sellerAuth.js';
import sellerRoutes       from './routes/sellers.js';
import productRoutes      from './routes/products.js';
import adminRoutes        from './routes/admin.js';
import sellerProductRoutes from './routes/sellerProducts.js';
import viewsRoutes        from './routes/views.js';
import verificationRoutes from './routes/verification.js';
import notificationRoutes from './routes/notifications.js';
import broadcastRoutes    from './routes/broadcast.js';
import aiChatRoutes       from './routes/aiChat.js';
import monitoringRoutes   from './routes/monitoring.js';
import metaRoutes         from './routes/meta.js';
import contactRoutes      from './routes/contact.js';

import { generalLimiter } from './middleware/rateLimiter.js';
import { sanitizeInput, preventNoSQLInjection } from './middleware/sanitize.js';

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
//app.use(cors())

// ── Compression + logging ───────────────────────────────────────────────
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Input hardening ──────────────────────────────────────────────────────
// Order matters: sanitize HTML/XSS first, then strip Mongo operator
// injection, then hpp guards against HTTP parameter pollution
// (?category=A&category=B tricks on array-unaware handlers).
app.use(sanitizeInput);
app.use(preventNoSQLInjection);
app.use(hpp());

// ── General rate limiting (per-route limiters layer on top of this) ─────
app.use('/api/', generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/seller-auth',   sellerAuthRoutes);
app.use('/api/sellers',       sellerRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/seller',        sellerProductRoutes);
app.use('/api/views',         viewsRoutes);
app.use('/api/verification',  verificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/broadcast',     broadcastRoutes);
app.use('/api/ai-chat',       aiChatRoutes);
app.use('/api/monitoring',    monitoringRoutes);
app.use('/api/meta',          metaRoutes);
app.use('/api/contact',       contactRoutes);

app.get('/', (_, res) => res.json({ status: 'ok', message: 'buy on uma api running' }));

// Lightweight health check for load balancer / uptime monitoring —
// deliberately does NOT touch the database so it stays fast and cheap
// to poll frequently from 3 load-balanced instances.
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() }));

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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('❌ MongoDB error:', err); });

// Surface otherwise-silent crashes instead of the process dying with no trace —
// important on a long-running instance (not needed per-invocation on Vercel,
// but harmless there either).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

export default app;