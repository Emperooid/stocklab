import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission, scheduleTodaysRoundNotifications } from '../lib/notifications';
import { DailyRound } from '../types';

interface SettingsState {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean, rounds?: DailyRound[]) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,

      setNotificationsEnabled: async (enabled, rounds = []) => {
        if (!enabled) {
          if (Platform.OS !== 'web') {
            await Notifications.cancelAllScheduledNotificationsAsync();
          }
          set({ notificationsEnabled: false });
          return true;
        }

        const granted = await requestNotificationPermission();
        if (!granted) {
          set({ notificationsEnabled: false });
          return false;
        }

        await scheduleTodaysRoundNotifications(rounds);
        set({ notificationsEnabled: true });
        return true;
      },
    }),
    {
      name: 'crowdstock-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Called whenever fresh round data comes in; re-syncs reminders if the user has them on. */
export function syncNotificationsForRounds(rounds: DailyRound[]) {
  if (useSettingsStore.getState().notificationsEnabled) {
    scheduleTodaysRoundNotifications(rounds).catch(() => {});
  }
}
