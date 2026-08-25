import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { getErrorMessage, MIN_SLOT_AMOUNT } from '../lib/validation';

export type AutoPlayMode = 'half' | 'full'; // half = 12 rounds/day, full = 24 rounds/day

interface AutoPlayState {
  enabled: boolean;
  mode: AutoPlayMode;
  amountPerSlot: number;
  // Whether G26 (SetProfileAutoPlay) has ever been called successfully —
  // once it has, flipping on/off again can use the lighter G27 (SetAutoPlay)
  // instead of resending mode/amount every time.
  configured: boolean;
  saving: boolean;
  error: string | null;
  setMode: (mode: AutoPlayMode) => void;
  setAmountPerSlot: (amount: number) => void;
  /** Sends mode + amount + on/off together (G26). Use for first setup or when changing mode/amount. */
  configure: (mode: AutoPlayMode, amountPerSlot: number, enabled: boolean) => Promise<void>;
  /** Just flips on/off (G27) if already configured once; otherwise falls back to configure(). */
  setEnabled: (enabled: boolean) => Promise<void>;
  clearError: () => void;
}

/**
 * CONFIRMED with the backend dev: Auto Play runs entirely server-side once
 * configured — the server itself submits every round on the user's behalf
 * (works even with the app closed), with no predfigure/number choice from
 * the client at all; the number is picked automatically the same way the
 * Stock Value is, with no operator involved. This replaced an earlier
 * client-driven version that polled and called G12 in a loop from inside
 * the app — that approach only ever worked while the app was open, and
 * needed increasingly careful guarding against races and duplicate
 * submissions along the way. None of that is needed anymore.
 */
export const useAutoPlayStore = create<AutoPlayState>()(
  persist(
    (set, get) => ({
      enabled: false,
      mode: 'full',
      amountPerSlot: MIN_SLOT_AMOUNT,
      configured: false,
      saving: false,
      error: null,

      setMode: (mode) => set({ mode }),
      setAmountPerSlot: (amountPerSlot) => set({ amountPerSlot }),
      clearError: () => set({ error: null }),

      configure: async (mode, amountPerSlot, enabled) => {
        set({ saving: true, error: null });
        try {
          await api.rounds.setAutoPlayProfile(mode, amountPerSlot, enabled);
          set({ mode, amountPerSlot, enabled, configured: true, saving: false });
        } catch (e) {
          set({ saving: false, error: getErrorMessage(e, 'Could not update Auto Play.') });
          throw e;
        }
      },

      setEnabled: async (enabled) => {
        const { configured, mode, amountPerSlot, configure } = get();
        if (!configured) {
          await configure(mode, amountPerSlot, enabled);
          return;
        }
        set({ saving: true, error: null });
        try {
          await api.rounds.setAutoPlayStatus(enabled);
          set({ enabled, saving: false });
        } catch (e) {
          set({ saving: false, error: getErrorMessage(e, 'Could not update Auto Play.') });
          throw e;
        }
      },
    }),
    {
      name: 'stocklab-autoplay',
      storage: createJSONStorage(() => AsyncStorage),
      // saving/error are per-session, not something to resurrect on next launch
      partialize: (state) => ({
        enabled: state.enabled,
        mode: state.mode,
        amountPerSlot: state.amountPerSlot,
        configured: state.configured,
      }),
    }
  )
);
