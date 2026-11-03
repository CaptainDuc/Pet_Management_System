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
          // If token expired, try refreshing
          if (refreshToken) {
            try {
              const rotated = await authApi.refreshToken(refreshToken);
              if (isMounted && rotated) {
                saveAuthSession(rotated);
              }
            } catch {
              if (isMounted) clearAuthSession();
            }
          } else {
            if (isMounted) clearAuthSession();
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
    const authData = await authApi.register(payload);
    saveAuthSession(authData);
    return authData;
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
