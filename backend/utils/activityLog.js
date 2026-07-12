import ActivityLog from '../models/ActivityLog.js';

/**
 * Fire-and-forget activity logger. Never throws and never awaited by
 * callers in the hot path of a request — logging a "view" event should
 * never be able to slow down or break the page load that triggered it.
 */
export const logActivity = async ({ type, seller = null, product = null, meta = {}, ip = null }) => {
  try {
   await ActivityLog.create({ type, seller, product, meta, ip });
  } catch (err) {
    console.error('Activity log write failed:', err.message);
  }
};
