export type AuthStackParamList = {
  Login: { infoMessage?: string; prefillPhone?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Rounds: undefined;
  Predict: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  RoundHistory: undefined;
  Withdrawal: undefined;
  News: undefined;
};
