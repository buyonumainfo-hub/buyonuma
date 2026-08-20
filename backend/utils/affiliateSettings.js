import AffiliateSettings from '../models/AffiliateSettings.js';

// ── Admin-editable affiliate settings cache ─────────────────────────────
//
// Same pattern as utils/plans.js: the DB (a single AffiliateSettings row)
// is the source of truth, but request handlers that need the current
// commission percentage read from this small in-memory cache instead of
// hitting Mongo every time. Reloaded at server startup and immediately
// after any admin write (see routes/adminAffiliates.js PUT /settings).
let cache = { commissionPercent: 10, whatsappNumber: '', creditAdminPlanChanges: true };

/** Reloads the in-memory cache from the database. Call after any admin
 *  write to AffiliateSettings, and once at server startup. */
export const loadAffiliateSettingsCache = async () => {
  const doc = await AffiliateSettings.findOne();
  if (doc) {
    cache = {
      commissionPercent: doc.commissionPercent,
      whatsappNumber: doc.whatsappNumber,
      creditAdminPlanChanges: doc.creditAdminPlanChanges,
    };
  }
  return cache;
};

/** Creates the single settings row the app needs, but ONLY if none
 *  exists yet — never overwrites an admin's existing configuration. */
export const seedAffiliateSettingsIfEmpty = async () => {
  const count = await AffiliateSettings.countDocuments();
  if (count > 0) return;
  await AffiliateSettings.create({ commissionPercent: 10, whatsappNumber: '', creditAdminPlanChanges: true });
};

/** Synchronous read of the current cache. */
export const getAffiliateSettings = () => cache;
