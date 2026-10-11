import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinkedBankAccount, VirtualAccount, WalletPeriodTotals, WalletTransaction, WithdrawalHistoryEntry } from '../types';
import { api } from '../api';

const EMPTY_TOTALS: WalletPeriodTotals = { deposits: 0, withdrawals: 0, gains: 0, plays: 0 };

interface WalletState {
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Balance only — for screens that mirror the figure but show no history. */
  refreshBalance: () => Promise<void>;
  /** Today's exact D/W/G/P totals (G15C) — replaces the backend's dead PercentGained/PercentLoss fields per Mr Yemi's direction. */
  dailyTotals: WalletPeriodTotals;
  /** This month's exact D/W/G/P totals (G15B). */
  monthlyTotals: WalletPeriodTotals;
  totalsLoading: boolean;
  fetchTotals: () => Promise<void>;
  linkedBankAccount: LinkedBankAccount | null;
  fetchLinkedBankAccount: () => Promise<void>;
  /** Resolves the real account holder's name (AAA) from a bank + account number — replaces letting the user type their own account name. */
  verifyBankAccount: (bankCode: string, accountNumber: string) => Promise<{ accountName: string; bankName: string }>;
  /** Sets the on-file payout account (PP) — can only succeed once per account; a rejected second call surfaces the server's own error message. */
  setPayoutBankDetails: (bankName: string, bankCode: string, accountNumber: string, accountName: string) => Promise<void>;
  /** Sends the OTP consumed by resetPayoutBankDetails and requestWithdrawal below (via G20 — see the httpApi.ts comment on the assumption this rests on). */
  sendWalletSecurityOtp: () => Promise<void>;
  /** Changes an already-set payout account (RBP) — requires the OTP just sent plus the user's real login password, both verified server-side. */
  resetPayoutBankDetails: (
    otp: string,
    pinCode: string,
    bankName: string,
    bankCode: string,
    accountNumber: string,
    accountName: string
  ) => Promise<void>;
  virtualAccount: VirtualAccount | null;
  virtualAccountLoading: boolean;
  /** Deprecated by the Flutterwave PAY flow — kept for reference, no longer called by DepositModal.
   * Reads the deposit virtual account (BB); generates one (VV) if the user doesn't have one yet. */
  fetchVirtualAccount: () => Promise<void>;
  /** Step 1 of a Flutterwave deposit: initialize a payment and hand back the hosted checkout URL. */
  createDeposit: (amount: number, name?: string, email?: string) => Promise<{ redirectUrl: string; reference: string }>;
  /** Step 2 of a deposit: verify the payment by tx_ref via UPS. Returns true when Flutterwave confirms the transaction settled. */
  verifyDeposit: (reference: string) => Promise<{ verified: boolean; message: string }>;
  withdrawalHistory: WithdrawalHistoryEntry[];
  fetchWithdrawalHistory: () => Promise<void>;
  /** Triggers an actual payout (IP) — requires the OTP just sent plus the user's real login password, same as resetPayoutBankDetails. */
  requestWithdrawal: (amount: number, otp: string, pinCode: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      transactions: [],
      isLoading: false,
      linkedBankAccount: null,
      virtualAccount: null,
      virtualAccountLoading: false,
      withdrawalHistory: [],
      dailyTotals: EMPTY_TOTALS,
      monthlyTotals: EMPTY_TOTALS,
      totalsLoading: false,

      fetchTotals: async () => {
        set({ totalsLoading: true });
        try {
          const [dailyTotals, monthlyTotals] = await Promise.all([api.wallet.getDailyTotals(), api.wallet.getMonthlyTotals()]);
          set({ dailyTotals, monthlyTotals, totalsLoading: false });
        } catch (e) {
          set({ totalsLoading: false });
          throw e;
        }
      },

      refresh: async () => {
        set({ isLoading: true });
        try {
          // The history is SECONDARY. It costs four G15 calls (each needing its
          // own token) and getTransactions() calls requireSession() outside its
          // per-call catch — so it could reject outright and take the balance
          // down with it. Promise.all meant one failure left the user staring at
          // a stale or zero balance even though G25 had answered correctly.
          const [info, transactions] = await Promise.all([
            api.wallet.getBalance(),
            api.wallet.getTransactions().catch(() => null),
          ]);
          set({
            balance: info.balance,
            totalProfit: info.totalProfit,
            totalProfitPercent: info.totalProfitPercent,
            // Keep whatever list we already have if the history call failed.
            ...(transactions ? { transactions } : {}),
            isLoading: false,
          });
        } catch (e) {
          // Keep the last known balance/transactions on a failed refresh rather
          // than wiping them to zero — a transient failure here used to look
          // like "your balance disappeared" until you logged out and back in.
          set({ isLoading: false });
          throw e;
        }
      },

      /**
       * Just the balance (G25). A full refresh() also pulls the transaction history,
       * which costs FOUR separate G15 calls — none of which any card screen shows.
       */
      refreshBalance: async () => {
        const { balance } = await api.wallet.getBalance();
        set({ balance });
      },

      fetchLinkedBankAccount: async () => {
        const { payout } = await api.wallet.getBankProfile();
        set({ linkedBankAccount: payout });
      },

      verifyBankAccount: async (bankCode, accountNumber) => {
        return api.wallet.verifyBankAccount(bankCode, accountNumber);
      },

      setPayoutBankDetails: async (bankName, bankCode, accountNumber, accountName) => {
        const linkedBankAccount = await api.wallet.setPayoutBankDetails(bankName, bankCode, accountNumber, accountName);
        set({ linkedBankAccount });
      },

      sendWalletSecurityOtp: async () => {
        await api.wallet.sendWalletSecurityOtp();
      },

      resetPayoutBankDetails: async (otp, pinCode, bankName, bankCode, accountNumber, accountName) => {
        const linkedBankAccount = await api.wallet.resetPayoutBankDetails(otp, pinCode, bankName, bankCode, accountNumber, accountName);
        set({ linkedBankAccount });
      },

      fetchVirtualAccount: async () => {
        set({ virtualAccountLoading: true });
        try {
          const { deposit } = await api.wallet.getBankProfile();
          const virtualAccount = deposit ?? (await api.wallet.generateVirtualAccount());
          set({ virtualAccount, virtualAccountLoading: false });
        } catch (e) {
          set({ virtualAccountLoading: false });
          throw e;
        }
      },

      createDeposit: async (amount, name, email) => {
        return api.wallet.createDepositReference(amount, { name, email });
      },

      verifyDeposit: async (reference) => {
        return api.wallet.verifyDeposit(reference);
      },

      fetchWithdrawalHistory: async () => {
        const withdrawalHistory = await api.wallet.getWithdrawalHistory();
        set({ withdrawalHistory });
      },

      requestWithdrawal: async (amount, otp, pinCode) => {
        await api.wallet.requestWithdrawal(amount, otp, pinCode);
        await get().refresh();
        await get().fetchWithdrawalHistory();
      },
    }),
    {
      name: 'crowdstock-wallet',
      storage: createJSONStorage(() => AsyncStorage),
      // Paint the last-known figures on launch so the balance isn't ₦0 while
      // G25 is in flight. Everything here is replaced by a real fetch moments
      // later — this is a cache, never a source of truth. Loading flags are
      // deliberately excluded so a killed app can't restore a stuck spinner.
      partialize: (s) => ({
        balance: s.balance,
        totalProfit: s.totalProfit,
        totalProfitPercent: s.totalProfitPercent,
        transactions: s.transactions,
        dailyTotals: s.dailyTotals,
        monthlyTotals: s.monthlyTotals,
      }),
    }
  )
);
