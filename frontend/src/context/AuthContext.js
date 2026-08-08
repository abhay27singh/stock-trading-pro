import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The JWT now lives in an httpOnly cookie (not readable here). We keep only a
    // non-sensitive copy of the user profile for UI continuity across refreshes;
    // the cookie is the real credential. If it has expired, the next API call
    // returns 401 and the caller can log out.
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    const userData = { ...response.data };
    delete userData.token; // token is null now (it lives in the httpOnly cookie)
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await authService.register({ name, email, password });
    const userData = { ...response.data };
    delete userData.token; // token is null now (it lives in the httpOnly cookie)
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return response.data;
  };

  const isAdmin = user?.role === 'ADMIN';

  const logout = async () => {
    try {
      await authService.logout(); // clears the httpOnly cookie server-side
    } catch (e) {
      // ignore — clear local state regardless
    }
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
