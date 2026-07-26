import mongoose from 'mongoose';

/**
 * Cached, reusable MongoDB (Mongoose) connection for serverless
 * environments (Vercel).
 *
 * WHY THIS MATTERS: a serverless function invocation either runs in a
 * brand-new Node.js process ("cold start") or reuses one from a recent
 * prior invocation ("warm"). Calling `mongoose.connect()` unconditionally
 * on every request — as this app previously did at the bottom of
 * index.js — opens a brand-new connection pool every single time, even
 * on warm invocations that already have a perfectly good connection sitting
 * around unused. That's slow (adds real connection-setup latency to every
 * request) and, under any real concurrent traffic, can exhaust MongoDB
 * Atlas's connection limit as multiple invocations each try to open their
 * own pool.
 *
 * The fix (the standard pattern recommended by both MongoDB and Vercel
 * for serverless): cache the connection on `global`, which — unlike
 * ordinary module-level variables in some bundling setups — reliably
 * persists across warm invocations within the same container. A second
 * call from a later warm invocation finds the cached connection and
 * reuses it instantly instead of reconnecting.
 *
 * We cache the in-flight PROMISE, not just the eventually-resolved
 * connection. That matters because several requests can land on the same
 * cold-started container in quick succession, all before the first
 * connection attempt has finished — caching the promise means they all
 * `await` the SAME in-progress connection attempt instead of each kicking
 * off their own separate `mongoose.connect()` call.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail loudly and immediately at import time rather than letting every
  // request fail individually with a confusing downstream error.
  throw new Error('MONGODB_URI environment variable is not set.');
}

// `global` (not a plain module-level variable) is what actually survives
// across warm invocations reliably in the Vercel/serverless Node.js
// runtime, regardless of how the function bundle is packaged.
let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

/**
 * Returns a ready-to-use Mongoose connection, establishing one only if
 * no cached connection or in-flight connection attempt already exists.
 * Safe to call on every request — on a warm invocation this resolves
 * near-instantly from the cache instead of reconnecting.
 */
export const connectToDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // fail fast on a lost connection instead of silently queuing queries that may never run
      maxPoolSize: 10,       // keep any one function instance's pool modest — serverless can run many concurrent instances, each with its own pool
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Don't cache a failed attempt — otherwise every subsequent request
    // would immediately fail against the same broken cached promise
    // instead of getting a chance to retry the connection.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

/**
 * Express middleware form of the above — ensures a DB connection is
 * ready before the request reaches any route handler that needs it, and
 * responds with a clean 503 instead of letting a route crash on a
 * missing connection if the database is genuinely unreachable.
 */
export const ensureDbConnected = async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again shortly.',
    });
  }
};

export default connectToDatabase;
