import cache from './cache.js';

/**
 * Returns true if the token system is enabled (default), false if admin disabled it.
 * Reads from Redis/memory cache — no DB call needed.
 */
export const isTokenRequired = async () => {
  const val = await cache.get('admin:token_required');
  return val === null ? true : val; // default: tokens required
};
