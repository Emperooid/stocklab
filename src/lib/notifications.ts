import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DailyRound } from '../types';
import { slotSettleAt, slotSubmitAt } from './schedule';

// Bumped each time the channel's sound/importance changes — Android locks
// those in at creation and never lets an app change them for an existing
// install, so a real sound swap needs a new channel id, not new options on
// the old one. v1 here is a fresh channel identity for the CrowdStock
// rebrand (the prior stocklab-rounds-v3 channel is abandoned, not renamed).
const CHANNEL_ID = 'crowdstock-rounds-v1';

// Base filename only (no path) — must match an entry in app.json's
// expo-notifications plugin `sounds` array (which takes the actual path,
// ./assets/crowdstock_notification.wav) for it to get bundled into the build.
const NOTIFICATION_SOUND = 'crowdstock_notification.wav';

// How long before a round closes to nudge someone who hasn't played it yet.
const CLOSING_SOON_LEAD_MS = 15 * 60 * 1000;

// Local hour (24h) for the "have you played today?" nudge, only sent if
// nothing has been played yet today. If it's already past this hour when
// rounds are (re)synced, we skip it for today rather than firing it late.
const PLAYED_TODAY_REMINDER_HOUR = 20;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Round reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUND,
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

export async function scheduleTodaysRoundNotifications(rounds: DailyRound[]) {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await ensureNotificationChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (const round of rounds) {
    const openAt = slotSubmitAt(round.slot, now);
    const settleAt = slotSettleAt(round.slot, now);
    const hasPlayed = !!round.prediction;

    if (openAt.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Round ${round.slot.index} is open`,
          body: `Submit your prediction (1-5) before ${round.slot.settleTime}.`,
          sound: NOTIFICATION_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: openAt, channelId: CHANNEL_ID },
      });
    }

    const closingSoonAt = new Date(settleAt.getTime() - CLOSING_SOON_LEAD_MS);
    if (!hasPlayed && closingSoonAt.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Round ${round.slot.index} closes soon`,
          body: `You haven't picked a stock yet — submit before ${round.slot.settleTime}.`,
          sound: NOTIFICATION_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: closingSoonAt, channelId: CHANNEL_ID },
      });
    }

    if (hasPlayed && settleAt.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Round ${round.slot.index} has settled`,
          body: 'Check your result in the Rounds tab.',
          sound: NOTIFICATION_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: settleAt, channelId: CHANNEL_ID },
      });
    }
  }

  const playedAnyToday = rounds.some((r) => !!r.prediction);
  if (!playedAnyToday) {
    const reminderAt = new Date(now);
    reminderAt.setHours(PLAYED_TODAY_REMINDER_HOUR, 0, 0, 0);
    if (reminderAt.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Haven't played today?",
          body: "You've got rounds still open today — pick a stock before they close.",
          sound: NOTIFICATION_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt, channelId: CHANNEL_ID },
      });
    }
  }
}
