// Cookie-based "for you" recommendations for anonymous + logged-in
// buyers alike. No account required: every product view increments a
// small JSON blob of { category: viewCount } stored in a first-party
// cookie on the buyer's browser (see routes/products.js `POST /:id/view`
// and `GET /recommended`). We deliberately keep this to category counts
// only — no individual product IDs, no cross-site tracking, nothing
// sent to a third party — just enough to bias "products you might like"
// toward categories the visitor has actually shown interest in.
const COOKIE_NAME = 'buyonuma_interests';
const MAX_CATEGORIES = 8;

export const readInterestCookie = (req) => {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
};

export const bumpInterestCookie = (req, res, category) => {
  if (!category) return;
  const interests = readInterestCookie(req);
  interests[category] = (interests[category] || 0) + 1;

  // Keep only the top MAX_CATEGORIES to prevent unbounded cookie growth.
  const trimmed = Object.fromEntries(
    Object.entries(interests).sort((a, b) => b[1] - a[1]).slice(0, MAX_CATEGORIES)
  );

  res.cookie(COOKIE_NAME, JSON.stringify(trimmed), {
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
    httpOnly: false, // frontend doesn't need to read it directly, but keeping it non-httpOnly avoids surprises if it ever does; it holds no sensitive data
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

/** Returns categories sorted by interest, most-viewed first. */
export const topInterestCategories = (req) => {
  const interests = readInterestCookie(req);
  return Object.entries(interests).sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
};

export { COOKIE_NAME };
