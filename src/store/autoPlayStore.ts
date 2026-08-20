import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { getSlotStatus } from '../lib/schedule';
import { DailyRound } from '../types';

interface AutoPlayState {
  enabled: boolean;
  paused: boolean;
  preferredValue: number; // 1-5, submitted automatically each open round
  setEnabled: (enabled: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPreferredValue: (value: number) => void;
}

export const useAutoPlayStore = create<AutoPlayState>()(
  persist(
    (set) => ({
      enabled: false,
      paused: false,
      preferredValue: 3,
      setEnabled: (enabled) => set({ enabled }),
      setPaused: (paused) => set({ paused }),
      setPreferredValue: (preferredValue) => set({ preferredValue }),
    }),
    {
      name: 'stocklab-autoplay',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Called whenever fresh round data comes in. If Auto Play is on (and not
 * paused), submits the preferred value for the current open round the first
 * time it's seen without a prediction. Returns true if it played, so the
 * caller knows to refetch.
 */
export async function maybeAutoPlay(rounds: DailyRound[]): Promise<boolean> {
  const { enabled, paused, preferredValue } = useAutoPlayStore.getState();
  if (!enabled || paused) return false;

  const now = new Date();
  const openRound = rounds.find((r) => getSlotStatus(r.slot, now) === 'open' && !r.prediction);
  if (!openRound) return false;

  await api.rounds.submitPrediction(openRound.slot.id, preferredValue);
  return true;
}
