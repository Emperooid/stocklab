import { create } from 'zustand';
import { Bank, ResolvedBankAccount, WalletTransaction } from '../types';
import { api } from '../api';
import { useAuthStore } from './authStore';

interface PendingDeposit {
  amount: number;
  balanceBefore: number;
  startedAt: number;
}

interface WalletState {
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
  transactions: WalletTransaction[];
  banks: Bank[];
  isLoading: boolean;
  // Deposits are credited by a server-side webhook with no client-side
  // confirm/verify call available (see createDepositReference) — this is
  // purely a UI cue so "why hasn't my balance changed yet" doesn't look like
  // the app silently ate the deposit while the webhook is still catching up.
  pendingDeposit: PendingDeposit | null;
  refresh: () => Promise<void>;
  createDepositReference: (amount: number) => Promise<{ redirectUrl: string; reference: string }>;
  startPendingDeposit: (amount: number) => void;
  dismissPendingDeposit: () => void;
  fetchBanks: () => Promise<void>;
  resolveBankAccount: (accountNumber: string, bankCode: string) => Promise<ResolvedBankAccount>;
  requestWithdrawal: (amount: number, bank: Bank, account: ResolvedBankAccount) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  totalProfit: 0,
  totalProfitPercent: 0,
  transactions: [],
  banks: [],
  isLoading: false,
  pendingDeposit: null,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [{ balance, totalProfit, totalProfitPercent }, transactions] = await Promise.all([
        api.wallet.getBalance(),
        api.wallet.getTransactions(),
      ]);
      const pending = get().pendingDeposit;
      // The webhook credit is the only signal we have that a pending deposit
      // resolved — once the balance actually moves off what it was when the
      // deposit started, treat it as settled and drop the banner.
      const stillPending = pending && balance === pending.balanceBefore ? pending : null;
      set({ balance, totalProfit, totalProfitPercent, transactions, isLoading: false, pendingDeposit: stillPending });
    } catch (e) {
      // Keep the last known balance/transactions on a failed refresh rather
      // than wiping them to zero — a transient failure here used to look
      // like "your balance disappeared" until you logged out and back in.
      set({ isLoading: false });
      throw e;
    }
  },

  createDepositReference: async (amount) => {
    return api.wallet.createDepositReference(amount, useAuthStore.getState().user?.email);
  },

  startPendingDeposit: (amount) => {
    set({ pendingDeposit: { amount, balanceBefore: get().balance, startedAt: Date.now() } });
  },

  dismissPendingDeposit: () => set({ pendingDeposit: null }),

  fetchBanks: async () => {
    if (get().banks.length > 0) return;
    const banks = await api.wallet.getBanks();
    set({ banks });
  },

  resolveBankAccount: async (accountNumber, bankCode) => {
    return api.wallet.resolveBankAccount(accountNumber, bankCode);
  },

  requestWithdrawal: async (amount, bank, account) => {
    await api.wallet.requestWithdrawal(amount, bank, account);
    await get().refresh();
  },
}));
