import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_STEPS } from '../lib/tourSteps';

interface TourState {
  hasCompletedTour: boolean;
  /** null = not running. Only this and hasCompletedTour matter to callers — TourOverlay owns the rest. */
  activeStepIndex: number | null;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      hasCompletedTour: false,
      activeStepIndex: null,

      startTour: () => set({ activeStepIndex: 0 }),

      nextStep: () => {
        const next = (get().activeStepIndex ?? 0) + 1;
        if (next >= TOUR_STEPS.length) {
          set({ activeStepIndex: null, hasCompletedTour: true });
        } else {
          set({ activeStepIndex: next });
        }
      },

      skipTour: () => set({ activeStepIndex: null, hasCompletedTour: true }),
    }),
    {
      name: 'stocklab-tour',
      storage: createJSONStorage(() => AsyncStorage),
      // activeStepIndex is deliberately NOT persisted — a mid-tour app
      // restart shouldn't resume on some arbitrary screen; only whether the
      // tour has ever been completed/skipped needs to survive a restart.
      partialize: (state) => ({ hasCompletedTour: state.hasCompletedTour }),
    }
  )
);
