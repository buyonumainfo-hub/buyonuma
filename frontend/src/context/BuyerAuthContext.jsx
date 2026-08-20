import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const BuyerAuthContext = createContext(null);

// Mirrors SellerAuthContext's shape/bug-fixes (stable useCallback
// references, only a genuine 401 clears the token) so buyer pages behave
// consistently with seller pages.
export const BuyerAuthProvider = ({ children }) => {
  const [buyer, setBuyer] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  // True only for a genuine failure to verify (network error, backend
  // down, rate limited, timeout) — NOT for "no token stored" and NOT for
  // a confirmed-invalid token. See BUG FIX note below.
  const [authError, setAuthError] = useState(false);

  const verify = useCallback(() => {
    const token = localStorage.getItem('lens_buyer_token');
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setAuthError(false);
    api.get('/buyer-auth/verify', { authRole: 'buyer' })
      .then(res => { setBuyer(res.data.buyer); setIsAuthenticated(true); })
      .catch((err) => {
        // BUG FIX: this used to remove the buyer's token — logging them
        // out — on ANY failure here (network blip, backend 500, rate
        // limit), not just a confirmed-invalid token. Combined with
        // BuyerProtected's redirect-to-login on `!isAuthenticated`, a
        // buyer with a perfectly valid session could get silently kicked
        // to the login screen just because their connection hiccuped at
        // the exact moment the app loaded. Only treat this as "logged
        // out" on a genuine 401; everything else keeps the token and
        // surfaces a retryable error instead (mirrors SellerAuthContext).
        if (err.response?.status === 401) {
          localStorage.removeItem('lens_buyer_token');
          setIsAuthenticated(false);
        } else {
          setAuthError(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/buyer-auth/login', { email, password }, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    setAuthError(false);
    return res.data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await api.post('/buyer-auth/google', { credential }, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    setAuthError(false);
    return res.data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/buyer-auth/register', data, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    setAuthError(false);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lens_buyer_token');
    setBuyer(null);
    setIsAuthenticated(false);
    setAuthError(false);
  }, []);

  const refreshBuyer = useCallback(async () => {
    const token = localStorage.getItem('lens_buyer_token');
    if (!token) return null;
    const res = await api.get('/buyer-auth/verify', { authRole: 'buyer' });
    setBuyer(res.data.buyer);
    return res.data.buyer;
  }, []);

  return (
    <BuyerAuthContext.Provider value={{ buyer, isAuthenticated, loading, authError, retryAuth: verify, login, loginWithGoogle, register, logout, refreshBuyer }}>
      {children}
    </BuyerAuthContext.Provider>
  );
};

export const useBuyerAuth = () => useContext(BuyerAuthContext);
