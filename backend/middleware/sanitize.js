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

const clean = (value) => {
  if (typeof value === 'string') {
    const stripped = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
    return decodeEntities(stripped);
  }
  if (Array.isArray(value)) {
    return value.map(clean);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = clean(value[key]);
    }
    return out;
  }
  return value;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body);
  }
  // req.query is read-only getter in newer Express — mutate in place instead
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      req.query[key] = clean(req.query[key]);
    }
  }
  next();
};

/**
 * Guards against NoSQL operator injection, e.g. { "username": { "$ne": null } }
 * sent as JSON body to bypass auth/query logic. Strips any key starting
 * with "$" or containing "." at any depth.
 */
const stripOperators = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripOperators);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = stripOperators(value[key]);
    }
    return out;
  }
  return value;
};

export const preventNoSQLInjection = (req, res, next) => {
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
};
