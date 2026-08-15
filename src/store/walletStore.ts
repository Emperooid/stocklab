import { create } from 'zustand';
import { Bank, ResolvedBankAccount, WalletTransaction } from '../types';
import { api } from '../api';

interface WalletState {
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
  transactions: WalletTransaction[];
  banks: Bank[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createDepositReference: (amount: number) => Promise<{ reference: string; email: string }>;
  verifyDeposit: (reference: string) => Promise<void>;
  cancelDeposit: (reference: string) => Promise<void>;
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

  refresh: async () => {
    set({ isLoading: true });
    const [{ balance, totalProfit, totalProfitPercent }, transactions] = await Promise.all([
      api.wallet.getBalance(),
      api.wallet.getTransactions(),
    ]);
    set({ balance, totalProfit, totalProfitPercent, transactions, isLoading: false });
  },

  createDepositReference: async (amount) => {
    return api.wallet.createDepositReference(amount);
  },

  verifyDeposit: async (reference) => {
    await api.wallet.verifyDeposit(reference);
    await get().refresh();
  },

  cancelDeposit: async (reference) => {
    await api.wallet.cancelDeposit(reference);
    await get().refresh();
  },

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
