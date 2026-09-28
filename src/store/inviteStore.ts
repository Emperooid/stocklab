import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InviteStats } from '../types';
import { api } from '../api';

export interface InvitedContact {
  name: string;
  invitedAt: string;
  joined: boolean;
}

interface InviteState {
  stats: InviteStats | null;
  statsLoading: boolean;
  fetchStats: () => Promise<void>;
  // No endpoint exists for "list of people I invited" — B1 only logs one
  // invite at a time and B3 only returns aggregate counts, not names. This
  // reconstructs a "who did I invite, did they join" view purely from what
  // this device has invited itself (via recordInvite) plus re-checking each
  // one's current registration status (B2) — it won't show invites sent
  // from a different device/session, which is an inherent limitation of
  // having no real backend list for this, not a bug in this tracking.
  invitedContacts: Record<string, InvitedContact>;
  recordInvite: (phone: string, name: string) => void;
  /** Re-checks B2 for every not-yet-joined invited contact — call on Invite screen focus. */
  refreshInvitedStatuses: () => Promise<void>;
  /**
   * Clears `stats`/`invitedContacts`. The latter is persisted but not keyed
   * by phone/account — a second account on the same device would otherwise
   * inherit the first account's "who I invited" list. Called from
   * authStore.logout().
   */
  reset: () => void;
}

export const useInviteStore = create<InviteState>()(
  persist(
    (set, get) => ({
      stats: null,
      statsLoading: false,
      invitedContacts: {},

      fetchStats: async () => {
        set({ statsLoading: true });
        try {
          const stats = await api.invite.getStats();
          set({ stats, statsLoading: false });
        } catch (e) {
          set({ statsLoading: false });
          throw e;
        }
      },

      recordInvite: (phone, name) =>
        set((state) => ({
          invitedContacts: {
            ...state.invitedContacts,
            [phone]: state.invitedContacts[phone] ?? { name, invitedAt: new Date().toISOString(), joined: false },
          },
        })),

      refreshInvitedStatuses: async () => {
        const pending = Object.entries(get().invitedContacts).filter(([, c]) => !c.joined);
        if (pending.length === 0) return;
        const results = await Promise.all(
          pending.map(([phone]) => api.invite.isRegistered(phone).catch(() => false))
        );
        set((state) => {
          const invitedContacts = { ...state.invitedContacts };
          pending.forEach(([phone], i) => {
            if (results[i]) invitedContacts[phone] = { ...invitedContacts[phone], joined: true };
          });
          return { invitedContacts };
        });
      },

      reset: () => set({ stats: null, statsLoading: false, invitedContacts: {} }),
    }),
    {
      name: 'crowdstock-invite',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ invitedContacts: state.invitedContacts }),
    }
  )
);
