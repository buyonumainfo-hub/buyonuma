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

  const verify = useCallback(() => {
    const token = localStorage.getItem('lens_buyer_token');
    if (!token) { setLoading(false); return; }
    setLoading(true);
    api.get('/buyer-auth/verify', { authRole: 'buyer' })
      .then(res => { setBuyer(res.data.buyer); setIsAuthenticated(true); })
      .catch(() => { localStorage.removeItem('lens_buyer_token'); setIsAuthenticated(false); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/buyer-auth/login', { email, password }, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await api.post('/buyer-auth/google', { credential }, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/buyer-auth/register', data, { authRole: 'buyer' });
    localStorage.setItem('lens_buyer_token', res.data.token);
    setBuyer(res.data.buyer);
    setIsAuthenticated(true);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lens_buyer_token');
    setBuyer(null);
    setIsAuthenticated(false);
  }, []);

  const refreshBuyer = useCallback(async () => {
    const token = localStorage.getItem('lens_buyer_token');
    if (!token) return null;
    const res = await api.get('/buyer-auth/verify', { authRole: 'buyer' });
    setBuyer(res.data.buyer);
    return res.data.buyer;
  }, []);

  return (
    <BuyerAuthContext.Provider value={{ buyer, isAuthenticated, loading, login, loginWithGoogle, register, logout, refreshBuyer }}>
      {children}
    </BuyerAuthContext.Provider>
  );
};

export const useBuyerAuth = () => useContext(BuyerAuthContext);
