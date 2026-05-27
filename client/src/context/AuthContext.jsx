import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMeApi } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('rm_token');
    if (!token) { setLoading(false); return; }

    try {
      const res = await getMeApi();
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (token, userData) => {
    localStorage.setItem('rm_token', token);
    localStorage.setItem('rm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('rm_token');
    localStorage.removeItem('rm_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'Admin';
  const isProfessor = user?.role === 'Professor';
  const isStudent = user?.role === 'Student';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isProfessor, isStudent, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
