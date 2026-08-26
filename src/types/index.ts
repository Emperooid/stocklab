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
  stockValue: number; // 1-5, drawn automatically server-side, revealed at settlement
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
  /** The automatically-drawn Stock Value for this round, only revealed at settlement. */
  stockValue?: number;
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
}
