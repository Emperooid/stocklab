import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TourState {
  hasCompletedTour: boolean;
  /** Transient — not persisted. The carousel owns its own current-page state internally. */
  isVisible: boolean;
  startTour: () => void;
  completeTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      isVisible: false,

      startTour: () => set({ isVisible: true }),
      completeTour: () => set({ isVisible: false, hasCompletedTour: true }),
    }),
    {
      name: 'crowdstock-tour',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasCompletedTour: state.hasCompletedTour }),
    }
  )
);
