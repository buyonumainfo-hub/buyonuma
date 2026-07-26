import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Load-balanced API client.
 *
 * Supports up to 3 backend server URLs (VITE_API_URL, VITE_API_URL_2,
 * VITE_API_URL_3) for horizontal scaling / redundancy. Only VITE_API_URL
 * is required — the others are optional extras.
 *
 * Strategy: round-robin across the configured URLs for normal requests
 * (spreads load evenly), with automatic failover — if a request fails due
 * to a network error or 5xx (the server is down/overloaded, not a normal
 * 4xx client error), it's retried once against the next server in the
 * list before giving up. This keeps the app working even if one of the
 * three instances is temporarily unreachable.
 */
const configuredUrls = [
  import.meta.env.VITE_API_URL,
  import.meta.env.VITE_API_URL_2,
  import.meta.env.VITE_API_URL_3,
].filter(Boolean);

// Always have at least one URL, even if only VITE_API_URL is set.
const API_URLS = configuredUrls.length > 0 ? configuredUrls : [import.meta.env.VITE_API_URL];

let rrIndex = 0;
const nextBaseURL = () => {
  const url = API_URLS[rrIndex % API_URLS.length];
  rrIndex += 1;
  return url;
};

const api = axios.create({ baseURL: API_URLS[0] });

/**
 * Fallback heuristic only — used when a request doesn't explicitly say
 * which token it needs via config.authRole. Kept for any call sites that
 * haven't been updated yet, but every call in this codebase should now
 * pass `authRole: 'admin' | 'seller'` explicitly instead of relying on
 * this, because shared routes like /auth/login and /auth/verify don't
 * contain '/admin' or '/seller' in their URL and would otherwise fall
 * through to the wrong token.
 */
const isAdminRoute = (url) => Boolean(url && url.includes('/admin'));

api.interceptors.request.use((config) => {
  // Round-robin the base URL across configured servers.
  config.baseURL = nextBaseURL();

  const adminToken  = localStorage.getItem('lens_admin_token');
  const sellerToken = localStorage.getItem('lens_seller_token');

  // Explicit > inferred: if the caller tells us which token this request
  // needs (config.authRole), trust that completely. This is what fixes
  // shared endpoints like /auth/login and /auth/verify, whose URL gives
  // no clue whether they're being hit from the admin panel or the seller
  // panel — URL sniffing alone silently sent the wrong token whenever
  // both tokens existed in localStorage at once.
  let token;
  if (config.authRole === 'admin') {
    token = adminToken;
  } else if (config.authRole === 'seller') {
    token = sellerToken;
  } else {
    // Legacy fallback for any call site not yet passing authRole.
    token = isAdminRoute(config.url)
      ? (adminToken || sellerToken)
      : (sellerToken || adminToken);
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;

  config._retryCount = config._retryCount || 0;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;

    const isNetworkOrServerError = !err.response || (err.response.status >= 500);
    if (config && isNetworkOrServerError && config._retryCount < API_URLS.length - 1) {
      config._retryCount += 1;
      config.baseURL = nextBaseURL();
      try {
        return await api.request(config);
      } catch (retryErr) {
        err = retryErr;
      }
    }

    if (err.response?.status === 429) {
      const data = err.response.data || {};
      const retryAfter = data.retryAfter;
      const message = data.message || 'Too many requests. Please slow down and try again shortly.';
      const toastId = `rate-limit-${err.config?.url || 'unknown'}`;

      toast.error(message, { id: toastId, duration: retryAfter ? Math.min(retryAfter * 1000, 8000) : 4000 });
    }

    if (err.response?.status === 401) {
      // Use the same explicit authRole the request was sent with, so the
      // redirect matches which login the request actually belonged to —
      // falling back to URL sniffing only if authRole wasn't set.
      const role = err.config?.authRole || (isAdminRoute(err.config?.url) ? 'admin' : 'seller');
      if (role === 'admin') {
        localStorage.removeItem('lens_admin_token');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('lens_seller_token');
        window.location.href = '/seller/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

/**
 * Pulls the retry-after info off a rate-limit (429) error, for pages that
 * want more than a toast — e.g. disabling a submit button and counting
 * down "Try again in 12s" live. Returns null if the error wasn't a 429
 * or didn't include timing info.
 */
export const getRetryAfterSeconds = (err) => {
  if (err?.response?.status !== 429) return null;
  const retryAfter = err.response.data?.retryAfter;
  return typeof retryAfter === 'number' && retryAfter > 0 ? retryAfter : null;
};