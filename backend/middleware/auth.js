import jwt from 'jsonwebtoken';

/**
 * SECURITY: previously this fell back to a hardcoded 'fallback_secret'
 * when JWT_SECRET was missing from the environment. That meant anyone
 * could forge a valid admin/seller JWT by signing with the well-known
 * string 'fallback_secret' if the env var was ever unset (e.g. a
 * misconfigured deploy). We fail loudly instead of silently running with
 * a guessable secret.
 *
 * IMPORTANT: JWT_SECRET is read lazily (inside a function), NOT cached
 * into a module-level constant at import time. Reason: ES module imports
 * are hoisted, so `process.env.JWT_SECRET` can be read here before
 * dotenv.config() has actually run elsewhere in the app, depending on
 * import order / bundler / serverless entry point — capturing it once at
 * module load risks permanently capturing `undefined`. Reading it inside
 * getJwtSecret() means it's evaluated the moment a request actually comes
 * in, by which point env vars are guaranteed to be loaded (Node has
 * already fully booted and, on Vercel, env vars are injected into the
 * process before any handler runs).
 */
let cachedSecret = null;
const getJwtSecret = () => {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 10) {
    throw new Error('JWT_SECRET is missing or too short (min 16 chars). Set it in your environment.');
  }
  cachedSecret = secret;
  return cachedSecret;
};

const getToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return token || null;
};

const secretMisconfiguredResponse = (res) =>
  res.status(500).json({
    success: false,
    message: 'Server auth is misconfigured (JWT_SECRET missing). Contact the site admin.',
  });

// Admin-only protect
export const protect = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  let secret;
  try { secret = getJwtSecret(); } catch (err) { console.error(err.message); return secretMisconfiguredResponse(res); }
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Seller-only protect
export const protectSeller = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  let secret;
  try { secret = getJwtSecret(); } catch (err) { console.error(err.message); return secretMisconfiguredResponse(res); }
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Seller access required' });
    }
    req.seller = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Either admin or seller — used by routes both roles can reach (e.g. notifications)
export const protectAny = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  let secret;
  try { secret = getJwtSecret(); } catch (err) { console.error(err.message); return secretMisconfiguredResponse(res); }
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role === 'admin') req.admin = decoded;
    else if (decoded.role === 'seller') req.seller = decoded;
    else return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Optional auth — attaches req.admin/req.seller if a valid token is present,
// but never blocks the request.
export const optionalAuth = (req, res, next) => {
  const token = getToken(req);
  if (!token) return next();
  let secret;
  try { secret = getJwtSecret(); } catch { return next(); } // misconfigured server shouldn't break a public route
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role === 'admin') req.admin = decoded;
    else if (decoded.role === 'seller') req.seller = decoded;
  } catch {
    /* invalid/expired token on an optional route — just proceed unauthenticated */
  }
  next();
};

export { getJwtSecret as JWT_SECRET_GETTER };
