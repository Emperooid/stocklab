export type RoundStatus = 'upcoming' | 'open' | 'awaiting_result' | 'settled';

export interface RoundSlot {
  id: string;
  index: number; // 0-23, matches the hour directly (e.g. 13 = the 1pm round) — this is the value sent to G12 as `slot`
  submitTime: string; // "09:00"
  settleTime: string; // "10:00"
}

export interface UserPrediction {
  roundId: string;
  value: number; // 1-5
  submittedAt: string;
}

export interface RoundResult {
  roundId: string;
  // CONFIRMED live: G13/G14's `StockValue` isn't a 1-5 "drawn value" — it
  // exactly equals CurrentBalance in every real settled record captured
  // (and was wildly out of range, 97979, in an earlier one). There's no
  // server-drawn stock value at all — scoring is based on `Average` (the
  // mean prediction across all players for that round) instead, so that's
  // what the app now shows and measures distance against.
  average?: number;
  /** 0-1 fraction from G13/G14's `Closeness` — how near the prediction was to `average`, when present. */
  closeness?: number;
  userPrediction?: number;
  distance?: number;
  points?: number;
  changePercent?: number;
  valueGained?: number;
  balanceAfter?: number;
  /** From G13/G14's FinalGorL ('G'/'L') — the server's own gain/loss verdict, when present. */
  finalOutcome?: 'gain' | 'loss';
}

export interface DailyRound {
  slot: RoundSlot;
  status: RoundStatus;
  prediction?: UserPrediction;
  result?: RoundResult;
}

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD
  rounds: DailyRound[];
  roundsSettled: number;
  totalGain: number;
  totalChangePercent: number;
}

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'round_stake' | 'round_gain' | 'round_loss';
  amount: number;
  createdAt: string;
  description: string;
  status?: TransactionStatus; // deposits/withdrawals only; round entries are always final
}

export interface Bank {
  code: string;
  name: string;
}

export interface ResolvedBankAccount {
  accountNumber: string;
  bankCode: string;
  accountName: string;
}

/** The user's on-file payout account, set via the verify+OTP flow on the withdrawal page. */
export interface LinkedBankAccount {
  bankName: string;
  accountNumber: string;
  fullName: string;
}

/**
 * From G19 (Admin Contact) — the app's own "reach the developers" support
 * details. Field names are a best-effort guess matching this backend's own
 * established naming (Email/Phone elsewhere in G22/G24), since G19 has
 * never returned a populated response yet — no admin contact is configured
 * server-side. Not fully confirmed; expect to adjust once real data appears.
 */
export interface SupportContact {
  email?: string;
  phone?: string;
  whatsapp?: string;
  message?: string;
}

export interface WithdrawalHistoryEntry {
  id: string;
  dateRequested: string;
  balanceBefore: number;
  balanceAfter: number;
  status: 'open' | 'closed';
  dateCredited?: string;
}


export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  phone: string;
  // Not returned by login (G22) or profile (G24) — only known locally,
  // right after registration, from what the client itself sent to G11.
  // Persisted alongside the rest of `user` so it survives app restarts on
  // this device, but a fresh login elsewhere won't have it until the
  // backend starts echoing it back.
  email?: string;
  role: UserRole;
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
  /** From G24's SlotAmount — the fixed, non-editable stake every prediction is played with. */
  slotAmount?: number;
  /** From G22/G24's nested Profile.AmountDeposited — lifetime deposits. */
  totalDeposited?: number;
  /** From G22/G24's nested Profile.AmountWithdrawn — lifetime withdrawals. */
  totalWithdrawn?: number;
  /** From G22/G24's nested Profile.alert — a single current alert message, not a list. */
  alertMessage?: string;
  /** From G22/G24's nested Profile.news — a single current news message, not a list. */
  newsMessage?: string;
}
