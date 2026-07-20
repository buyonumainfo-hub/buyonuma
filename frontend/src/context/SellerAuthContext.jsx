import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SellerAuthContext = createContext(null);

export const SellerAuthProvider = ({ children }) => {
  const [seller, setSeller]             = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]           = useState(true);
  // True only for a genuine failure to verify (network error, backend
  // down, rate limited, timeout) — NOT for "no token stored" and NOT for
  // a confirmed-invalid token. Lets consuming UI offer a retry instead of
  // treating the seller as logged out.
  const [authError, setAuthError]       = useState(false);

  const verify = useCallback(() => {
    const token = localStorage.getItem('lens_seller_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setAuthError(false);
    // api.js's interceptor attaches the Authorization header automatically
    // and load-balances/fails over across the configured backend servers.
    api.get('/seller-auth/verify')
      .then(res => { setSeller(res.data.seller); setIsAuthenticated(true); })
      .catch((err) => {
        // BUG FIX: this used to remove the seller's token — logging them
        // out — on ANY failure here, including a transient network error,
        // a backend 500, or a rate limit, not just a confirmed-invalid
        // token. Combined with SellerProtected's redirect-to-login on
        // `!isAuthenticated`, that meant a seller with a perfectly valid
        // session could get silently kicked to the login screen just
        // because their connection hiccuped at the exact moment the app
        // loaded — with zero explanation. Only treat this as "logged out"
        // on a genuine 401 (the server explicitly rejected the token);
        // for everything else, keep the token and surface a retryable
        // error instead.
        if (err.response?.status === 401) {
          localStorage.removeItem('lens_seller_token');
        } else {
          setAuthError(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { verify(); }, [verify]);

  // BUG FIX: every one of these was a plain function, redefined with a
  // brand-new reference on every single render of this provider. That's
  // fine for a function only ever called directly from a click handler,
  // but `refreshSeller` is also a dependency of a `useCallback` in
  // SellerProfile.jsx (`loadProfile`), which is itself the dependency of
  // a `useEffect`. The loop that created: refreshSeller() -> setSeller()
  // -> this provider re-renders -> refreshSeller gets a new reference ->
  // loadProfile (depending on it) gets a new reference too -> the effect
  // watching loadProfile fires again -> refreshSeller() again -> forever.
  // That's exactly what produced the repeated GET /seller-auth/verify
  // calls. Wrapping these in useCallback with a stable (empty, or
  // setState-only) dependency array keeps their identity stable across
  // re-renders, so nothing downstream mistakes "the provider re-rendered"
  // for "this function actually changed."
  const login = useCallback(async (username, password) => {
    const res = await api.post('/seller-auth/login', { username, password });
    localStorage.setItem('lens_seller_token', res.data.token);
    setSeller(res.data.seller);
    setIsAuthenticated(true);
    setAuthError(false);
    return res.data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/seller-auth/register', data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lens_seller_token');
    setSeller(null);
    setIsAuthenticated(false);
    setAuthError(false);
  }, []);

  const refreshSeller = useCallback(async () => {
    const token = localStorage.getItem('lens_seller_token');
    if (!token) return null;
    const res = await api.get('/seller-auth/verify');
    setSeller(res.data.seller);
    return res.data.seller; // returned so a caller can use the fresh data immediately, rather than waiting on a re-render + effect to pick up the context update
  }, []);

  return (
    <SellerAuthContext.Provider
      value={{ seller, isAuthenticated, loading, authError, retryAuth: verify, login, register, logout, refreshSeller }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
};

export const useSellerAuth = () => useContext(SellerAuthContext);
