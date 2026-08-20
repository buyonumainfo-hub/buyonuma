import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AffiliateAuthContext = createContext(null);

// Mirrors BuyerAuthContext/SellerAuthContext's shape (stable useCallback
// references, only a genuine 401 clears the token) so affiliate pages
// behave consistently with the rest of the app.
export const AffiliateAuthProvider = ({ children }) => {
  const [affiliate, setAffiliate] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const verify = useCallback(() => {
    const token = localStorage.getItem('lens_affiliate_token');
    if (!token) { setLoading(false); return; }
    setLoading(true);
    api.get('/affiliate-auth/verify', { authRole: 'affiliate' })
      .then(res => { setAffiliate(res.data.affiliate); setIsAuthenticated(true); })
      .catch(() => { localStorage.removeItem('lens_affiliate_token'); setIsAuthenticated(false); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/affiliate-auth/login', { email, password }, { authRole: 'affiliate' });
    localStorage.setItem('lens_affiliate_token', res.data.token);
    setAffiliate(res.data.affiliate);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/affiliate-auth/register', data, { authRole: 'affiliate' });
    localStorage.setItem('lens_affiliate_token', res.data.token);
    setAffiliate(res.data.affiliate);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lens_affiliate_token');
    setAffiliate(null);
    setIsAuthenticated(false);
  }, []);

  const refreshAffiliate = useCallback(async () => {
    const token = localStorage.getItem('lens_affiliate_token');
    if (!token) return null;
    const res = await api.get('/affiliate-auth/verify', { authRole: 'affiliate' });
    setAffiliate(res.data.affiliate);
    return res.data.affiliate;
  }, []);

  return (
    <AffiliateAuthContext.Provider
      value={{ affiliate, isAuthenticated, loading, login, register, logout, refreshAffiliate }}
    >
      {children}
    </AffiliateAuthContext.Provider>
  );
};

export const useAffiliateAuth = () => useContext(AffiliateAuthContext);
