import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('accessToken', res.accessToken);
      await SecureStore.setItemAsync('refreshToken', res.refreshToken);
      set({ user: res.user, accessToken: res.accessToken, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      try {
        const user = await api.get('/users/me');
        set({ user, accessToken: token, isAuthenticated: true });
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
      }
    }
  },
}));
