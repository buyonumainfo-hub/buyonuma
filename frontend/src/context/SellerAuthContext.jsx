import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const SellerAuthContext = createContext(null);

export const SellerAuthProvider = ({ children }) => {
  const [seller, setSeller]             = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lens_seller_token');
    if (token) {
      // api.js's interceptor attaches the Authorization header automatically
      // and load-balances/fails over across the configured backend servers.
      api.get('/seller-auth/verify')
        .then(res => { setSeller(res.data.seller); setIsAuthenticated(true); })
        .catch(() => { localStorage.removeItem('lens_seller_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/seller-auth/login', { username, password });
    localStorage.setItem('lens_seller_token', res.data.token);
    setSeller(res.data.seller);
    setIsAuthenticated(true);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/seller-auth/register', data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('lens_seller_token');
    setSeller(null);
    setIsAuthenticated(false);
  };

  const refreshSeller = async () => {
    const token = localStorage.getItem('lens_seller_token');
    if (!token) return;
    const res = await api.get('/seller-auth/verify');
    setSeller(res.data.seller);
  };

  return (
    <SellerAuthContext.Provider value={{ seller, isAuthenticated, loading, login, register, logout, refreshSeller }}>
      {children}
    </SellerAuthContext.Provider>
  );
};

export const useSellerAuth = () => useContext(SellerAuthContext);
