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
 * Decide whether a request URL belongs to an admin route or a seller
 * route, so we can pick the matching token instead of blindly always
 * preferring one over the other. Shared by both the request interceptor
 * (which token to send) and the response interceptor (which login page
 * to redirect to on a 401), so the two stay consistent.
 */
const isAdminRoute = (url) => Boolean(url && url.includes('/admin'));

api.interceptors.request.use((config) => {
  // Round-robin the base URL across configured servers.
  config.baseURL = nextBaseURL();

  // Pick the token based on which kind of route this is, not a blind
  // "admin always wins" priority — otherwise a browser that's ever
  // logged in as admin keeps sending the admin token to seller routes
  // and gets rejected with "seller access required", even though the
  // person is properly logged in as a seller.
  const adminToken  = localStorage.getItem('lens_admin_token');
  const sellerToken = localStorage.getItem('lens_seller_token');

  const token = isAdminRoute(config.url)
    ? (adminToken || sellerToken)
    : (sellerToken || adminToken);

  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Track which server handled this request, and how many times we've
  // retried it, so the failover logic below knows when to stop.
  config._retryCount = config._retryCount || 0;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;

    // Failover: retry against the next server if this looks like a
    // server-side/network problem (not a normal 4xx the user should see),
    // and we haven't already exhausted all configured servers.
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
      // Backend sends { retryAfter: <seconds>, message } on every rate
      // limiter (see backend/middleware/rateLimiter.js). Show it as a
      // single toast per hit rather than letting each page re-implement
      // this — one toast id per URL so rapid repeated hits (e.g. a user
      // mashing a button) don't stack duplicate toasts.
      const data = err.response.data || {};
      const retryAfter = data.retryAfter;
      const message = data.message || 'Too many requests. Please slow down and try again shortly.';
      const toastId = `rate-limit-${err.config?.url || 'unknown'}`;

      toast.error(message, { id: toastId, duration: retryAfter ? Math.min(retryAfter * 1000, 8000) : 4000 });
    }

    if (err.response?.status === 401) {
      // Redirect based on which kind of route actually rejected us,
      // using the same isAdminRoute check the request interceptor uses
      // to pick the token — so we don't send someone to /admin/login
      // for a 401 that came back from a seller route (or vice versa)
      // just because an admin token happens to also be sitting around.
      if (isAdminRoute(err.config?.url)) {
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