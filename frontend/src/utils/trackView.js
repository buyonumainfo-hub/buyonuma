import api from './api';

/**
 * Fire-and-forget view tracking. Never blocks the UI and never throws —
 * a failed analytics ping should never break the page the user is on.
 *
 * type: 'store_view' | 'whatsapp_click' | 'product_page_view' | 'add_to_cart'
 *
 * DEDUPE: the same event can legitimately fire twice in very quick
 * succession without the user actually doing anything twice — most
 * commonly React 18 StrictMode (dev only) intentionally double-invokes
 * effects (mount → cleanup → mount), which double-fires any trackView()
 * called from a useEffect on mount (store_view, product_page_view). To
 * keep the counts accurate regardless of the cause, we suppress a repeat
 * call for the same (seller, type, product) combination within a short
 * window — this is standard practice for click/view tracking pixels.
 */
const recentlySent = new Map(); // `${sellerId}:${type}:${productId}` -> timestamp
const DEDUPE_WINDOW_MS = 1500;

export const trackView = (sellerId, type, productId = null) => {
  if (!sellerId) return;

  const key = `${sellerId}:${type}:${productId || ''}`;
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) {
    return; // duplicate fired within the dedupe window — skip it
  }
  recentlySent.set(key, now);

  // Opportunistic cleanup so this map never grows unbounded over a long
  // browsing session.
  if (recentlySent.size > 200) {
    for (const [k, t] of recentlySent) {
      if (now - t > DEDUPE_WINDOW_MS) recentlySent.delete(k);
    }
  }

  api.post('/views/track', { sellerId, type, productId: productId })
    .catch(() => { /* silent — analytics should never surface an error to the buyer */ });
};
