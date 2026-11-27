import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || '');
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync token state changes to localStorage
  const saveAuthSession = useCallback((authData) => {
    if (!authData) return;
    const { accessToken, refreshToken: newRefresh, user: userProfile } = authData;

    setToken(accessToken);
    localStorage.setItem('accessToken', accessToken);

    if (newRefresh) {
      setRefreshToken(newRefresh);
      localStorage.setItem('refreshToken', newRefresh);
    }

    if (userProfile) {
      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));
    }
  }, []);

  const clearAuthSession = useCallback(() => {
    setToken('');
    setRefreshToken('');
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    const syncSession = event => {
      if (event.type === 'storage' && !['accessToken', 'refreshToken', 'user'].includes(event.key)) return;
      setToken(localStorage.getItem('accessToken') || '');
      setRefreshToken(localStorage.getItem('refreshToken') || '');
      try { setUser(JSON.parse(localStorage.getItem('user') || 'null')); }
      catch { setUser(null); }
    };
    window.addEventListener('storage', syncSession);
    window.addEventListener('petcare-auth-updated', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('petcare-auth-updated', syncSession);
    };
  }, []);

  // Validate or fetch fresh profile on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (token) {
        try {
          const profile = await authApi.getProfile(token);
          if (isMounted && profile) {
            setUser(profile);
            localStorage.setItem('user', JSON.stringify(profile));
          }
        } catch (err) {
          // An offline/backend failure must not silently sign the user out.
          if (err.status === 401 || err.status === 403) {
          if (refreshToken) {
            try {
              const rotated = await authApi.refreshToken(refreshToken);
              if (isMounted && rotated) {
                saveAuthSession(rotated);
              }
            } catch (refreshError) {
              if (isMounted && [400, 401, 403, 422, 423].includes(refreshError.status)) clearAuthSession();
            }
          } else {
            if (isMounted) clearAuthSession();
          }
          }
        }
      }
      if (isMounted) setIsInitializing(false);
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [token, refreshToken, saveAuthSession, clearAuthSession]);

  const login = async (credentials) => {
    const authData = await authApi.login(credentials);
    saveAuthSession(authData);
    return authData;
  };

  const register = async (payload) => {
    return authApi.register(payload);
  };

  const verifyRegistration = async (payload) => {
    const authData = await authApi.verifyRegistration(payload);
    saveAuthSession(authData);
    return authData;
  };

  const updateProfile = async (payload) => {
    const profile = await authApi.updateProfile(payload, token);
    setUser(profile);
    localStorage.setItem('user', JSON.stringify(profile));
    return profile;
  };

  const changePassword = async (payload) => {
    const session = await authApi.changePassword(payload, token);
    saveAuthSession(session);
    return session;
  };

  const logout = async (logoutAll = false) => {
    try {
      await authApi.logout({ refreshToken, logoutAll }, token);
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      clearAuthSession();
    }
  };

  const value = {
    user,
    token,
    refreshToken,
    isAuthenticated: Boolean(token && user),
    isInitializing,
    login,
    register,
    verifyRegistration,
    updateProfile,
    changePassword,
    logout,
    saveAuthSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
