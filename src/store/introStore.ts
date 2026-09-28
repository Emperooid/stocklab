import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tracks whether this device has ever seen the pre-login "what is
 * CrowdStock" intro slides — separate from tourStore's hasCompletedTour,
 * which is a *post-login* feature walkthrough shown once per account. This
 * one is per-device and shown before the person even has an account, so a
 * different phone signing in later on the same device correctly skips it.
 */
interface IntroState {
  hasSeenIntro: boolean;
  hasHydrated: boolean;
  completeIntro: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useIntroStore = create<IntroState>()(
  persist(
    (set) => ({
      hasSeenIntro: false,
      hasHydrated: false,
      completeIntro: () => set({ hasSeenIntro: true }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'crowdstock-intro',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
