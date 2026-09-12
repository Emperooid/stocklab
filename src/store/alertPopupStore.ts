import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface PendingPopup {
  type: 'alert' | 'news';
  message: string;
}

interface AlertPopupState {
  lastSeenAlert: string | null;
  lastSeenNews: string | null;
  pendingPopups: PendingPopup[];
  /**
   * Queues a popup for user.alertMessage/newsMessage if either is non-empty
   * and different from what was last dismissed — only G22 (login) ever
   * supplies these fields (see preserveLoginOnlyFields in authStore), so
   * this only actually finds something new right after a fresh login.
   */
  checkForUpdates: (user: User | null) => void;
  /** Marks the currently-showing popup as seen and advances to the next queued one, if any. */
  dismissCurrent: () => void;
}

export const useAlertPopupStore = create<AlertPopupState>()(
  persist(
    (set, get) => ({
      lastSeenAlert: null,
      lastSeenNews: null,
      pendingPopups: [],

      checkForUpdates: (user) => {
        if (!user) return;
        const { lastSeenAlert, lastSeenNews, pendingPopups } = get();
        const next = [...pendingPopups];

        if (user.alertMessage && user.alertMessage !== lastSeenAlert && !next.some((p) => p.type === 'alert' && p.message === user.alertMessage)) {
          next.push({ type: 'alert', message: user.alertMessage });
        }
        if (user.newsMessage && user.newsMessage !== lastSeenNews && !next.some((p) => p.type === 'news' && p.message === user.newsMessage)) {
          next.push({ type: 'news', message: user.newsMessage });
        }

        if (next.length !== pendingPopups.length) {
          set({ pendingPopups: next });
        }
      },

      dismissCurrent: () => {
        const [current, ...rest] = get().pendingPopups;
        if (!current) return;
        set({
          pendingPopups: rest,
          lastSeenAlert: current.type === 'alert' ? current.message : get().lastSeenAlert,
          lastSeenNews: current.type === 'news' ? current.message : get().lastSeenNews,
        });
      },
    }),
    {
      name: 'crowdstock-alert-popups',
      storage: createJSONStorage(() => AsyncStorage),
      // pendingPopups is deliberately NOT persisted — a queued-but-unseen
      // popup shouldn't survive an app restart mid-session; it'll just get
      // re-queued from user.alertMessage on the next login if still unseen.
      partialize: (state) => ({ lastSeenAlert: state.lastSeenAlert, lastSeenNews: state.lastSeenNews }),
    }
  )
);
