import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IntroState {
  /** Whether the opening slider has been finished or skipped on this device. */
  hasSeenIntro: boolean;
  completeIntro: () => void;
}

/**
 * The opening slider: shown once per install, to signed-out users only.
 *
 * Persisted, because it is orientation, not a splash — after one pass the
 * person knows what the app is, and repeating it costs them three taps on every
 * launch for no new information. Gating on `!user` as well means someone who is
 * already playing never sees it again either: they are well past being
 * introduced to the app.
 *
 * The branded splash screen (components/SplashScreen) is the separate, every-
 * launch piece that covers the gap while the session loads.
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
