import { Ionicons } from '@expo/vector-icons';

export interface TourStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    icon: 'wallet-outline',
    title: 'Your balance',
    body: "Your wallet balance and today's profit are always right there on the Home tab.",
  },
  {
    icon: 'notifications-outline',
    title: 'News & alerts',
    body: 'Tap the bell on Home anytime to see the latest news and alerts on your account.',
  },
  {
    icon: 'calendar-outline',
    title: "Today's rounds",
    body: "Every round for today lives on the Rounds tab — see what's open, settled, or still waiting on a result.",
  },
  {
    icon: 'stats-chart-outline',
    title: 'Pick a stock',
    body: 'Pick a number 1-5 for any round still open today. The closer your pick is to the average when it settles, the bigger the gain.',
  },
  {
    icon: 'flash-outline',
    title: 'Auto Play',
    body: "Set a figure and flip on Auto Play in a round's corner to have it submit for you automatically, right before that round closes — just keep the app open so it can fire.",
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Deposit & withdraw',
    body: 'Add funds or request a withdrawal from the Wallet tab — your full transaction history is right below.',
  },
  {
    icon: 'people-outline',
    title: 'Invite & earn',
    body: 'Invite friends from your contacts and earn reward credits when they join and play.',
  },
  {
    icon: 'help-circle-outline',
    title: 'Need help?',
    body: 'Reach out to us directly from your Profile tab anytime you have a question.',
  },
];
