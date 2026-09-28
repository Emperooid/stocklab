export type AuthStackParamList = {
  Intro: undefined;
  Welcome: undefined;
  Login: { infoMessage?: string; prefillPhone?: string } | undefined;
  Register: undefined;
  ForgotPassword: { prefillPhone?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Rounds: undefined;
  Predict: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type LegalDoc = 'privacy' | 'terms' | 'responsible';

export type MainStackParamList = {
  MainTabs: undefined;
  Withdrawal: undefined;
  News: undefined;
  Invite: undefined;
  MyBids: undefined;
  Winners: undefined;
  Legal: { doc: LegalDoc };
};
