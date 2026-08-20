export type RoundStatus = 'upcoming' | 'open' | 'awaiting_result' | 'settled';

export interface RoundSlot {
  id: string;
  index: number; // 1-5
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
  stockValue: number; // 1-5, the value set by the operator for this round
  userPrediction?: number;
  distance?: number;
  points?: number;
  changePercent?: number;
  valueGained?: number;
  balanceAfter?: number;
}

export interface DailyRound {
  slot: RoundSlot;
  status: RoundStatus;
  prediction?: UserPrediction;
  /** The operator-set Stock Value for this round, editable until it settles. */
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
  email: string;
  role: UserRole;
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
}
