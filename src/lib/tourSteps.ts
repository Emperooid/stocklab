import { MainTabParamList } from '../navigation/types';

export interface TourStep {
  /** Must match a <TourTarget id="..."> mounted somewhere on `tab`. */
  id: string;
  tab: keyof MainTabParamList;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'home-balance',
    tab: 'Home',
    title: 'Your balance',
    body: "This card shows your wallet balance and today's profit at a glance.",
  },
  {
    id: 'home-bell',
    tab: 'Home',
    title: 'News & alerts',
    body: 'Tap here anytime to see the latest news and alerts on your account.',
  },
  {
    id: 'rounds-list',
    tab: 'Rounds',
    title: "Today's rounds",
    body: "Every round for today lives here — see what's open, settled, or still waiting on a result.",
  },
  {
    id: 'predict-autoplay',
    tab: 'Predict',
    title: 'Auto Play',
    body: 'Turn this on and the server plays every round for you automatically — even while the app is closed.',
  },
  {
    id: 'predict-rounds',
    tab: 'Predict',
    title: 'Pick a stock',
    body: 'Pick a number 1-5 for any round still open today. The closer your pick is to the average when it settles, the bigger the gain.',
  },
  {
    id: 'wallet-actions',
    tab: 'Wallet',
    title: 'Deposit & withdraw',
    body: 'Add funds or request a withdrawal here — your full transaction history is right below.',
  },
  {
    id: 'profile-support',
    tab: 'Profile',
    title: 'Need help?',
    body: 'Reach out to us directly from here anytime you have a question.',
  },
];
