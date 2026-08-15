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
  stockValue: number; // 1-5, rounded average
  averageRaw: number;
  totalParticipants: number;
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
  type: 'deposit' | 'withdrawal' | 'round_gain' | 'round_loss';
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

export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
}
