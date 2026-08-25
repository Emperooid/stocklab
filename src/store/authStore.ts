import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api } from '../api';
import { getSession, onSessionInvalidated, setSession, Session } from '../api/backendClient';

/**
 * Thrown by registerComplete when registration itself succeeded but the
 * convenience auto-login right after it failed (e.g. a backend bug). The
 * account is real — this is NOT a registration failure, and callers should
 * not show it as one. See RegisterScreen for how this is handled.
 */
export class RegisteredButLoginFailedError extends Error {}

/**
 * Neither login (G22) nor profile (G24) echoes email back — it's only ever
 * known locally, from what the client itself sent to G11 at registration.
 * Without this, every login/refreshUser() call would silently overwrite
 * `user` with a fresh object that has no email, wiping it out. Keeps the
 * previous email only when it's for the same phone number, so switching
 * accounts on a shared device can't leak one user's email onto another's.
 */
function preserveEmail(prev: User | null, next: User): User {
  if (!next.email && prev?.phone === next.phone && prev?.email) {
    return { ...next, email: prev.email };
  }
  return next;
}

interface AuthState {
  user: User | null;
  // Mirrors backendClient's in-memory session so it survives a JS reload —
  // without this, a reload leaves `user` persisted (so the UI still shows
  // the dashboard) while backendClient's session is wiped (in-memory only),
  // and every protected call silently fails until the user logs out and
  // back in. See onRehydrateStorage below, which restores it into
  // backendClient before the app is allowed to render past the splash.
  session: Session | null;
  isLoading: boolean;
  hasHydrated: boolean;
  // Set when the server invalidates the login session out from under a
  // still-working device/token pairing (see onSessionInvalidated below) —
  // shown once on the Login screen so a forced logout doesn't look like the
  // app just randomly signed the user out with no explanation.
  sessionExpiredMessage: string | null;
  login: (phone: string, pin: string) => Promise<void>;
  registerStart: (phone: string) => Promise<void>;
  registerComplete: (phone: string, fullname: string, gender: string, pin: string, otp: string, email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  requestPasswordReset: (phone: string) => Promise<void>;
  resetPassword: (phone: string, code: string, newPin: string) => Promise<void>;
  setHasHydrated: (value: boolean) => void;
  clearSessionExpiredMessage: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      hasHydrated: false,
      sessionExpiredMessage: null,

      login: async (phone, pin) => {
        set({ isLoading: true });
        try {
          const user = await api.auth.login(phone, pin);
          set({ user: preserveEmail(get().user, user), session: getSession(), isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      registerStart: async (phone) => {
        set({ isLoading: true });
        try {
          await api.auth.registerStart(phone);
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      /**
       * Registration itself doesn't establish a session (G11 has no token
       * in its response), so this chains an immediate login right after —
       * that's what actually "signs the user into the dashboard".
       *
       * The two steps are handled separately on purpose: if registration
       * fails, that's a real failure — surface it as-is. If registration
       * succeeds but the auto-login fails, the account was still created
       * successfully; throwing the raw login error here would make a
       * successful registration look like a failure and invite the user to
       * "try again", which would just hit "already registered" on retry.
       */
      registerComplete: async (phone, fullname, gender, pin, otp, email) => {
        set({ isLoading: true });
        let registeredEmail: string;
        try {
          const registered = await api.auth.registerComplete(phone, fullname, gender, pin, otp, email);
          registeredEmail = registered.email ?? email;
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }

        try {
          const user = await api.auth.login(phone, pin);
          set({ user: { ...user, email: registeredEmail }, session: getSession(), isLoading: false });
        } catch {
          set({ isLoading: false });
          throw new RegisteredButLoginFailedError(
            'Your account was created, but we could not log you in automatically. Please log in with your new phone number and password.'
          );
        }
      },

      logout: () => {
        setSession(null);
        set({ user: null, session: null });
      },

      clearSessionExpiredMessage: () => set({ sessionExpiredMessage: null }),

      refreshUser: async () => {
        if (!get().user) return;
        const user = await api.auth.me();
        set({ user: preserveEmail(get().user, user) });
      },

      requestPasswordReset: async (phone) => {
        set({ isLoading: true });
        try {
          await api.auth.requestPasswordReset(phone);
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      resetPassword: async (phone, code, newPin) => {
        set({ isLoading: true });
        try {
          await api.auth.resetPassword(phone, code, newPin);
          set({ isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'stocklab-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, session: state.session }),
      onRehydrateStorage: () => (state) => {
        setSession(state?.session ?? null);
        state?.setHasHydrated(true);
      },
    }
  )
);

onSessionInvalidated(() => {
  useAuthStore.getState().logout();
  useAuthStore.setState({ sessionExpiredMessage: 'Your session expired. Please log in again.' });
});
