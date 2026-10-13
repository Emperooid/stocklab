import { create } from 'zustand';

interface IntroState {
  /** Whether the opening slider has been finished or skipped this launch. */
  hasSeenIntro: boolean;
  completeIntro: () => void;
}

/**
 * The opening slider.
 *
 * Deliberately NOT persisted: it is a splash, so it belongs on every launch,
 * before login or the games. Persisting it meant it showed once per install and
 * then never again — which is why reloading the app showed nothing. It resets
 * on each cold start, and only for the session once dismissed.
 */
export const useIntroStore = create<IntroState>((set) => ({
  hasSeenIntro: false,
  completeIntro: () => set({ hasSeenIntro: true }),
}));
