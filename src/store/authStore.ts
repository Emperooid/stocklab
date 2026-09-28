import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api } from '../api';
import { getSession, onSessionInvalidated, setSession, Session } from '../api/backendClient';
import { useAlertPopupStore } from './alertPopupStore';
import { useWalletStore } from './walletStore';
import { useRoundsStore } from './roundsStore';
import { useAutoPlayStore } from './autoPlayStore';
import { useInviteStore } from './inviteStore';
import { useAuctionStore } from './auctionStore';

/**
 * Thrown by registerComplete when registration itself succeeded but the
 * convenience auto-login right after it failed (e.g. a backend bug). The
 * account is real — this is NOT a registration failure, and callers should
 * not show it as one. See RegisterScreen for how this is handled.
 */
export class RegisteredButLoginFailedError extends Error {}

/**
 * Merges in fields that only ONE of the two profile endpoints ever carries,
 * so calling the other one doesn't wipe them back out:
 *   - email: neither G22 nor G24 echoes it back — it's only ever known
 *     locally, from what the client sent to G11 at registration.
 *   - alertMessage/newsMessage/appStoreUrl/playStoreUrl: CONFIRMED live only
 *     G22 (login) sends these — G24 (used by refreshUser(), called right
 *     after login as a best-effort follow-up, and again on every
 *     Profile/News focus) never includes them at all. Without this, the
 *     G24 follow-up immediately overwrote real values from login back to
 *     undefined — including the Invite screen's WhatsApp download link.
 * Only preserves for the same phone number, so switching accounts on a
 * shared device can't leak one user's data onto another's.
 */
function preserveLoginOnlyFields(prev: User | null, next: User): User {
  if (prev?.phone !== next.phone) return next;
  return {
    ...next,
    email: next.email || prev.email,
    alertMessage: next.alertMessage ?? prev.alertMessage,
    newsMessage: next.newsMessage ?? prev.newsMessage,
    appStoreUrl: next.appStoreUrl ?? prev.appStoreUrl,
    playStoreUrl: next.playStoreUrl ?? prev.playStoreUrl,
  };
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
  // Set by logout() so AuthNavigator can send a just-logged-out user
  // straight to Login instead of its normal initial route (Welcome, once
  // introStore's hasSeenIntro is true) — someone who had an account and just
  // signed out almost always wants to log back into that same account, not
  // re-see the Create-account-or-Login choice screen. Cleared once
  // AuthNavigator reads it, so a later fresh sign-in-then-logout still shows
  // this every time rather than only the first.
  justLoggedOut: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  registerStart: (phone: string) => Promise<void>;
  registerComplete: (phone: string, fullname: string, gender: string, pin: string, otp: string, email: string) => Promise<void>;
  logout: () => void;
  clearJustLoggedOut: () => void;
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
      justLoggedOut: false,

      login: async (phone, pin) => {
        set({ isLoading: true });
        try {
          const user = await api.auth.login(phone, pin);
          set({ user: preserveLoginOnlyFields(get().user, user), session: getSession(), isLoading: false });
          // Only G22 (login) ever carries alert/news — queue a popup here,
          // right where a fresh value can actually exist, not on every
          // refreshUser() (G24 never has these fields at all).
          useAlertPopupStore.getState().checkForUpdates(user);
          // G22's own response may not carry every profile field (SlotAmount
          // confirmed only on G24 so far) — best-effort follow-up so a
          // fresh login has the fixed stake amount without waiting on some
          // other screen to incidentally trigger a refresh first.
          get().refreshUser().catch(() => {});
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
          useAlertPopupStore.getState().checkForUpdates(user);
          get().refreshUser().catch(() => {});
        } catch {
          set({ isLoading: false });
          throw new RegisteredButLoginFailedError(
            'Your account was created, but we could not log you in automatically. Please log in with your new phone number and password.'
          );
        }
      },

      logout: () => {
        setSession(null);
        set({ user: null, session: null, justLoggedOut: true });
        // CONFIRMED live bug this fixes: none of these stores have their
        // own reset, and only roundsStore/inviteStore even persist to
        // AsyncStorage — so a second account logging in on the same app
        // session inherited the first account's balance, transactions,
        // Auto Play config, invite list, and (most visibly) virtualAccount,
        // since DepositModal only re-fetches a deposit account when it's
        // currently null. That showed one account's bank details on
        // another account's Deposit screen.
        useWalletStore.getState().reset();
        useRoundsStore.getState().reset();
        useAutoPlayStore.getState().reset();
        useInviteStore.getState().reset();
        useAuctionStore.getState().reset();
      },

      clearJustLoggedOut: () => set({ justLoggedOut: false }),

      clearSessionExpiredMessage: () => set({ sessionExpiredMessage: null }),

      refreshUser: async () => {
        if (!get().user) return;
        const user = await api.auth.me();
        set({ user: preserveLoginOnlyFields(get().user, user) });
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
      name: 'crowdstock-auth',
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
