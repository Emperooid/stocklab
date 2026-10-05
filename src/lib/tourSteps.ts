import { IllustrationName, IconName } from '../theme/icons';

export interface TourStep {
  /** Picture icon shown in the step's bubble. */
  icon: IconName;
  /** Accent colour for the bubble. */
  color: string;
  title: string;
  body: string;
  illustration?: IllustrationName;
}

export const TOUR_STEPS: TourStep[] = [
  {
    icon: 'wallet',
    color: '#FF6B2C',
    title: 'Your balance',
    body: "Your wallet balance and today's profit are always right there on the Home tab.",
    illustration: 'hero',
  },
  {
    icon: 'bell',
    color: '#FFB020',
    title: 'News & alerts',
    body: 'Tap the bell on Home anytime to see the latest news and alerts on your account.',
  },
  {
    icon: 'calendar',
    color: '#2E9BFF',
    title: "Today's rounds",
    body: "Every round for today lives on the Rounds tab — see what's open, settled, or still waiting on a result.",
  },
  {
    icon: 'stock',
    color: '#00B39B',
    title: 'Pick a stock',
    body: 'Pick a number 1-5 for any round still open today. The closer your pick is to the average when it settles, the bigger the gain.',
  },
  {
    icon: 'bolt',
    color: '#A855F7',
    title: 'Auto Play',
    body: "Set a figure and flip on Auto Play in a round's corner to have it submit for you automatically, right before that round closes — just keep the app open so it can fire.",
  },
  {
    icon: 'swap',
    color: '#FF4D8D',
    title: 'Deposit & withdraw',
    body: 'Add funds or request a withdrawal from the Wallet tab — your full transaction history is right below.',
  },
  {
    icon: 'gift',
    color: '#12A150',
    title: 'Invite & earn',
    body: 'Invite friends from your contacts and earn reward credits when they join and play.',
  },
  {
    icon: 'help',
    color: '#6D4AFF',
    title: 'Need help?',
    body: 'Reach out to us directly from your Profile tab anytime you have a question.',
  },
];
