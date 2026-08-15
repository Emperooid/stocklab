import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DailyRound } from '../types';
import { timeOnDate } from './schedule';

const CHANNEL_ID = 'stockgod-rounds';

// expo-notifications has incomplete web support, and several of its APIs
// (including setNotificationHandler itself) can throw there. Round
// reminders are a mobile-only feature, so nothing in this module should
// touch the native module at all when running on web.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Round reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Cancels any previously scheduled round reminders and schedules fresh ones
 * for today's remaining open/settle times. Safe to call repeatedly (e.g. on
 * every app foreground) — it always starts from a clean slate.
 */
export async function scheduleTodaysRoundNotifications(rounds: DailyRound[]) {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await ensureNotificationChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (const round of rounds) {
    const openAt = timeOnDate(round.slot.submitTime, now);
    const settleAt = timeOnDate(round.slot.settleTime, now);

    if (openAt.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Round ${round.slot.index} is open`,
          body: `Submit your prediction (1-5) before ${round.slot.settleTime}.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: openAt, channelId: CHANNEL_ID },
      });
    }

    if (settleAt.getTime() > now.getTime() && round.prediction) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Round ${round.slot.index} has settled`,
          body: 'Check the Rounds tab to see your result.',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: settleAt, channelId: CHANNEL_ID },
      });
    }
  }
}
