import Plan from '../models/Plan.js';

// ── Admin-editable plan cache ──────────────────────────────────────────
//
// Plans now live in the database (see models/Plan.js) so an admin can
// change pricing/limits or add/remove plans from the dashboard. But
// Seller.js's `productLimit`/`pinLimit` virtuals need to read a plan's
// numbers *synchronously* (Mongoose virtual getters can't be async), so
// we keep a small in-memory cache here — loaded at server startup and
// reloaded immediately after any admin create/update/delete (see
// routes/adminPlans.js) or after a webhook grants a new plan. Worst case
// if a reload is ever missed, the cache is still refreshed at startup and
// consulted through a single shared object, not stale duplicates.
let cache = {}; // { [key]: { label, productLimit, pinLimit, priceNGN, benefits, isActive } }

const FALLBACK_FREE = { label: 'Free', productLimit: 50, pinLimit: 5, priceNGN: 0, benefits: [], isActive: true };

/** Reloads the in-memory plan cache from the database. Call after any
 *  admin write to Plan, and once at server startup. */
export const loadPlansCache = async () => {
  const plans = await Plan.find().sort({ sortOrder: 1, priceNGN: 1 });
  const next = {};
  for (const p of plans) {
    next[p.key] = {
      label: p.label,
      productLimit: p.productLimit,
      pinLimit: p.pinLimit,
      priceNGN: p.priceNGN,
      benefits: p.benefits,
      isActive: p.isActive,
    };
  }
  cache = next;
  return cache;
};

/** Creates the default free/plus/pro plans the app shipped with,
 *  but ONLY if the Plan collection is completely empty — never
 *  overwrites an admin's existing configuration. */
export const seedDefaultPlansIfEmpty = async () => {
  const count = await Plan.countDocuments();
  if (count > 0) return;
  await Plan.insertMany([
    { key: 'free', label: 'Free', productLimit: 50, pinLimit: 5, priceNGN: 0, sortOrder: 0,
      benefits: ['Up to 50 product listings', 'Pin up to 5 products to the top of your store', 'Standard support'] },
    { key: 'plus', label: 'Plus', productLimit: 150, pinLimit: 10, priceNGN: 5000, sortOrder: 1,
      benefits: ['Up to 150 product listings', 'Pin up to 10 products to the top of your store', 'Priority support'] },
    { key: 'pro', label: 'Pro', productLimit: 500, pinLimit: 20, priceNGN: 15000, sortOrder: 2,
      benefits: ['Up to 500 product listings', 'Pin up to 20 products to the top of your store', 'Priority support', 'Best for high-volume stores'] },
  ]);
  await loadPlansCache();
};

/** Synchronous read of the current cache — used by Seller.js virtuals. */
export const getPlansCache = () => cache;

/** Synchronous single-plan lookup, falling back to a bare-minimum "free"
 *  shape if the requested key doesn't exist (e.g. a plan was deleted out
 *  from under an old seller record) so nothing ever crashes on a missing
 *  plan — it just behaves like the free tier. */
export const getPlan = (planKey) => cache[planKey] || cache.free || FALLBACK_FREE;
