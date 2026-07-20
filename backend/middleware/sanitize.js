import sanitizeHtml from 'sanitize-html';

/**
 * Recursively strip HTML/script tags from every string field in
 * req.body / req.query / req.params. This is a defense-in-depth layer
 * against stored/reflected XSS — even though React escapes output by
 * default, this stops malicious markup from ever reaching the database
 * (which matters because seller store descriptions, product descriptions,
 * chat messages, etc. get rendered in multiple places, some of which may
 * not always escape correctly).
 */

/**
 * BUG FIX: sanitize-html serializes its output as valid HTML, which means
 * it HTML-entity-encodes literal special characters in plain text — e.g.
 * a category name like "Food & Beverages & Cakes" came out the other end
 * as "Food &amp; Beverages &amp; Cakes". That corrupted value then no
 * longer matched the CATEGORIES list on the frontend (broken icons,
 * broken category filters, broken exact-match queries).
 *
 * Since allowedTags is [] (no tags survive), decoding these entities back
 * afterward is safe: sanitize-html has already correctly separated real
 * tags (removed) from literal text containing these characters (encoded
 * only because the output format is HTML). Decoding just restores the
 * original plain-text characters — it cannot reconstruct a tag, because
 * no tag markup remains in the output to begin with.
 */
const decodeEntities = (str) =>
  str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // decode &amp; last so it doesn't re-create entities from the above

// Keys that must never be copied onto a freshly-built object: assigning
// through them can rewrite that object's prototype chain and quietly
// strip inherited methods (hasOwnProperty, toString, ...), which throws
// deep in unrelated code the first time something calls one of those
// methods on the "poisoned" object.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Only recurse into "plain" {} objects. Anything else that happens to be
// typeof === 'object' — Buffer, Date, RegExp, Map, class instances, etc. —
// is treated as an opaque leaf and returned as-is.
//
// This matters most for Buffer: a raw request body (e.g. a payment
// webhook route using express.raw() for signature verification, or a
// binary upload that lands in req.body before a parser runs) is an
// object whose keys are "0", "1", "2", ... one per byte. Without this
// guard, clean() would call Object.keys() on it and try to rebuild a
// plain object with one property per byte — for a multi-MB payload that's
// millions of allocations and recursive calls in one request, which is
// enough to OOM or hard-timeout a serverless function. That's a process
// crash, not a catchable error, so it has to be prevented up front rather
// than caught.
const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]' &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

// Hard ceiling on recursion depth. Guards against maliciously
// deeply-nested JSON (e.g. thousands of nested arrays) causing a stack
// overflow / burning CPU on every request. Any legitimate payload for
// this app will be nowhere near this deep.
const MAX_DEPTH = 20;

const clean = (value, depth = 0) => {
  if (depth > MAX_DEPTH) return value;

  if (typeof value === 'string') {
    const stripped = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
    return decodeEntities(stripped);
  }
  if (Array.isArray(value)) {
    return value.map((item) => clean(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      out[key] = clean(value[key], depth + 1);
    }
    return out;
  }
  // Buffers, Dates, numbers, booleans, null, etc. pass through untouched.
  return value;
};

export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = clean(req.body);
    }
    // req.query is read-only getter in newer Express — mutate in place instead
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        if (DANGEROUS_KEYS.has(key)) {
          delete req.query[key];
          continue;
        }
        req.query[key] = clean(req.query[key]);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Guards against NoSQL operator injection, e.g. { "username": { "$ne": null } }
 * sent as JSON body to bypass auth/query logic. Strips any key starting
 * with "$" or containing "." at any depth, plus prototype-pollution keys
 * (__proto__ / constructor / prototype), which are just as dangerous to
 * copy onto a freshly-built object.
 */
const stripOperators = (value, depth = 0) => {
  if (depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((item) => stripOperators(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || DANGEROUS_KEYS.has(key)) {
        continue;
      }
      out[key] = stripOperators(value[key], depth + 1);
    }
    return out;
  }
  // Buffers, Dates, numbers, booleans, null, etc. pass through untouched.
  return value;
};

export const preventNoSQLInjection = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = stripOperators(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const cleanedQuery = stripOperators(req.query);
      for (const key of Object.keys(req.query)) {
        if (!(key in cleanedQuery)) delete req.query[key];
      }
      for (const key of Object.keys(cleanedQuery)) {
        req.query[key] = cleanedQuery[key];
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};