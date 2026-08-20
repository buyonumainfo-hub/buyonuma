import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  // null = unrestricted (super admin / legacy account with no role).
  // An array = exactly what that role grants — see backend AdminRole.
  const [permissions, setPermissions] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);

  const verify = useCallback(() => {
    const token = localStorage.getItem('lens_admin_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/verify', { authRole: 'admin' })
      .then(res => {
        setIsAuthenticated(true);
        setPermissions(res.data.permissions);
        setIsSuperAdmin(res.data.isSuperAdmin);
      })
      .catch(() => {
        localStorage.removeItem('lens_admin_token');
        setIsAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password }, { authRole: 'admin' });
    localStorage.setItem('lens_admin_token', res.data.token);
    setIsAuthenticated(true);
    verify(); // pick up permissions right away rather than waiting for the next reload
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('lens_admin_token');
    setIsAuthenticated(false);
    setPermissions(null);
    setIsSuperAdmin(true);
  };

  // A super admin (or one with no role at all — legacy accounts) can do
  // everything; otherwise check the explicit permission list.
  const hasPermission = (perm) => isSuperAdmin || (permissions || []).includes(perm);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, permissions, isSuperAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
