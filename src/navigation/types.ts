import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { infoMessage?: string; prefillPhone?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

/** Stock-rounds game space — its own bottom navbar. */
export type MainTabParamList = {
  Home: undefined;
  Rounds: undefined;
  Predict: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/** Card-duel game space — its own, differently designed bottom navbar. */
export type CardsTabParamList = {
  CardsHome: undefined;
  MyCards: undefined;
  Play: undefined;
  Rewards: undefined;
  Profile: undefined;
};

/**
 * Root stack. After login the user lands on GamePicker (no navbar); choosing a
 * game pushes that game's space, which brings its own navbar. Everything else
 * is a pushed detail screen that covers the navbar while you're in it.
 */
export type MainStackParamList = {
  GamePicker: undefined;
  RoundsGame: NavigatorScreenParams<MainTabParamList> | undefined;
  CardsGame: NavigatorScreenParams<CardsTabParamList> | undefined;

  // Stock-rounds details
  RoundHistory: undefined;
  Withdrawal: undefined;
  News: undefined;
  Invite: undefined;

  // Card-duel flow
  SetCard: undefined;
  UnveilCard: { cardId: string };
  CardResult: { cardId: string };
};
