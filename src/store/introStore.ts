import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IntroState {
  /** Whether the pre-login slider has been finished or skipped. */
  hasSeenIntro: boolean;
  completeIntro: () => void;
}

/**
 * The three-slide introduction shown before sign-in. Persisted so it appears
 * once per install — someone who has already seen it, or is signing back in,
 * goes straight to the login screen.
 */
export const useIntroStore = create<IntroState>()(
  persist(
    (set) => ({
      hasSeenIntro: false,
      completeIntro: () => set({ hasSeenIntro: true }),
    }),
    {
      name: 'crowdstock-intro',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasSeenIntro: state.hasSeenIntro }),
    }
  )
);
