import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api } from '../api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      hasHydrated: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const user = await api.auth.login(email, password);
          set({ user, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const user = await api.auth.register(name, email, password);
          set({ user, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => set({ user: null }),

      refreshUser: async () => {
        if (!get().user) return;
        const user = await api.auth.me();
        set({ user });
      },

      requestPasswordReset: async (email) => {
        set({ isLoading: true });
        try {
          await api.auth.requestPasswordReset(email);
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      resetPassword: async (email, code, newPassword) => {
        set({ isLoading: true });
        try {
          await api.auth.resetPassword(email, code, newPassword);
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'stockgod-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
