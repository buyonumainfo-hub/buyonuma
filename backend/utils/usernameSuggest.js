import Seller from '../models/Seller.js';

/**
 * When a chosen seller username is taken, suggest a handful of close,
 * still-available alternatives instead of just rejecting the sign-up.
 * Tries, in order: numeric suffixes, a short random suffix, and
 * store-name-derived variants (if given) — checking each against the DB
 * so nothing suggested is actually already registered.
 */
export const suggestUsernames = async (desired, storeName = '', count = 4) => {
  const base = String(desired).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user';
  const candidates = [];

  for (let i = 1; candidates.length < count + 3 && i <= 20; i++) {
    candidates.push(`${base}${i}`);
  }
  candidates.push(`${base}_${Math.floor(100 + Math.random() * 900)}`);
  candidates.push(`${base}_ng`);
  if (storeName) {
    const storeSlug = String(storeName).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    if (storeSlug && storeSlug !== base) candidates.push(storeSlug, `${storeSlug}1`);
  }

  // De-dupe while preserving order
  const unique = [...new Set(candidates)];

  const taken = await Seller.find({ username: { $in: unique } }).select('username').lean();
  const takenSet = new Set(taken.map(s => s.username));

  return unique.filter(u => !takenSet.has(u)).slice(0, count);
};
